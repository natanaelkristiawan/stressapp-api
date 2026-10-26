import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserMimateEntity } from './user-mimate.entity';
import { ApiProperty } from '@nestjs/swagger';

export type FriendConnectionStatus = 'pending' | 'accepted';

@Entity('user_follows')
@Unique(['follower', 'following'])
export class UserFollowEntity {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the follow record',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  followerId?: number;

  @Column({ nullable: true })
  followingId?: number;

  @ApiProperty({
    type: () => UserMimateEntity,
    description: 'User who sent the friend request',
  })
  @ManyToOne(() => UserMimateEntity, (user) => user.following, {
    onDelete: 'CASCADE',
  })
  follower: UserMimateEntity;

  @ApiProperty({
    type: () => UserMimateEntity,
    description: 'User who received the friend request',
  })
  @ManyToOne(() => UserMimateEntity, (user) => user.followers, {
    onDelete: 'CASCADE',
  })
  following: UserMimateEntity;

  @ApiProperty({
    example: '2024-04-21T12:34:56Z',
    description: 'When the friend request was created',
  })
  @CreateDateColumn()
  followedAt: Date;

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'accepted'],
    description: 'Status of the friend connection',
  })
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status?: FriendConnectionStatus;

  @ApiProperty({
    example: '2024-04-21T12:40:00Z',
    nullable: true,
    description: 'When the friend request was accepted',
  })
  @Column({ type: 'datetime', nullable: true })
  respondedAt?: Date | null;

  @Column({ nullable: true, default: 0 })
  seen?: number;
}
