import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsEmail,
  IsNumber,
  Min,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoreCategory } from '../entities/store.entity';

export class CreateStoreDto {
  @ApiProperty({ example: 'Tindahan ni Juan', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Your one-stop sari-sari store for all grocery needs' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: StoreCategory, example: StoreCategory.GROCERY })
  @IsEnum(StoreCategory)
  category: StoreCategory;

  @ApiProperty({ example: '+639171234567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  contact_phone: string;

  @ApiProperty({ example: 'juan@store.ph' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  contact_email: string;

  @ApiPropertyOptional({ example: 100.00, minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minimum_order_value?: number;
}
