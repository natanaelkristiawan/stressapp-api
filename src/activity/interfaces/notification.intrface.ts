import { Post } from "src/post/interfaces/post.interface"

export interface notification {
  id: number
  member: member
  message: string
  postId: number
  commentId: number
  reactionId: number
  readAt: Date
  createdAt: Date
  createdAtTitle: string
}

export interface member {
    id: number
    name: string
    profilePictureUrl: string
}


export interface NotificationCollectionResponse {
  totalData: number
  hasNext: boolean
  page: number
  limit: number
  offset: number
  after: string
  data: notification[]
}