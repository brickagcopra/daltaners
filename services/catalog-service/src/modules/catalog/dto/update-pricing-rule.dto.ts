import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsUUID,
  IsDateString,
  IsObject,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PricingRuleType,
  PricingDiscountType,
  PricingAppliesTo,
} from '../entities/pricing-rule.entity';
import { PricingScheduleDto, PricingConditionsDto } from './create-pricing-rule.dto';

export class UpdatePricingRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PricingRuleType)
  rule_type?: PricingRuleType;

  @IsOptional()
  @IsEnum(PricingDiscountType)
  discount_type?: PricingDiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_value?: number;

  @IsOptional()
  @IsEnum(PricingAppliesTo)
  applies_to?: PricingAppliesTo;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  applies_to_ids?: string[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PricingScheduleDto)
  schedule?: PricingScheduleDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PricingConditionsDto)
  conditions?: PricingConditionsDto;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  max_uses?: number;
}
