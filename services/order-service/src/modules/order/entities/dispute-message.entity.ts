import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DisputeEntity } from './dispute.entity';

@Entity({ name: 'dispute_messages', schema: 'orders' })
@Index('idx_dispute_messages_dispute_id', ['dispute_id'])
@Index('idx_dispute_messages_sender_id', ['sender_id'])
@Index('idx_dispute_messages_created_at', ['created_at'])
export class DisputeMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  dispute_id: string;

  @Column({ type: 'uuid' })
  sender_id: string;

  @Column({ type: 'varchar', length: 20 })
  sender_role: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', array: true, default: '{}' })
  attachments: string[];

  @Column({ type: 'boolean', default: false })
  is_internal: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => DisputeEntity, (dispute) => dispute.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dispute_id' })
  dispute: DisputeEntity;
}
