import { DataSource } from 'typeorm';
import { ConversationCard } from '../../entity/conversation-card.entity';
import {
  DEFAULT_CONVERSATION_CARDS,
  seedConversationCards,
} from './conversation-card.seed';

describe('Conversation cards seed', () => {
  it('defines 4 default cards with distinct visuals', () => {
    expect(DEFAULT_CONVERSATION_CARDS).toHaveLength(4);
    const visuals = DEFAULT_CONVERSATION_CARDS.map((card) => card.visual);
    expect(new Set(visuals).size).toBe(4);
  });

  it('creates cards idempotently when table is empty', async () => {
    const savedCards: ConversationCard[] = [];
    const repo = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value as ConversationCard),
      save: jest.fn(async (value) => {
        savedCards.push(value as ConversationCard);
        return value;
      }),
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repo),
    } as unknown as DataSource;

    const result = await seedConversationCards(dataSource);
    expect(result.created).toBe(4);
    expect(result.skipped).toBe(0);
    expect(savedCards).toHaveLength(4);
    expect(savedCards.every((card) => card.categoryId === null)).toBe(true);
    expect(savedCards.every((card) => card.isActive === true)).toBe(true);
  });

  it('skips cards already present per visual', async () => {
    const existing = {
      id: 9,
      visual: 'kuliner',
      title: 'Kuliner',
    };
    const repo = {
      findOneBy: jest
        .fn()
        .mockImplementation(async ({ visual }: { visual: string }) => {
          if (visual === 'kuliner') return existing;
          return null;
        }),
      create: jest.fn((value) => value as ConversationCard),
      save: jest.fn(async (value) => value),
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repo),
    } as unknown as DataSource;

    const result = await seedConversationCards(dataSource);
    expect(result.created).toBe(3);
    expect(result.skipped).toBe(1);
  });
});
