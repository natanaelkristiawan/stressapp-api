export interface Space {
    id:number
    name: string
    description: string
    image:string
    banner:string
    membersCount:number
    hidden:number
    inviteOnly:number
    postsCount:number
    backup_space_id:number
    following?:boolean
    notification?:boolean
    is_dealer?:boolean
    child?:Space[]
    parent?:Space
    group?:Space[]
    postsCountFormatted?:string
    membersCountFormatted?:string
    share_url?:string
}