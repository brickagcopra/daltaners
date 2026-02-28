import { IsNotEmpty, IsUUID, IsNumber, IsEnum, IsString, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMethod {
  CARD = 'card',
  GCASH = 'gcash',
  MAYA = 'maya',
  GRABPAY = 'grabpay',
  COD = 'cod',
  WALLET = 'wallet',
  BANK_TRANSFER = 'bank_transfer',
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'Order ID to pay for', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsNotEmpty()
  @IsUUID()
  order_id: string;

  @ApiProperty({ description: 'Payment amount in PHP', example: 1500.50 })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.GCASH,
  })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    description: 'Unique idempotency key to prevent duplicate payments',
    example: 'pay_abc123_1709049600',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  idempotency_key: string;
}
