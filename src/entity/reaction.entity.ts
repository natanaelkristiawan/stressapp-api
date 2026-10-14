import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PostEntity } from "./post.entity";
import { UserMimateEntity } from "./user-mimate.entity";
import { QuestPointDetail } from "./quest-point-detail.entity";

@Entity({engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',name: "backup_reactions"})
export class ReactionEntity {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ nullable: true})
    reaction: string;

    @Column({ nullable: true})
    reactionId?: string;

    @Column({ nullable: true})
    name: string;

    @ManyToOne(()=>PostEntity, (post) => post.id)
    @JoinColumn({ name: 'backup_post_with_attribute_id' })
    post?: PostEntity

    @ManyToOne(()=>UserMimateEntity, (member) => member.id)
    @JoinColumn({ name: 'backup_member_id' })
    member?: UserMimateEntity

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at?: Date;
    
    // quest point details
    @OneToMany(() => QuestPointDetail, (questPointDetail) => questPointDetail.reaction)
    questPointDetails?: QuestPointDetail[];
}