import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from 'src/entity/convertation.entity';
import { Message } from 'src/entity/message.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { In, Not, Repository } from 'typeorm';
import { GetMessage, Conversation as ConversationInterface, History as HistoryInterface, GetMessageGroupByDate, GetConversationHistory } from './interfaces/direct-message.interface';
import { DateHelper } from 'src/common/helpers/date.helper';

@Injectable()
export class DirectMessageService {


    constructor(

        @InjectRepository(Message, 'mimate')
        private readonly messageRepository: Repository<Message>,

        @InjectRepository(Conversation, 'mimate')
        private readonly conversationRepository: Repository<Conversation>,
    
        @InjectRepository(UserMimateEntity, 'mimate')
        private readonly userMimateRepository: Repository<UserMimateEntity>,

        // date formatter
        private readonly dateHelper: DateHelper
    ){

    }

    private getMemberName(name:string, mmid_fullname:string,  id:number): string {
        let tempName = name
        if (!tempName || tempName.trim() === '') {
          tempName = mmid_fullname;
        }
        if (!tempName || tempName.trim() === '') {
          tempName = `user_${String(id).padStart(4, '0')}`;
        }
    
        return tempName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }   


    async findOrCreateConversation(member1Id: number, member2Id: number): Promise<ConversationInterface> {
        const allConversations = await this.conversationRepository.find({
          relations: ['participants'],
        });
    
        // Find existing one-on-one conversation with exactly the same 2 members
        const existing = allConversations.find((c) => {
          const ids = c.participants.map((p) => p.id).sort((a, b) => a - b);
          const target = [member1Id, member2Id].sort((a, b) => a - b);
          return ids.length === 2 && ids[0] === target[0] && ids[1] === target[1];
        });
    
        if (existing) {
          return {
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
            participants: existing.participants.map((participant) => ({
              id: participant.id,
              name: this.getMemberName(participant.name, participant.mmid_fullname, participant.id), 
              profilePictureUrl: participant.profilePictureUrl,
              isOwner: participant.id === member1Id
            }))
          }
        }
    
        const member1 = await this.userMimateRepository.findOneOrFail({ where: { id: member1Id } });
        const member2 = await this.userMimateRepository.findOneOrFail({ where: { id: member2Id } });
    
        const newConversation = this.conversationRepository.create({
          participants: [member1, member2],
        });
    
        let response = await this.conversationRepository.save(newConversation);

        return {
            id: response.id,
            createdAt: response.createdAt,
            updatedAt: response.updatedAt,
            participants: response.participants.map((participant) => ({
                id: participant.id,
                name: this.getMemberName(participant.name, participant.mmid_fullname, participant.id),
                // check if profilePictureUrl is null or undefined
                profilePictureUrl: participant?.profilePictureUrl ? participant?.profilePictureUrl: '',
                isOwner: participant.id === member1Id
            }))
        }
        
    }

    // convert 2025-04-17 into 17 April 2025
    formatDate(date: string): string {
        const dateObj = new Date(date);
        return dateObj.toLocaleDateString('id-ID', { month: 'long', day: 'numeric', year: 'numeric' });
    }


