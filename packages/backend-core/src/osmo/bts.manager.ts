import type { BscBtsInfo } from '@/osmoctrl/controllers/bsc.controller';
import type { BtsConfig } from '@/osmorouter/protocol/protocol.types';
import { GSMBand } from '@osmoweb/core';

export interface BtsManagerOptions {
    osmuxPortStart?: number;
    osmuxPortCount?: number;
    assignmentTtlMs?: number;
    defaultBand?: GSMBand;
    defaultArfcn?: number;
}

export interface IpaUnitId {
    site: number;
    bts: number;
    trx: number;
    ipa: string;
}

export interface BtsAssignment {
    id: number;
    uuid: string;
    instanceId?: string;
    ip: string;
    btsCfg: BtsConfig;
    connected: boolean;
    createdAt: number;
    lastSeen?: number;
}

export interface BtsAllocateParams {
    instanceId?: string;
    band?: GSMBand;
    arfcn?: number;
    now?: number;
}

export interface BtsUpdateParams {
    instanceId?: string;
    band: GSMBand;
    arfcn: number;
    now?: number;
}

const DEFAULT_OPTIONS: Required<BtsManagerOptions> = {
    osmuxPortStart: 6001,
    osmuxPortCount: 1024,
    assignmentTtlMs: 5 * 60 * 1000,
    defaultBand: GSMBand.GSM_900,
    defaultArfcn: 0,
};

