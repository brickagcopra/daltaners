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

export class ReleaseStockItemDto {
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

  @ApiProperty({ description: 'Quantity to release', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class ReleaseStockDto {
  @ApiProperty({ description: 'List of stock items to release', type: [ReleaseStockItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReleaseStockItemDto)
  items: ReleaseStockItemDto[];

  @ApiProperty({ description: 'Reference ID for the release (e.g., order_id)' })
  @IsUUID()
  reference_id: string;
}
