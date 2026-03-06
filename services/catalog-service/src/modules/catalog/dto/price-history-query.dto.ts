import { IsOptional, IsString, IsEnum, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PriceChangeType } from '../entities/price-history.entity';

export class PriceHistoryQueryDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsEnum(PriceChangeType)
  change_type?: PriceChangeType;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class AdminPriceHistoryQueryDto extends PriceHistoryQueryDto {
  @IsOptional()
  @IsString()
  store_id?: string;
}