function stableHash(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function createIpaFromUuid(uuid: string, btsId: number): IpaUnitId {
    const site = (stableHash(uuid) % 65535) + 1;
    const trx = 0;
    return {
        site,
        bts: btsId,
        trx,
        ipa: `${site}/${btsId}/${trx}`,
    };
}

export function createCellIdentityFromUuid(uuid: string, btsId: number): number {
    return ((stableHash(`${uuid}:${btsId}`) % 65535) + 1);
}

export function assignmentToBtsConfig(assignment: BtsAssignment): BtsConfig {
    return { ...assignment.btsCfg };
}

function isReusableBscBts(bts: BscBtsInfo): boolean {
    return bts.connected === false;
}

function normalizeInstanceId(instanceId?: string): string {
    return instanceId?.trim() || '';
}

function assignmentKey(uuid: string, instanceId?: string): string {
    return JSON.stringify([uuid, normalizeInstanceId(instanceId)]);
}

export class BtsManager {
    static readonly MAX_BTS = 65536; // 0..65535

    private readonly options: Required<BtsManagerOptions>;
    private highestKnownBtsId = -1;
    private knownBtsIds = new Set<number>();
    private freeIds = new Set<number>();
    private usedOsmuxPorts = new Set<number>();
    private idToAssignment = new Map<number, BtsAssignment>();
    private assignmentKeyToId = new Map<string, number>();

    constructor(options: BtsManagerOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    syncFromBsc(btsList: BscBtsInfo[]): void {
        for (const bts of btsList) {
            if (!Number.isInteger(bts.id) || bts.id < 0 || bts.id >= BtsManager.MAX_BTS) continue;
            this.knownBtsIds.add(bts.id);
            if (!this.idToAssignment.has(bts.id) && isReusableBscBts(bts)) {
                this.freeIds.add(bts.id);
            } else {
                this.freeIds.delete(bts.id);
            }
            if (bts.id > this.highestKnownBtsId) this.highestKnownBtsId = bts.id;
        }
    }

    allocate(uuid: string, ip: string, params: BtsAllocateParams = {}): BtsAssignment {
        if (!uuid) throw new Error('uuid required');
        const now = params.now ?? Date.now();
        const key = assignmentKey(uuid, params.instanceId);
        const existingId = this.assignmentKeyToId.get(key);
        if (existingId !== undefined) {
            const rec = this.idToAssignment.get(existingId)!;
            rec.ip = ip;
            rec.connected = true;
            rec.lastSeen = now;
            this.applyConfigParams(rec, params);
            return rec;
        }

        const id = this.nextBtsId();
        const osmuxPort = this.allocateOsmuxPort();
        const ipa = createIpaFromUuid(key, id);
        const btsCfg: BtsConfig = {
            id,
            band: params.band ?? this.options.defaultBand,
            arfcn: params.arfcn ?? this.options.defaultArfcn,
            ipa: ipa.ipa,
            cell_identity: createCellIdentityFromUuid(key, id),
            osmux_port: osmuxPort,
        };
        const assignment: BtsAssignment = {
            id,
            uuid,
            instanceId: normalizeInstanceId(params.instanceId) || undefined,
            ip,
            btsCfg,
            connected: true,
            createdAt: now,
            lastSeen: now,
        };

        this.knownBtsIds.add(id);
        this.freeIds.delete(id);
        this.highestKnownBtsId = Math.max(this.highestKnownBtsId, id);
        this.idToAssignment.set(id, assignment);
        this.assignmentKeyToId.set(key, id);
        return assignment;
    }

    updateForUuid(uuid: string, ip: string, params: BtsUpdateParams): BtsAssignment {
        if (!params.band) throw new Error('band required');
        if (typeof params.arfcn !== 'number') throw new Error('arfcn required');
        return this.allocate(uuid, ip, params);
    }

    getByUuid(uuid: string, instanceId?: string): BtsAssignment | null {
        const id = this.assignmentKeyToId.get(assignmentKey(uuid, instanceId));
        if (id === undefined) return null;
        return this.idToAssignment.get(id) || null;
    }

    getById(id: number): BtsAssignment | null {
        return this.idToAssignment.get(id) || null;
    }

    releaseByUuid(uuid: string, instanceId?: string): boolean {
        const id = this.assignmentKeyToId.get(assignmentKey(uuid, instanceId));
        if (id === undefined) return false;
        return this.releaseById(id);
    }

    releaseById(id: number): boolean {
        const rec = this.idToAssignment.get(id);
        if (!rec) return false;
        this.assignmentKeyToId.delete(assignmentKey(rec.uuid, rec.instanceId));
        this.idToAssignment.delete(id);
        this.usedOsmuxPorts.delete(rec.btsCfg.osmux_port);
        this.knownBtsIds.add(id);
        this.freeIds.add(id);
        this.highestKnownBtsId = Math.max(this.highestKnownBtsId, id);
        return true;
    }

    markDisconnected(uuid: string, now: number = Date.now(), instanceId?: string): boolean {
        const rec = this.getByUuid(uuid, instanceId);
        if (!rec) return false;
        rec.connected = false;
        rec.lastSeen = now;
        return true;
    }

    markSeen(uuid: string, now: number = Date.now(), instanceId?: string): boolean {
        const rec = this.getByUuid(uuid, instanceId);
        if (!rec) return false;
        rec.lastSeen = now;
        return true;
    }

    markSeenById(id: number, now: number = Date.now()): boolean {
        const rec = this.getById(id);
        if (!rec) return false;
        rec.connected = true;
        rec.lastSeen = now;
        return true;
    }

    markDisconnectedById(id: number, now: number = Date.now()): boolean {
        const rec = this.getById(id);
        if (!rec) return false;
        rec.connected = false;
        rec.lastSeen = now;
        return true;
    }

    cleanupExpiredAssignments(now: number = Date.now()): number {
        let cleaned = 0;
        for (const assignment of Array.from(this.idToAssignment.values())) {
            const lastSeen = assignment.lastSeen ?? assignment.createdAt;
            if (now - lastSeen > this.options.assignmentTtlMs) {
                if (this.releaseById(assignment.id)) cleaned++;
            }
        }
        return cleaned;
    }

    cleanupDisconnectedBscAssignments(btsList: BscBtsInfo[]): number {
        const bscById = new Map<number, BscBtsInfo>();
        for (const bts of btsList) bscById.set(bts.id, bts);

        let cleaned = 0;
        for (const assignment of Array.from(this.idToAssignment.values())) {
            const bsc = bscById.get(assignment.id);
            if (!bsc) continue;
            if (!assignment.connected && isReusableBscBts(bsc) && this.releaseById(assignment.id)) cleaned++;
        }
        return cleaned;
    }

    toBtsConfig(assignment: BtsAssignment): BtsConfig {
        return assignmentToBtsConfig(assignment);
    }

    isAssigned(id: number): boolean { return this.idToAssignment.has(id); }
    countAssigned(): number { return this.idToAssignment.size; }
    countFree(): number { return BtsManager.MAX_BTS - this.highestKnownBtsId - 1; }
    dumpState() {
        return {
            highestKnownBtsId: this.highestKnownBtsId,
            assignedCount: this.idToAssignment.size,
            assignmentKeys: Array.from(this.assignmentKeyToId.keys()).sort(),
            knownBtsIds: Array.from(this.knownBtsIds).sort((a, b) => a - b),
            freeIds: Array.from(this.freeIds).sort((a, b) => a - b),
            usedOsmuxPorts: Array.from(this.usedOsmuxPorts).sort((a, b) => a - b),
        };
    }

    private applyConfigParams(assignment: BtsAssignment, params: BtsAllocateParams): void {
        if (params.band !== undefined) assignment.btsCfg.band = params.band;
        if (params.arfcn !== undefined) assignment.btsCfg.arfcn = params.arfcn;
    }

    private nextBtsId(): number {
        if (this.freeIds.size > 0) {
            const id = Math.min(...this.freeIds);
            this.freeIds.delete(id);
            return id;
        }

        let highestAssignmentId = -1;
        for (const id of this.idToAssignment.keys()) {
            if (id > highestAssignmentId) highestAssignmentId = id;
        }
        const id = Math.max(this.highestKnownBtsId, highestAssignmentId) + 1;
        if (id >= BtsManager.MAX_BTS) throw new Error('No available BTS ids in range 0..65535');
        return id;
    }

    private allocateOsmuxPort(): number {
        const end = this.options.osmuxPortStart + this.options.osmuxPortCount;
        for (let port = this.options.osmuxPortStart; port < end; port++) {
            if (!this.usedOsmuxPorts.has(port)) {
                this.usedOsmuxPorts.add(port);
                return port;
            }
        }
        throw new Error('No available osmux_port');
    }
}

let btsManager: BtsManager | undefined;

export function getBtsManagerInstance(options?: BtsManagerOptions): BtsManager {
    if (btsManager === undefined) {
        btsManager = new BtsManager(options);
    }
    return btsManager;
}
