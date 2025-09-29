export interface BtsAssignment {
    id: number;
    uuid: string;
    ip: string;
    connected: boolean;
    createdAt: number;
    lastSeen?: number;
}

export class BtsManager {
    static readonly MAX_BTS = 65536; // 0..65535

    private nextSeqId = 0;
    private freeIds = new Set<number>(); // freed ids for reuse
    private idToAssignment = new Map<number, BtsAssignment>();
    private uuidToId = new Map<string, number>();

    // Allocate a BTS for a user (create next sequential id or reuse a freed one)
    allocate(uuid: string, ip: string): BtsAssignment {
        if (!uuid) throw new Error('uuid required');
        const existingId = this.uuidToId.get(uuid);
        if (existingId !== undefined) {
            const rec = this.idToAssignment.get(existingId)!;
            // update ip/connected/lastSeen
            rec.ip = ip;
            rec.connected = true;
            rec.lastSeen = Date.now();
            return rec;
        }

        let idToAssign: number | null = null;
        if (this.freeIds.size > 0) {
            // pick smallest free id (strategy can be changed)
            idToAssign = Math.min(...Array.from(this.freeIds));
            this.freeIds.delete(idToAssign);
        } else {
            if (this.nextSeqId >= BtsManager.MAX_BTS) {
                throw new Error('No available BTS ids');
            }
            idToAssign = this.nextSeqId++;
        }

        const assignment: BtsAssignment = {
            id: idToAssign,
            uuid,
            ip,
            connected: true,
            createdAt: Date.now(),
            lastSeen: Date.now(),
        };

        this.idToAssignment.set(idToAssign, assignment);
        this.uuidToId.set(uuid, idToAssign);
        return assignment;
    }

    // Release BTS by UUID (e.g. when user disconnects)
    releaseByUuid(uuid: string): boolean {
        const id = this.uuidToId.get(uuid);
        if (id === undefined) return false;
        return this.releaseById(id);
    }

    // Release BTS by id
    releaseById(id: number): boolean {
        const rec = this.idToAssignment.get(id);
        if (!rec) return false;
        // remove uuid mapping and mark id as free
        this.uuidToId.delete(rec.uuid);
        this.idToAssignment.delete(id);
        // add to free set for reuse
        this.freeIds.add(id);
        return true;
    }

    // Get assignment by UUID
    getByUuid(uuid: string): BtsAssignment | null {
        const id = this.uuidToId.get(uuid);
        if (id === undefined) return null;
        return this.idToAssignment.get(id) || null;
    }

    // Get assignment by id
    getById(id: number): BtsAssignment | null {
        return this.idToAssignment.get(id) || null;
    }

    // Mark user as disconnected but keep the assignment (connected = false) — BTS becomes available for reuse only after explicit release
    markDisconnected(uuid: string): boolean {
        const id = this.uuidToId.get(uuid);
        if (id === undefined) return false;
        const rec = this.idToAssignment.get(id);
        if (!rec) return false;
        rec.connected = false;
        rec.lastSeen = Date.now();
        // if automatic release on disconnect is desired, call releaseByUuid instead
        return true;
    }

    // Utility methods
    isAssigned(id: number): boolean { return this.idToAssignment.has(id); }
    countAssigned(): number { return this.idToAssignment.size; }
    countFree(): number { return BtsManager.MAX_BTS - this.nextSeqId + this.freeIds.size; }
    dumpState() {
        return {
            nextSeqId: this.nextSeqId,
            assignedCount: this.idToAssignment.size,
            freeIds: Array.from(this.freeIds).sort((a, b) => a - b),
        };
    }
}