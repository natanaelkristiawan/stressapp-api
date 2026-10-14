import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PostEntity } from "./post.entity";
import { UserMimateEntity } from "./user-mimate.entity";

@Entity({engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',name: "search_history"})
export class SearchHistoryEntity {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ nullable: true})
    keyword: string;

    // realtion with member
    @ManyToOne(()=>UserMimateEntity, (member) => member.id)
    @JoinColumn({ name: 'member_id' })
    member?: UserMimateEntity

    @CreateDateColumn()
    search_at: Date;

    // field type
    @Column({ nullable: true})
    type: string;
}