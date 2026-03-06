import { IsOptional, IsString, IsIn, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class TaxInvoiceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by invoice type',
    enum: ['all', 'official_receipt', 'sales_invoice', 'ewt_certificate', 'credit_note'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'official_receipt', 'sales_invoice', 'ewt_certificate', 'credit_note'])
  invoice_type?: string = 'all';

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['all', 'draft', 'issued', 'cancelled', 'voided'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'draft', 'issued', 'cancelled', 'voided'])
  status?: string = 'all';

  @ApiPropertyOptional({ description: 'Filter from date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}

export class AdminTaxInvoiceQueryDto extends TaxInvoiceQueryDto {
  @ApiPropertyOptional({ description: 'Filter by vendor ID' })
  @IsOptional()
  @IsUUID()
  vendor_id?: string;

  @ApiPropertyOptional({ description: 'Search by invoice number or vendor name' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class CancelInvoiceDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  reason?: string;
}
