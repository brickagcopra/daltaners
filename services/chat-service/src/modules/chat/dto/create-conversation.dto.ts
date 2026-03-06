import { IsString, IsOptional, IsUUID, IsArray, IsIn, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ParticipantDto {
  @ApiProperty()
  @IsUUID()
  user_id: string;

  @ApiProperty({ enum: ['customer', 'vendor', 'delivery', 'admin'] })
  @IsIn(['customer', 'vendor', 'delivery', 'admin'])
  user_type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  display_name?: string;
}

export class CreateConversationDto {
  @ApiProperty({ enum: ['order', 'support', 'direct'], default: 'order' })
  @IsIn(['order', 'support', 'direct'])
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  order_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ type: [ParticipantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants: ParticipantDto[];
}
