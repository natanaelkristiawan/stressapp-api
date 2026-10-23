import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',name: "backup_tags"})
export class TagsEntity {
    @Column({ default: false })
    isContentCategory?: boolean;

    @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
    categoryKey?: string | null;

    @Column({ default: false })
    categoryArchived?: boolean;

    @Column({ type: 'int', unsigned: true, default: 1 })
    categoryRevision?: number;

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