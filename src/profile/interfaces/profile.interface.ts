export interface profile {
    id: number
    name: string
    photo: string
    email: string
    gender: string
    dob: Date
    tagline: string
    bio: string
    hobby: string
    link: string
    postCode: string
    address: string
    SIMExpired: Date
    totalPosts: number
    totalFollowers: number
    totalFollowings: number
    totalSpaces: number
    following: boolean
    is_dealer: boolean
    share_url?: string
    spaces?: space[],
    memberSince: string,
    lastSeenAt: string,
    vehicleList: string[],
    mimatePoint?: number
}

export interface space {
    id: number
    name: string
}


export interface MemberFollowInterface {
    memberId: number;
    name: string;
    profilePicture: string;
    bio?: string;
    seen?: number;
}

