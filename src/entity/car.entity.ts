import { Column, Entity, PrimaryGeneratedColumn, DeleteDateColumn } from "typeorm";

@Entity('cars')
export class CarEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({nullable:true})
    brand_name:string
}