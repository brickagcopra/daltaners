import { IsOptional, IsIn, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class AdminLoyaltyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by user ID or account ID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['bronze', 'silver', 'gold', 'platinum'] })
  @IsOptional()
  @IsIn(['bronze', 'silver', 'gold', 'platinum'])
  tier?: string;

  @ApiPropertyOptional({ enum: ['standard', 'premium', 'vip'] })
  @IsOptional()
  @IsIn(['standard', 'premium', 'vip'])
  account_type?: string;
}
