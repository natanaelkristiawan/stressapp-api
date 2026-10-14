// src/users/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { UserMimateEntity } from './user-mimate.entity';

@Entity('users')
export class UserAdmin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  email_verified_at: Date;

  @Column()
  password: string;

  @Column({nullable:true})
  salt: string;

  @Column({ nullable: true })
  remember_token: string;

  @Column({ nullable: true })
  created_at: Date;

  @Column({ nullable: true })
  updated_at: Date;

  @Column({ nullable: true })
  backup_member_id?: number;

  // join with userMimate 
  @OneToOne(() => UserMimateEntity, (userMimate) => userMimate.userAdmin, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'backup_member_id' })
  userMimate: UserMimateEntity;
}
