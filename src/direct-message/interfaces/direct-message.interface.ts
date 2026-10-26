export interface Member {
  id: number;
  name: string;
  profilePictureUrl: string;
  isOwner: boolean;
  lastSeenAt?: Date | string;
  lastSeenAtTitle?: string;
  date?: string;
  time?: string;
}

export interface History {
  id: number;
  sender: Member;
  lastMessage: string;
  lastMessageAt?: Date;
  time?: string;
  date?: string;
  unreadCount: number;
}

export interface Conversation {
  id: number;
  participants: Member[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessage {
  id: number;
  content: number;
  createdAt: Date;
  sender: Member;
  convertation: Conversation;
}

export interface GetMessage {
  id: number;
  content: string;
  createdAt: Date;
  date: string;
  time: string;
  sender: Member;
}

export interface GetConversationHistory {
  id: number;
  sender: Member;
  receiver: Member;
  history: GetMessageGroupByDate[];
}

export interface GetMessageGroupByDate {
  date: string;
  messages: GetMessage[];
}

export interface ChatPartnerInterface {
  id: number;
  name: string;
  username: string;
  avatarUrl: string;
  location: string;
  preferences: string[];
}

export interface ChatThreadItemInterface {
  id: string;
  conversationId: number;
  partnerId: number;
  name: string;
  username: string;
  avatarUrl: string;
  lastMessage: string;
  lastMessageAt: string | null;
  time: string;
  unreadCount: number;
  isFriend: boolean;
}

export interface ChatThreadListInterface {
  items: ChatThreadItemInterface[];
}

export interface ChatMessageItemInterface {
  id: string;
  messageId: number;
  sender: 'user' | 'other';
  senderId: number;
  text: string;
  time: string;
  createdAt: string;
}

export interface ChatTopicCardInterface {
  id: string;
  title: string;
  color: string;
  textColor: string;
  prompt: string;
  subPrompt?: string;
  type: 'kuliner' | 'hobi' | 'film' | 'keseharian';
}

export interface ChatRoomDetailInterface {
  conversationId: number;
  partner: ChatPartnerInterface;
  isFriend: boolean;
  messages: ChatMessageItemInterface[];
  topics: ChatTopicCardInterface[];
}
