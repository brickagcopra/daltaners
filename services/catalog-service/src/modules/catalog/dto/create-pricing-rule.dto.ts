import {
  IsString,
  IsNotEmpty,
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

export class PricingScheduleDto {
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  days_of_week?: number[];

  @IsOptional()
  @IsString()
  start_time?: string;

  @IsOptional()
  @IsString()
  end_time?: string;
}

export class PricingConditionsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  min_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  max_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_value?: number;
}

export class CreatePricingRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PricingRuleType)
  rule_type: PricingRuleType;

  @IsEnum(PricingDiscountType)
  discount_type: PricingDiscountType;

  @IsNumber()
  @Min(0)
  discount_value: number;

  @IsEnum(PricingAppliesTo)
  applies_to: PricingAppliesTo;

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

  @IsDateString()
  start_date: string;

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
