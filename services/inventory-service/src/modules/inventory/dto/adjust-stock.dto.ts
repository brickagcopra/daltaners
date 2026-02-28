import {
  IsUUID,
  IsOptional,
  IsInt,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
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

  @ApiProperty({ description: 'Quantity to adjust (positive to add, negative to remove)' })
  @IsInt()
  quantity: number;

  @ApiPropertyOptional({ description: 'Notes about the adjustment' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Reference type (e.g., order, return, manual)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reference_type?: string;

  @ApiPropertyOptional({ description: 'Reference UUID (e.g., order_id)' })
  @IsOptional()
  @IsUUID()
  reference_id?: string;
}
