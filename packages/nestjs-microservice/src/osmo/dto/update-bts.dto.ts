import {
    IsArray, IsBoolean, IsInt, IsOptional, IsString, ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import type { BscBtsConfig } from '@osmoweb/backend-core';
import type { GSMBand } from '@osmoweb/core';

export class UnitIdDto {
    @IsInt()
    site!: number;

    @IsInt()
    bts!: number;
}

export class TrxDto {
    @IsInt()
    id!: number;

    @IsOptional()
    @IsInt()
    arfcn?: number;
}

export class UpdateBtsDto implements BscBtsConfig {
    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => UnitIdDto)
    unitId?: UnitIdDto;

    @IsOptional()
    @IsInt()
    lac?: number;

    @IsOptional()
    @IsInt()
    ci?: number;

    @IsOptional()
    @IsString()
    band?: GSMBand;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TrxDto)
    trx?: TrxDto[];

    @IsOptional()
    @IsBoolean()
    gprs?: boolean;
}