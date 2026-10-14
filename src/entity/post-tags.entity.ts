import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PostEntity } from "./post.entity";
import { TagsEntity } from "./tags.entity";

@Entity({engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',name: "backup_post_tags"})
export class PostTagsEntity {
    @PrimaryGeneratedColumn()
    id?: number;

    @Index()
    @Column({ nullable: true})
    tagId?: string;

    @Column({ nullable: true})
    slug: string;

    @Column({ nullable: true})
    title: string;

    @Column({
        type: 'datetime',
        nullable: true,
    })
    created_at?: Date;

    @Column({
        type: 'datetime',
        nullable: true,
    })
    updated_at?: Date;

    @Column({
        type: 'datetime',
        nullable: true,
    })
    deleted_at?: Date;


    @ManyToOne(()=>PostEntity, (post) => post.id)
    @JoinColumn({ name: 'backup_post_id' })
    post?: PostEntity


    @ManyToOne(() => TagsEntity, (tag) => tag.id)
    @JoinColumn({ name: "backup_tag_id" })
    tag?: TagsEntity;

    @Column({ nullable: true})
    backup_tag_id?: number;
}