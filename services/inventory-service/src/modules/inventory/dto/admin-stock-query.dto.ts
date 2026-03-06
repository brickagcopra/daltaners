import { IsOptional, IsUUID, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class AdminStockQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by product name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by store location UUID' })
  @IsOptional()
  @IsUUID()
  store_location_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by stock status',
    enum: ['all', 'low', 'out_of_stock'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'low', 'out_of_stock'])
  status?: string = 'all';
}

export class AdminMovementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by stock ID' })
  @IsOptional()
  @IsUUID()
  stock_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by movement type',
    enum: ['in', 'out', 'adjustment', 'reservation', 'release', 'return'],
  })
  @IsOptional()
  @IsIn(['in', 'out', 'adjustment', 'reservation', 'release', 'return'])
  movement_type?: string;
}
