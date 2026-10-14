import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { PostEntity } from "./post.entity";


@Entity({engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',name: "backup_spaces"})
export class SpaceEntity {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ nullable: true})
    spaceId?: string;

    @Column({ nullable: true})
    name: string;

    @Column({ nullable: true})
    description: string;

    @Column({ nullable: true})
    slug?: string;

    @Column({ nullable: true})
    image: string;

    @Column({ nullable: true})
    banner: string;

    @Column({ nullable: true})
    membersCount: number;

    @Column({ nullable: true})
    postsCount: number;

    @Column({ nullable: true})
    hidden?: number;

    @Column({ nullable: true})
    inviteOnly?: number;

    @Column({ nullable: true})
    backup_space_id: number;

    @OneToMany(()=>PostEntity, (post) => post.space)
    @JoinColumn({ name: 'id' })
    posts?: PostEntity[]


    @Column({ nullable: false, default: false})
    is_dealer?: boolean;

    @Column({ nullable: true})
    order?: number;

    @CreateDateColumn({ nullable: true})
    created_at: Date;

}