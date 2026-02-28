import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  IsString,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStockDto {
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

  @ApiProperty({ description: 'Initial stock quantity', minimum: 0 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: 'Reorder point threshold', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorder_point?: number;

  @ApiPropertyOptional({ description: 'Quantity to reorder when below reorder point', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  reorder_quantity?: number;

  @ApiPropertyOptional({ description: 'Batch number for the stock' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batch_number?: string;

  @ApiPropertyOptional({ description: 'Expiry date of the stock (ISO date format)' })
  @IsOptional()
  @IsDateString()
  expiry_date?: string;
}
