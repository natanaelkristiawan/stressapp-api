import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import { PostEntity } from "./post.entity";

@Entity({engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',name: "backup_assets"})
export class AssetsEntity {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ nullable: true})
    mediaId?: string;

    @Column({ nullable: true})
    path?: string;

    @Column({ nullable: true, type: "longtext"})
    info?: string;

    @Column({ nullable: true})
    type: string;

    @Column({ nullable: true})
    url: string;

    @Column({ nullable: true})
    url_old?: string;

    @Column({ nullable: true}   )
    url_open?: string;

    @ManyToOne(()=>PostEntity, (post) => post.id)
    @JoinColumn({ name: 'backup_post_with_attribute_id' })
    post?: PostEntity

    @Column({
        type: 'datetime',
        nullable: true,
    })
    created_at?: Date;

}