import {
    Controller, Get, Put, Body, Inject, HttpException, HttpStatus,
    UseGuards, Req, Logger
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { OsmoParams } from '@osmoweb/backend-core';
import { BscController, OsmoServices, osmoDefaultParams } from '@osmoweb/backend-core';
import type { BscBtsConfig } from '@osmoweb/backend-core';
import type { AuthRequest } from '@/auth/interfaces/auth-request.interface';
import { UpdateBtsDto } from '@/osmo/dto/update-bts.dto';
import { BtsManager } from '@osmoweb/backend-core';
import { OSMO_PARAMS } from '@/osmo/tokens';

const btsManager = new BtsManager();

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/osmo/bts')
export class BtsController {
    protected readonly logger = new Logger(BtsController.name);
    protected readonly bsc: BscController;

    constructor(
        @Inject(OSMO_PARAMS) private readonly params: OsmoParams,
    ) {
        const serviceParams = params?.services?.[OsmoServices.OSMO_TCP_BSC] ?? osmoDefaultParams.services[OsmoServices.OSMO_TCP_BSC];
        this.bsc = new BscController(serviceParams?.serviceUri, serviceParams?.servicePort, false);
    }

    @Get()
    async getBts(@Req() req: AuthRequest) {
        this.logger?.debug('Get BTS request received', req.user);
        const uid = req.user?.sub;
        if (!uid) throw new HttpException('No user id in token', HttpStatus.BAD_REQUEST);
        const bts = btsManager.getByUuid(uid);
        if (!bts) throw new HttpException('No BTS assigned to user', HttpStatus.NOT_FOUND);
        try {
            return await this.bsc.getBts(bts?.id);
        } catch (e: any) {
            if (e && /BTS not found/i.test(String(e.message || e))) {
                throw new HttpException('BTS not found', HttpStatus.NOT_FOUND);
            }
            throw new HttpException(String(e?.message || e), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put()
    async updateBts(@Req() req: AuthRequest, @Body() cfg: UpdateBtsDto) {
        this.logger?.debug('Update BTS request received', req.user, cfg);
        const uid = req.user?.sub;
        if (!uid) throw new HttpException('No user id in token', HttpStatus.BAD_REQUEST);
        try {
            const ip = (req.ip || (req.headers && (req.headers['x-forwarded-for'] as string)) || '') as string;
            const bts = btsManager.allocate(uid, ip); // allocate or get existing bts
            if (!bts) throw new HttpException('No BTS assigned to user', HttpStatus.NOT_FOUND);
            await this.bsc.updateBts(bts.id, (cfg as BscBtsConfig) || {}, false /* persistFlag */);
            return this.getBts(req);
        } catch (e: any) {
            throw new HttpException(String(e?.message || e), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
