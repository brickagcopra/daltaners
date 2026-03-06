import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCarrierDto } from './create-carrier.dto';

export class UpdateCarrierDto extends PartialType(
  OmitType(CreateCarrierDto, ['code'] as const),
) {}
