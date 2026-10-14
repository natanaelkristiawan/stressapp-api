import { Column, Entity, PrimaryGeneratedColumn, DeleteDateColumn, ManyToOne, JoinColumn  } from "typeorm";
import { CarEntity } from "./car.entity";

@Entity('user_vehicles')
export class UserVehicleEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({nullable:true})
    user_id:number

    @Column({nullable:true})
    car_id:number

    // relation with CarEntity
    @ManyToOne(()=>CarEntity, (vehicle) => vehicle.id)
    @JoinColumn({ name: 'car_id' })
    car?: CarEntity

    @DeleteDateColumn()
    deleted_at?: Date;
}