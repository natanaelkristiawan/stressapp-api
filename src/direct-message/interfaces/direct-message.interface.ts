export interface Member {
    id: number
    name: string
    profilePictureUrl: string,
    isOwner: boolean,
    lastSeenAt?: Date | string,
    lastSeenAtTitle?: string,
    date?: string,
    time?: string
}


export interface History {
    id: number
    sender: Member
    lastMessage: string
    lastMessageAt?: Date
    time?: string
    date?: string
    unreadCount: number
}

export interface Conversation {
    id:number
    participants:Member[]
    createdAt:Date
    updatedAt:Date
}

// send message
export interface SendMessage {
    id: number
    content: number
    createdAt: Date
    sender: Member
    convertation: Conversation
}

// get message
export interface GetMessage {
    id: number
    content: string
    createdAt: Date
    date: string
    time: string
    sender: Member
}


export interface GetConversationHistory  {
    id: number
    sender: Member
    receiver: Member
    history: GetMessageGroupByDate[]
}
export interface GetMessageGroupByDate {
    date: string
    messages: GetMessage[]
}