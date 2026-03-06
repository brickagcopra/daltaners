import {
  IsUUID,
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  ArrayMinSize,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReturnItemDto {
  @ApiProperty({ description: 'Order item UUID' })
  @IsUUID()
  order_item_id: string;

  @ApiProperty({ description: 'Quantity to return', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Item condition', enum: ['unopened', 'opened', 'damaged', 'defective', 'unknown'] })
  @IsOptional()
  @IsEnum(['unopened', 'opened', 'damaged', 'defective', 'unknown'])
  condition?: string;
}

export class CreateReturnRequestDto {
  @ApiProperty({ description: 'Order UUID to return' })
  @IsUUID()
  order_id: string;

  @ApiProperty({
    description: 'Reason category',
    enum: ['defective', 'wrong_item', 'damaged', 'not_as_described', 'missing_item', 'expired', 'change_of_mind', 'other'],
  })
  @IsEnum(['defective', 'wrong_item', 'damaged', 'not_as_described', 'missing_item', 'expired', 'change_of_mind', 'other'])
  reason_category: string;

  @ApiPropertyOptional({ description: 'Detailed reason for return' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason_details?: string;

  @ApiPropertyOptional({ description: 'Evidence image URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence_urls?: string[];

  @ApiPropertyOptional({
    description: 'Requested resolution',
    enum: ['refund', 'replacement', 'store_credit'],
    default: 'refund',
  })
  @IsOptional()
  @IsEnum(['refund', 'replacement', 'store_credit'])
  requested_resolution?: string;

  @ApiProperty({ description: 'Items to return', type: [CreateReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReturnItemDto)
  items: CreateReturnItemDto[];
}
