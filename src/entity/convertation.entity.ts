import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  JoinTable,
  DeleteDateColumn,
} from 'typeorm';
import { UserMimateEntity } from './user-mimate.entity';
import { Message } from './message.entity';

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToMany(() => UserMimateEntity, { eager: false })
  @JoinTable({
    name: 'conversation_members_member',
    joinColumn: {
      name: 'conversationId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'memberId',
      referencedColumnName: 'id',
    },
  })
  participants: UserMimateEntity[];

  @OneToMany(() => Message, (message) => message.conversation, { cascade: true })
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date; // 👈 enables soft delete
}
