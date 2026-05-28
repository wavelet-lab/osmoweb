import {
    Controller, Get, Put, Delete, Body, Inject, HttpException, HttpStatus,
    UseGuards, Req
} from '@nestjs/common';
import { JwtAuthGuard } from '@websdr/nestjs-microservice/auth';
import type { OsmoParams } from '@osmoweb/backend-core';
import {
    BscController, OsmoServices, osmoDefaultParams, getBtsManagerInstance,
    BtsManager,
} from '@osmoweb/backend-core';
import type { BscBtsConfig } from '@osmoweb/backend-core';
import type { AuthRequest } from '@websdr/nestjs-microservice/auth';
import { UpdateBtsDto } from '@/osmo/dto/update-bts.dto';
import { OSMO_PARAMS } from '@/osmo/tokens';
import { GSMBand, gsmArfcnToFrequency } from '@osmoweb/core';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/osmo/bts')
export class BtsController {
    protected readonly bsc: BscController;
    protected readonly btsManager: BtsManager = getBtsManagerInstance();

    constructor(
        @Inject(OSMO_PARAMS) private readonly params: OsmoParams,
    ) {
        const serviceParams = params?.services?.[OsmoServices.OSMO_TCP_BSC] ?? osmoDefaultParams.services[OsmoServices.OSMO_TCP_BSC];
        this.bsc = new BscController(serviceParams?.serviceUri, serviceParams?.servicePort, false);
    }

    @Get()
    async getBts(@Req() req: AuthRequest) {
        const uid = this.getUserUuid(req);
        this.btsManager.cleanupExpiredAssignments();
        this.btsManager.markSeen(uid);
        const bts = this.btsManager.getByUuid(uid);
        if (!bts) throw new HttpException('No BTS assigned to user', HttpStatus.NOT_FOUND);
        return this.btsManager.toBtsConfig(bts);
    }

    @Delete()
    async releaseBts(@Req() req: AuthRequest, @Body() body?: Pick<UpdateBtsDto, 'instanceId'>) {
        const uid = this.getUserUuid(req);
        const released = this.btsManager.releaseByUuid(uid, body?.instanceId);
        if (!released) throw new HttpException('No BTS assigned to user', HttpStatus.NOT_FOUND);
        return { released: true };
    }

    @Put()
    async updateBts(@Req() req: AuthRequest, @Body() cfg: UpdateBtsDto) {
        const ownerUuid = this.getUserUuid(req);
        const band = cfg?.band;
        const arfcn = this.getArfcn(cfg);
        if (!band) throw new HttpException('band is required', HttpStatus.BAD_REQUEST);
        if (typeof arfcn !== 'number') throw new HttpException('arfcn is required', HttpStatus.BAD_REQUEST);
        const gsmBand = this.validateBandArfcn(band, arfcn);

        this.btsManager.cleanupExpiredAssignments();
        const existingAssignment = this.btsManager.getByUuid(ownerUuid, cfg?.instanceId);
        try {
            const ip = (req.ip || (req.headers && (req.headers['x-forwarded-for'] as string)) || '') as string;
            if (!existingAssignment) {
                try {
                    const btsList = await this.bsc.getAllBts();
                    this.btsManager.syncFromBsc(btsList);
                    this.btsManager.cleanupDisconnectedBscAssignments(btsList);
                } catch (e: any) {
                    throw new HttpException(`Failed to sync BTS list from BSC: ${String(e?.message || e)}`, HttpStatus.SERVICE_UNAVAILABLE);
                }
            }

            const previousConfig = existingAssignment ? { ...existingAssignment.btsCfg } : undefined;
            const assignment = this.btsManager.updateForUuid(ownerUuid, ip, { instanceId: cfg?.instanceId, band: gsmBand, arfcn });
            const ipa = this.getIpaUnitId(assignment.btsCfg.ipa, assignment.id);
            const bscCfg: BscBtsConfig = {
                type: 'osmo-bts',
                band: gsmBand,
                description: this.getBtsDescription(ownerUuid, cfg?.instanceId),
                unitId: { site: ipa.site, bts: ipa.bts },
                ci: assignment.btsCfg.cell_identity,
                trx: [{ id: 0, arfcn }],
                gprs: false,
            };

            try {
                await this.bsc.updateBts(assignment.id, bscCfg, false);
            } catch (e: any) {
                if (!existingAssignment) this.btsManager.releaseByUuid(ownerUuid, cfg?.instanceId);
                else {
                    existingAssignment.btsCfg = previousConfig!;
                    this.btsManager.markDisconnected(ownerUuid, Date.now(), cfg?.instanceId);
                }
                throw new HttpException(`Failed to update BTS in BSC: ${String(e?.message || e)}`, HttpStatus.SERVICE_UNAVAILABLE);
            }

            return this.btsManager.toBtsConfig(assignment);
        } catch (e: any) {
            if (e instanceof HttpException) throw e;
            const message = String(e?.message || e);
            const status = /No available (osmux_port|BTS ids)/i.test(message)
                ? HttpStatus.SERVICE_UNAVAILABLE
                : HttpStatus.INTERNAL_SERVER_ERROR;
            throw new HttpException(message, status);
        }
    }

    private getArfcn(cfg: UpdateBtsDto): number | undefined {
        if (typeof cfg?.arfcn === 'number') return cfg.arfcn;
        return cfg?.trx?.[0]?.arfcn;
    }

    private getUserUuid(req: AuthRequest): string {
        const uid = req.user?.sub;
        if (!uid) throw new HttpException('No user id in token', HttpStatus.BAD_REQUEST);
        return uid;
    }

    private getBtsDescription(ownerUuid: string, instanceId?: string): string {
        const cleanInstanceId = instanceId?.trim();
        return cleanInstanceId ? `user ${ownerUuid} instance ${cleanInstanceId}` : `user ${ownerUuid}`;
    }

    private getIpaUnitId(ipa: string, fallbackBtsId: number): { site: number; bts: number } {
        const parts = ipa.split('/');
        const site = Number(parts[0]);
        const bts = Number(parts[1]);
        return {
            site: Number.isInteger(site) ? site : 1,
            bts: Number.isInteger(bts) ? bts : fallbackBtsId,
        };
    }

    private validateBandArfcn(band: string, arfcn: number): GSMBand {
        const gsmBand = band as GSMBand;
        if (!Object.values(GSMBand).includes(gsmBand)) {
            throw new HttpException(`Unsupported GSM band ${band}`, HttpStatus.BAD_REQUEST);
        }
        try {
            gsmArfcnToFrequency(arfcn, gsmBand);
        } catch (e: any) {
            throw new HttpException(String(e?.message || e), HttpStatus.BAD_REQUEST);
        }
        return gsmBand;
    }
}