    async sendMessage(conversationId: number, senderId: number, content: string): Promise<GetMessage> {
        const conversation = await this.conversationRepository.findOneBy({ id: conversationId });
        if (!conversation) throw new NotFoundException('Conversation not found');
    
        const sender = await this.userMimateRepository.findOneBy({ id: senderId });
        if (!sender) throw new NotFoundException('Sender not found');

        let message = new Message()
        message.conversation = conversation
        message.sender = sender
        message.content = content
        message.createdAt = new Date()

        let response = await this.messageRepository.save(message);

        
        // Keep the original UTC instant.
        let messageTime = new Date(response.createdAt);
        
        return {
          id: response.id,
          content: response.content,
          createdAt: response.createdAt,
          time: messageTime.toLocaleTimeString('en-US', {
          timeZone: 'UTC',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          date: this.formatDate(messageTime.toISOString().split('T')[0]),
          sender: {
            id: sender.id,
            name: this.getMemberName(sender.name, sender.mmid_fullname, sender.id),
            profilePictureUrl: sender.profilePictureUrl,
            isOwner: sender.id === senderId
          }
        }
    }

   


    async getMessagesByConversationId(conversationId: number, userId: number): Promise<GetConversationHistory> {
      // Check if user is a participant of the conversation
      let query = await this.conversationRepository.find({where:{
        id: conversationId,
        
      }, relations: ["participants"], take: 1})

      let imParticipants = query[0]

      // send error if user is not a participant of the conversation
      if(!imParticipants.participants.some(p => p.id === userId)) {
        throw new NotFoundException('You are not participants');
      }
      

      let recipient = imParticipants.participants.find(p => p.id !== userId)
      let sender = imParticipants.participants.find(p => p.id === userId)


       // Get the messages
    const messages = await this.messageRepository.find({
      where: { conversation: { id: conversationId } },
      order: { createdAt: 'ASC' }, // Newest first or oldest first depending
      relations: ['sender', 'conversation.participants'],
    });


    let results: GetMessage[] = []
      
    results = messages.map((msg) => {
      const recipient = msg.conversation.participants.find(p => p.id !== msg.sender.id);

      let messageTime = new Date(msg.createdAt);
  
      return {
        id: msg.id,
        content: msg.content,
        createdAt: messageTime,
        // time change into am or pm  
        time: messageTime.toLocaleTimeString('en-US', {
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        date: this.formatDate(messageTime.toISOString().split('T')[0]),
        sender: {
          isOwner: msg.sender.id === userId,
          id: msg.sender.id,
          name: this.getMemberName(msg.sender.name, msg.sender.mmid_fullname, msg.sender.id),
          profilePictureUrl: msg.sender.profilePictureUrl,
        }
      };
    });

    // group by date
    const groupedMessages = results.reduce((acc, msg) => {
      const date = msg.date;
      if (!acc[date]) {
        acc[date] = [];
      } 
      acc[date].push(msg);
      return acc;
    }, {});
    // return grouped messages
    let history = Object.entries(groupedMessages).map(([date, messages]) => ({
      date,
      messages: messages as GetMessage[]
    }));
    

    let senderSeenAtFormatted = ""

    if(sender.last_seen_at) {
      senderSeenAtFormatted = this.dateHelper.getDateRange(sender.last_seen_at, new Date())
    }

    let recipientSeenAtFormatted = ""

    if(recipient.last_seen_at) {
      recipientSeenAtFormatted = this.dateHelper.getDateRange(recipient.last_seen_at, new Date())
    }

    // sender last seen at
    
    return {
      id: conversationId,
      sender: {
        id: userId,
        name: this.getMemberName(sender.name, sender.mmid_fullname, sender.id),
        // check if profilePictureUrl is null or undefined
        profilePictureUrl: sender?.profilePictureUrl ? sender?.profilePictureUrl: '',
        isOwner: sender.id === userId,
        lastSeenAt: sender.last_seen_at ? sender.last_seen_at : "",
        lastSeenAtTitle: senderSeenAtFormatted,
        date: sender.last_seen_at ? this.formatDate(new Date(sender.last_seen_at).toISOString().split('T')[0]) : "",
        time: sender.last_seen_at ? new Date(sender.last_seen_at).toLocaleTimeString('en-US', {
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }) : "",
      },
      receiver: {
        id: recipient.id,
        name: this.getMemberName(recipient.name, recipient.mmid_fullname, recipient.id), 
        // check if profilePictureUrl is null or undefined
        profilePictureUrl: recipient?.profilePictureUrl ? recipient?.profilePictureUrl: '',
        isOwner: recipient.id === userId ,
        lastSeenAt: recipient.last_seen_at ? recipient.last_seen_at : "",
        lastSeenAtTitle: recipientSeenAtFormatted,
        date: recipient.last_seen_at ? this.formatDate(new Date(recipient.last_seen_at).toISOString().split('T')[0]) : "",
        time: recipient.last_seen_at ? new Date(recipient.last_seen_at).toLocaleTimeString('en-US', {
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }) : "",
      },
      history: history    
    }
  }
    


    async getUserConversationList(userId: number, search?): Promise<HistoryInterface[]> {
      // get list convertation id

      let query = await this.conversationRepository.find({
        where: {
          participants:{
            id: userId
          }
        },
        relations:["participants"]
      })

      // get the recieper
      let convertations:number[]=[]

      for (let index = 0; index < query.length; index++) {
        const element = query[index];

        convertations.push(element.id)
      }

      let conversations = await this.conversationRepository.find({where:{
        id:In(convertations)
      }, relations:["participants", "messages"]});
      

      if(search !== undefined) {
        if(search !== "") {
          // search with like - use same logic as getMemberName to match displayed names
          conversations = conversations.filter(convo => {
            return convo.participants.some(p => {
              const displayName = this.getMemberName(p.name, p.mmid_fullname, p.id);
              return displayName.toLowerCase().includes(search.toLowerCase());
            });
          });
        }
      }



    

      const results = [];

      for (const convo of conversations) {
        const sender = convo.participants.find(p => p.id !== userId);
        
        if(sender === undefined) {
          continue;
        }

        const formatSender = {
          id: sender.id,
          name: this.getMemberName(sender.name, sender.mmid_fullname, sender.id),
          // check if profilePictureUrl is null or undefined
          profilePictureUrl: sender?.profilePictureUrl ? sender?.profilePictureUrl: '',
          isOwner: sender.id === userId,
        };

        const unreadCount = await this.messageRepository
          .createQueryBuilder('message')
          .leftJoin('message.readBy', 'reader')
          .where('message.conversationId = :conversationId', { conversationId: convo.id })
          .andWhere('message.senderId = :senderId', { senderId: sender.id })
          .andWhere(qb => {
            const sub = qb
              .subQuery()
              .select('mr.message_id')
              .from('message_reads', 'mr')
              .where('mr.user_id = :userId')
              .getQuery();
            return 'message.id NOT IN ' + sub;
          })
          .setParameter('userId', userId)
          .getCount();

        // 👇 Skip conversations with 0 unread messages
       
        const lastMessage = convo.messages.sort((a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime(),
        )[0];

        if (lastMessage === undefined) {
          continue;
        }

        let lastMessageAtFormatted = ""

        if(lastMessage.createdAt) {
          lastMessageAtFormatted = this.dateHelper.getDateRange(lastMessage.createdAt, new Date())
        }

        // Keep the original UTC instant.
        let lastMessageTime = new Date(lastMessage.createdAt);
        
        results.push({
          id: convo.id,
          sender: formatSender,
          lastMessage: lastMessage.content,
          lastMessageAt: lastMessage.createdAt,
          lastMessageAtTitle: lastMessageAtFormatted,
          // time in am pm with same timezone as the user
          time: lastMessageTime.toLocaleTimeString('en-US', {
          timeZone: 'UTC',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          date: this.formatDate(lastMessageTime.toISOString().split('T')[0]),
          unreadCount,
        });
      }
      
 
    
      return results
    
    }
    

    async softDeleteConversationById(conversationId: number, userId: number): Promise<void> {
      const conversation = await this.conversationRepository.findOne({
        where: { id: conversationId },
        relations: ['participants'],
      });
    
      if (!conversation) {
        throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
      }
    
      const isParticipant = conversation.participants.some((user) => user.id === userId);
      if (!isParticipant) {
        throw new ForbiddenException('You are not a participant of this conversation');
      }
    
      await this.conversationRepository.softDelete(conversationId);
    }


    async markMessagesAsRead(conversationId: number, userId: number): Promise<void> {
      const messages = await this.messageRepository
        .createQueryBuilder('message')
        .leftJoin('message.readBy', 'reader')
        .where('message.conversationId = :conversationId', { conversationId })
        .andWhere(qb => {
          const subQuery = qb
            .subQuery()
            .select('message_reads.message_id')
            .from('message_reads', 'message_reads')
            .where('message_reads.user_id = :userId')
            .getQuery();
          return 'message.id NOT IN ' + subQuery;
        })
        .setParameter('userId', userId)
        .getMany();
    
      if (messages.length > 0) {
        for (const message of messages) {
          await this.messageRepository
            .createQueryBuilder()
            .relation(Message, 'readBy')
            .of(message)
            .add(userId);
        }
      }
    }

    async countUnreadMessages(conversationId: number, userId: number): Promise<number> {
      return this.messageRepository
        .createQueryBuilder('message')
        .leftJoin('message.readBy', 'reader')
        .where('message.conversationId = :conversationId', { conversationId })
        .andWhere(qb => {
          const subQuery = qb
            .subQuery()
            .select('message_reads.message_id')
            .from('message_reads', 'message_reads')
            .where('message_reads.user_id = :userId')
            .getQuery();
          return 'message.id NOT IN ' + subQuery;
        })
        .setParameter('userId', userId)
        .getCount();
    }


    
    
    
}
