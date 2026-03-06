import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PricingRuleType, PricingRuleStatus } from '../entities/pricing-rule.entity';

export class PricingRuleQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(PricingRuleType)
  rule_type?: PricingRuleType;

  @IsOptional()
  @IsEnum(PricingRuleStatus)
  status?: PricingRuleStatus;

  @IsOptional()
  @IsString()
  sort_by?: string;

  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC';

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

export class AdminPricingRuleQueryDto extends PricingRuleQueryDto {
  @IsOptional()
  @IsString()
  store_id?: string;
}
