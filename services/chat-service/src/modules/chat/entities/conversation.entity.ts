import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ConversationParticipantEntity } from './conversation-participant.entity';

@Entity({ name: 'conversations', schema: 'chat' })
export class ConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, default: 'order' })
  type: string; // 'order' | 'support' | 'direct'

  @Column({ type: 'uuid', nullable: true })
  order_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string; // 'active' | 'closed' | 'archived'

  @Column({ type: 'timestamptz', nullable: true })
  last_message_at: Date | null;

  @Column({ type: 'text', nullable: true })
  last_message_preview: string | null;

  @Column({ type: 'int', default: 0 })
  message_count: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => ConversationParticipantEntity, (p) => p.conversation, { eager: true })
  participants: ConversationParticipantEntity[];
}
