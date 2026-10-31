import { EntityManager } from 'typeorm';
import {
  ActivityNotificationType,
  NotificationEvent,
} from '../entity/notification-event.entity';

/** Persists only a source reference in the source transaction; never queues private text. */
export async function recordNotificationEvent(
  manager: EntityManager,
  type: ActivityNotificationType,
  sourceId: number,
): Promise<void> {
  await manager.insert(NotificationEvent, {
    key: `${type}:${sourceId}`,
    type,
    sourceId,
    retryAt: new Date(),
    completedAt: null,
    snapshot: null,
    failureCode: null,
  });
}
