import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',name: "backup_tags"})
export class TagsEntity {
    @PrimaryGeneratedColumn()
    id?: number;

    @Index()
    @Column({ nullable: true})
    tagId: string;

    @Column({ nullable: true})
    slug: string;

    @Column({ nullable: true})
    title: string;
}