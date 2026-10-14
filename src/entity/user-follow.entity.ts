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
  
  @Entity('user_follows')
  @Unique(['follower', 'following'])
  export class UserFollowEntity {
    @ApiProperty({ example: 1, description: 'Unique identifier for the follow record' })
    @PrimaryGeneratedColumn()
    id: number;


    @Column({ nullable: true})
    followerId?: number;

    @Column({ nullable: true})
    followingId?: number;
  
    @ApiProperty({ type: () => UserMimateEntity, description: 'User who is following' })
    @ManyToOne(() => UserMimateEntity, user => user.following, {
      onDelete: 'CASCADE',
    })
    follower: UserMimateEntity;
  
    @ApiProperty({ type: () => UserMimateEntity, description: 'User being followed' })
    @ManyToOne(() => UserMimateEntity, user => user.followers, {
      onDelete: 'CASCADE',
    })
    following: UserMimateEntity;
  
    @ApiProperty({ example: '2024-04-21T12:34:56Z', description: 'When the follow was created' })
    @CreateDateColumn()
    followedAt: Date;

    @Column({nullable:true, default:0})
    seen?: number;
  }
  