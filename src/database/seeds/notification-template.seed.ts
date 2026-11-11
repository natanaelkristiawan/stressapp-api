import { DataSource } from 'typeorm';
import { NotificationType } from '../../entity/member-notification.entity';
import { NotificationTemplate } from '../../entity/notification-template.entity';
import { validateTemplateText } from '../../notification-templates/notification-templates.render';

export const DEFAULT_NOTIFICATION_TEMPLATES: Array<{
  type: NotificationType;
  title: string;
  body: string;
}> = [
  {
    type: NotificationType.Message,
    title: 'Pesan Baru',
    body: '{{actorName}} mengirimkan pesan kepada Anda.',
  },
  {
    type: NotificationType.Forum,
    title: 'Postingan Baru',
    body: '{{actorName}} membuat postingan baru di forum.',
  },
  {
    type: NotificationType.CommentReply,
    title: 'Balasan Komentar',
    body: '{{actorName}} membalas komentar Anda.',
  },
  {
    type: NotificationType.MoodReminder,
    title: 'Pengingat Mood Tracker',
    body: 'Yuk, luangkan waktu sejenak untuk mencatat perasaan dan mood Anda hari ini.',
  },
];

export async function seedNotificationTemplates(
  source: DataSource,
): Promise<{ created: number; updated: number; skipped: number }> {
  const repo = source.getRepository(NotificationTemplate);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of DEFAULT_NOTIFICATION_TEMPLATES) {
    validateTemplateText(item.type, item.title, item.body);
    const existing = await repo.findOneBy({ type: item.type });

    if (!existing) {
      const template = repo.create({
        type: item.type,
        title: item.title,
        body: item.body,
        revision: 1,
      });
      await repo.save(template);
      console.log(`[+] Seeded notification template: ${item.type}`);
      created++;
    } else if (!existing.title?.trim() || !existing.body?.trim()) {
      existing.title = item.title;
      existing.body = item.body;
      existing.revision = (existing.revision || 0) + 1;
      await repo.save(existing);
      console.log(`[*] Updated empty notification template: ${item.type}`);
      updated++;
    } else {
      console.log(
        `[-] Notification template already configured: ${item.type} (rev ${existing.revision})`,
      );
      skipped++;
    }
  }

  return { created, updated, skipped };
}

