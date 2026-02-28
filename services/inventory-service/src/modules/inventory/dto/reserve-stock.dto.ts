import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReserveStockItemDto {
  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  product_id: string;

  @ApiPropertyOptional({ description: 'Product variant UUID' })
  @IsOptional()
  @IsUUID()
  variant_id?: string;

  @ApiProperty({ description: 'Store location UUID' })
  @IsUUID()
  store_location_id: string;

  @ApiProperty({ description: 'Quantity to reserve', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class ReserveStockDto {
  @ApiProperty({ description: 'List of stock items to reserve', type: [ReserveStockItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReserveStockItemDto)
  items: ReserveStockItemDto[];

  @ApiPropertyOptional({ description: 'Reference ID for the reservation (e.g., order_id)' })
  @IsOptional()
  @IsUUID()
  reference_id?: string;
}
