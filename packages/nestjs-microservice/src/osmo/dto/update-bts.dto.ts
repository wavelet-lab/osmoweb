import {
    IsArray, IsInt, IsOptional, IsString, ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import type { GSMBand } from '@osmoweb/core';

export class TrxDto {
    @IsInt()
    id!: number;

    @IsOptional()
    @IsInt()
    arfcn?: number;
}

export class ReleaseBtsDto {
    @IsOptional()
    @IsString()
    instanceId?: string;
}

export class UpdateBtsDto {
    @IsOptional()
    @IsString()
    instanceId?: string;

    @IsOptional()
    @IsString()
    band?: GSMBand;

    @IsOptional()
    @IsInt()
    arfcn?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TrxDto)
    trx?: TrxDto[];
}
