import { IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class StockQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by store location UUID' })
  @IsOptional()
  @IsUUID()
  store_location_id?: string;

  @ApiPropertyOptional({ description: 'Filter by product UUID' })
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @ApiPropertyOptional({ description: 'Filter to show only low-stock items', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  low_stock_only?: boolean = false;
}
