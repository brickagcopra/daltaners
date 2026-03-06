import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ConversationEntity } from './conversation.entity';

@Entity({ name: 'conversation_participants', schema: 'chat' })
export class ConversationParticipantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversation_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  user_type: string; // 'customer' | 'vendor' | 'delivery' | 'admin' | 'system'

  @Column({ type: 'varchar', length: 100, nullable: true })
  display_name: string | null;

  @Column({ type: 'boolean', default: false })
  is_muted: boolean;

  @Column({ type: 'int', default: 0 })
  unread_count: number;

  @Column({ type: 'timestamptz', nullable: true })
  last_read_at: Date | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  joined_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  left_at: Date | null;

  @ManyToOne(() => ConversationEntity, (c) => c.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: ConversationEntity;
}
