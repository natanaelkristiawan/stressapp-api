
import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn, JoinTable, ManyToMany } from "typeorm";
import { Conversation } from "./convertation.entity";
import { UserMimateEntity } from "./user-mimate.entity";

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  conversation: Conversation;

  @ManyToOne(() => UserMimateEntity)
  sender: UserMimateEntity;


  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => UserMimateEntity)
  @JoinTable({
    name: 'message_reads',
    joinColumn: { name: 'message_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  readBy: UserMimateEntity[];
}
