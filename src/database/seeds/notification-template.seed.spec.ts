import { DataSource } from 'typeorm';
import { NotificationType } from '../../entity/member-notification.entity';
import { NotificationTemplate } from '../../entity/notification-template.entity';
import {
  DEFAULT_NOTIFICATION_TEMPLATES,
  seedNotificationTemplates,
} from './notification-template.seed';

describe('Notification templates seed', () => {
  it('defines 4 valid default notification templates', () => {
    expect(DEFAULT_NOTIFICATION_TEMPLATES).toHaveLength(4);
    const types = DEFAULT_NOTIFICATION_TEMPLATES.map((t) => t.type);
    expect(types).toContain(NotificationType.Message);
    expect(types).toContain(NotificationType.Forum);
    expect(types).toContain(NotificationType.CommentReply);
    expect(types).toContain(NotificationType.MoodReminder);
  });

  it('creates templates idempotently when table is empty', async () => {
    const savedTemplates: NotificationTemplate[] = [];
    const repo = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((val) => val as NotificationTemplate),
      save: jest.fn(async (val) => {
        savedTemplates.push(val as NotificationTemplate);
        return val;
      }),
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repo),
    } as unknown as DataSource;

    const result = await seedNotificationTemplates(dataSource);
    expect(result.created).toBe(4);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(savedTemplates).toHaveLength(4);
    expect(savedTemplates.every((t) => t.revision === 1)).toBe(true);
  });

  it('skips templates that are already configured and preserves revisions', async () => {
    const existing = {
      type: NotificationType.Forum,
      title: 'Custom Title',
      body: '{{actorName}} custom body',
      revision: 3,
    };
    const repo = {
      findOneBy: jest.fn().mockImplementation(async ({ type }) => {
        if (type === NotificationType.Forum) return existing;
        return null;
      }),
      create: jest.fn((val) => val as NotificationTemplate),
      save: jest.fn(async (val) => val),
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repo),
    } as unknown as DataSource;

    const result = await seedNotificationTemplates(dataSource);
    expect(result.created).toBe(3);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('updates unconfigured/blank templates if they exist', async () => {
    const blank = {
      type: NotificationType.Forum,
      title: '',
      body: '   ',
      revision: 1,
    };
    const repo = {
      findOneBy: jest.fn().mockImplementation(async ({ type }) => {
        if (type === NotificationType.Forum) return blank;
        return null;
      }),
      create: jest.fn((val) => val as NotificationTemplate),
      save: jest.fn(async (val) => val),
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repo),
    } as unknown as DataSource;

    const result = await seedNotificationTemplates(dataSource);
    expect(result.created).toBe(3);
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(0);
  });
});

