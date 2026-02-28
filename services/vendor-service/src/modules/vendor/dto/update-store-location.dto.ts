import { PartialType } from '@nestjs/swagger';
import { CreateStoreLocationDto } from './create-store-location.dto';

export class UpdateStoreLocationDto extends PartialType(CreateStoreLocationDto) {}
