import { IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EarnPointsDto {
  @ApiProperty({ description: 'Order ID that triggered the points earn' })
  @IsUUID()
  order_id: string;

  @ApiProperty({ description: 'Customer user ID' })
  @IsUUID()
  customer_id: string;

  @ApiProperty({ description: 'Total order amount in PHP', minimum: 0 })
  @IsNumber()
  @Min(0)
  order_amount: number;
}
