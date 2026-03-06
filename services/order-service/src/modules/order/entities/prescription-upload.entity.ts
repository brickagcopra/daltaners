import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'prescription_uploads', schema: 'orders' })
@Index('idx_prescription_uploads_customer', ['customer_id'])
@Index('idx_prescription_uploads_status', ['status'])
@Index('idx_prescription_uploads_hash', ['image_hash'])
export class PrescriptionUploadEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'varchar', length: 500 })
  image_url: string;

  @Column({ type: 'varchar', length: 64 })
  image_hash: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  verified_by: string | null;

  @Column({ type: 'text', nullable: true })
  verification_notes: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  doctor_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  doctor_license: string | null;

  @Column({ type: 'date', nullable: true })
  prescription_date: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
