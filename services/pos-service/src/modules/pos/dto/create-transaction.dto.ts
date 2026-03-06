import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  IsArray,
  IsObject,
  ValidateNested,
  ArrayMinSize,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTransactionItemDto } from './create-transaction-item.dto';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Shift ID this transaction belongs to' })
  @IsUUID()
  shift_id: string;

  @ApiProperty({ description: 'Transaction type', enum: ['sale', 'refund', 'exchange'] })
  @IsIn(['sale', 'refund', 'exchange'])
  type: string;

  @ApiProperty({ description: 'Payment method', enum: ['cash', 'card', 'gcash', 'maya', 'wallet'] })
  @IsIn(['cash', 'card', 'gcash', 'maya', 'wallet'])
  payment_method: string;

  @ApiProperty({ description: 'Transaction items', type: [CreateTransactionItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionItemDto)
  items: CreateTransactionItemDto[];

  @ApiPropertyOptional({ description: 'Amount tendered (for cash payments)', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount_tendered?: number;

  @ApiPropertyOptional({ description: 'Customer ID if known' })
  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @ApiPropertyOptional({ description: 'Discount amount on entire transaction', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount_amount?: number;

  @ApiPropertyOptional({ description: 'Payment details (gateway response, card info, etc.)' })
  @IsOptional()
  @IsObject()
  payment_details?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Original transaction ID for refunds/exchanges' })
  @IsOptional()
  @IsUUID()
  original_transaction_id?: string;

  @ApiPropertyOptional({ description: 'Refund reason (required for refund type)', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  refund_reason?: string;

  @ApiPropertyOptional({ description: 'Idempotency key for deduplication', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotency_key?: string;

  @ApiPropertyOptional({ description: 'Loyalty points to redeem', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  loyalty_points_redeemed?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
