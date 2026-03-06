import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDisputeDto {
  @ApiProperty({ description: 'Order ID to dispute' })
  @IsUUID()
  order_id: string;

  @ApiPropertyOptional({ description: 'Related return request ID (if dispute is about a return)' })
  @IsOptional()
  @IsUUID()
  return_request_id?: string;

  @ApiProperty({
    description: 'Dispute category',
    enum: [
      'order_not_received', 'item_missing', 'wrong_item', 'damaged_item',
      'quality_issue', 'overcharged', 'late_delivery', 'vendor_behavior',
      'delivery_behavior', 'unauthorized_charge', 'other',
    ],
  })
  @IsEnum([
    'order_not_received', 'item_missing', 'wrong_item', 'damaged_item',
    'quality_issue', 'overcharged', 'late_delivery', 'vendor_behavior',
    'delivery_behavior', 'unauthorized_charge', 'other',
  ])
  category: string;

  @ApiProperty({ description: 'Short subject line' })
  @IsString()
  @MaxLength(255)
  subject: string;

  @ApiProperty({ description: 'Detailed description of the dispute' })
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional({ description: 'Evidence image/file URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence_urls?: string[];

  @ApiPropertyOptional({
    description: 'Requested resolution',
    enum: ['refund', 'partial_refund', 'replacement', 'store_credit', 'apology', 'other'],
    default: 'refund',
  })
  @IsOptional()
  @IsEnum(['refund', 'partial_refund', 'replacement', 'store_credit', 'apology', 'other'])
  requested_resolution?: string;
}

export class CreateDisputeMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({ description: 'Attachment URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
