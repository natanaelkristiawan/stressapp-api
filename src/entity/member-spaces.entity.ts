import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserMimateEntity } from "./user-mimate.entity";
import { SpaceEntity } from "./space.entity";

@Entity({engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',name: "backup_member_space"})
export class MemberSpaceEntity {
    @PrimaryGeneratedColumn()
    id?: number;

    // backup member id
    @Column({ nullable: true})
    backup_member_id?: number;

    // backup space id
    @Column({ nullable: true})
    backup_space_id?: number;

    @ManyToOne(()=>UserMimateEntity, (member) => member.id)
    @JoinColumn({ name: 'backup_member_id' })
    member?: UserMimateEntity

    @ManyToOne(()=>SpaceEntity, (space) => space.id)
    @JoinColumn({ name: 'backup_space_id' })
    space?: SpaceEntity

    @Column({ nullable: true, default: false})
    notification?: boolean;

    @Column({ nullable: true, default: false})
    follow?: boolean;

    @CreateDateColumn()
    created_at?: Date;
    

}