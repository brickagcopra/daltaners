import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class LoyaltyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['earn', 'redeem', 'bonus', 'adjust', 'expire'] })
  @IsOptional()
  @IsIn(['earn', 'redeem', 'bonus', 'adjust', 'expire'])
  type?: string;
}
