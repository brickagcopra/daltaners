import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'notifications', name: 'preferences' })
export class NotificationPreferenceEntity {
  @PrimaryColumn('uuid')
  user_id: string;

  @Column({ type: 'boolean', default: true })
  push_enabled: boolean;

  @Column({ type: 'boolean', default: true })
  email_enabled: boolean;

  @Column({ type: 'boolean', default: true })
  sms_enabled: boolean;

  @Column({ type: 'boolean', default: true })
  order_updates: boolean;

  @Column({ type: 'boolean', default: true })
  promotions: boolean;

  @Column({ type: 'boolean', default: true })
  delivery_updates: boolean;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
