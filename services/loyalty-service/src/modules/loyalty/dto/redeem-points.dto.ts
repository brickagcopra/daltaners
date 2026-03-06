import { IsInt, Min, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RedeemPointsDto {
  @ApiProperty({ description: 'Number of points to redeem', minimum: 1 })
  @IsInt()
  @Min(1)
  points: number;

  @ApiPropertyOptional({ description: 'Order ID to apply discount to' })
  @IsOptional()
  @IsUUID()
  order_id?: string;
}
