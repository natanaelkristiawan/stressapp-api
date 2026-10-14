import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('users')
export class UserEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({nullable: true})
    email:string

    @Column({nullable: true})
    last_login:string;

    @Column({nullable: true})
    reason:string;

    @Column({nullable: true})
    fullname:string;

    @Column({nullable: true})
    phone:string;

    @Column({nullable: true})
    gender:string;

    @Column({nullable: true})
    birthdate:string;
    
    @Column({nullable: true})
    address:string;
    
    @Column({nullable: true})
    ponta_id:string;
    
    @Column({nullable: true})
    ponta_point:string;

    @Column({nullable: true})
    user_photo:string;
    
    @Column({nullable: true})
    salesforce_id:string;
    
    @Column({nullable: true})
    device_id:string;
    
    @Column({nullable: true})
    is_newsletter:string;

    @Column({nullable: true})
    sosmed_id:string;

    @Column({nullable: true})
    sosmed_type:string;

    @Column({nullable: true})
    sosmed_picture:string;

    @Column({nullable: true})
    sosmed_name:string;

    @Column({nullable: true})
    email_gmail:string;

    @Column({nullable: true})
    province_id:string;
    
    @Column({nullable: true})
    city_id:string;
    
    @Column({nullable: true})
    sim_expiry_date:string;
    
    @Column({nullable: true})
    sim_image:string;
    
    @Column({nullable: true})
    qrcode_image:string;
    
    @Column({nullable: true})
    ktp_image:string;
    
    @Column({nullable: true})
    post_code:string;
    
    @Column({nullable: true})
    phone_2:string;

    @Column({nullable: true})
    ktp_no:string;

    @Column({nullable: true})
    last_access:string;

    @Column({nullable: true})
    sf_status:string;

    @Column({nullable: true})
    sf_message:string;

    @Column({nullable: true})
    sf_response:string;

    @Column({nullable: true})
    user_source:string;

    @Column({nullable: true})
    temporarily_inactive:string;

    @Column({nullable: true})
    temporarily_inactive_source:string;

    @Column({nullable: true})
    register_webview_community:string;

    @Column({nullable: true})
    mimate_username:string;

    @Column({nullable: true})
    mimate_register_date:string;

    @Column({nullable: true})
    register_date:string;

    @Column({nullable: true})
    profile_completed:string;

    @Column({nullable: true})
    profile_completed_source:string;

    @Column({nullable: true})
    mimate_email:string;
    
    @Column({nullable: true})
    mimate_id:string;
    
    @Column({nullable: true})
    tester_account:string;
    
    @Column({nullable: true})
    registration_source:string;
    
    @Column({nullable: true})
    kode_pos_detail_address:string;
    
    @Column({nullable: true})
    kode_pos_id:string;
    
    @Column({nullable: true})
    referral_code:string;
    
    @Column({nullable: true})
    referral_account_sync_date:string;

    @Column({nullable: true})
    mimate_tagline?:string;

    @Column({nullable: true})
    mimate_bio?:string;

    @Column({nullable: true})
    mimate_hobby?:string;


    @Column({nullable: true})
    mimate_link?:string;
    
    @Column({nullable: true})
    mimate_fullname?:string;

    
    @Column({nullable: true})
    mimate_image_profile?:string;
}