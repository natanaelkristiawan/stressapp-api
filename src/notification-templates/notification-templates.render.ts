import { BadRequestException } from '@nestjs/common';
import { NotificationType } from '../entity/member-notification.entity';

export const ACTOR_NAME_LIMIT = 100;

/** Declares the only placeholders supported by each fixed notification category. */
export function templatePlaceholders(type: NotificationType): string[] {
  switch (type) {
    case NotificationType.Message:
    case NotificationType.Forum:
    case NotificationType.CommentReply:
      return ['actorName'];
    case NotificationType.MoodReminder:
      return [];
    default:
      throw new BadRequestException('Unsupported notification type.');
  }
}

/** Validates plain text, exact placeholder syntax and worst-case rendered length. */
export function validateTemplateText(
  type: NotificationType,
  title: string,
  body: string,
): void {
  const allowed = templatePlaceholders(type);
  for (const [text, limit] of [
    [title, 160],
    [body, 1000],
  ] as const) {
    if (
      typeof text !== 'string' ||
      !text.trim() ||
      text.length > limit ||
      /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)
    ) {
      throw new BadRequestException(
        'Notification text must be bounded, nonempty plain text.',
      );
    }
    const remainder = text.replace(
      /\{\{([A-Za-z]+)\}\}/g,
      (_match, name: string) => {
        if (!allowed.includes(name)) {
          throw new BadRequestException(
            'Unsupported notification placeholder.',
          );
        }
        return '';
      },
    );
    if (/[{}]/u.test(remainder)) {
      throw new BadRequestException(
        'Use exact supported {{placeholder}} syntax.',
      );
    }
    const expanded = text.replace(
      /\{\{actorName\}\}/g,
      'x'.repeat(ACTOR_NAME_LIMIT),
    );
    if (expanded.length > limit) {
      throw new BadRequestException(
        'Notification text exceeds the rendered length limit.',
      );
    }
  }
}

/** Renders once as plain text; values cannot introduce more template expressions. */
export function renderTemplateText(
  type: NotificationType,
  title: string,
  body: string,
  values: unknown,
) {
  validateTemplateText(type, title, body);
  if (typeof values !== 'object' || values === null || Array.isArray(values)) {
    throw new BadRequestException('Notification variables must be an object.');
  }
  const allowed = templatePlaceholders(type);
  if (Object.keys(values).some((key) => !allowed.includes(key))) {
    throw new BadRequestException('Unsupported notification variable.');
  }
  let actorName: string | undefined;
  if ('actorName' in values) {
    if (
      typeof values.actorName !== 'string' ||
      !values.actorName.trim() ||
      values.actorName.length > ACTOR_NAME_LIMIT ||
      /[\u0000-\u001f\u007f]/u.test(values.actorName)
    ) {
      throw new BadRequestException('Invalid notification actor name.');
    }
    actorName = values.actorName;
  }
  if (
    (title.includes('{{actorName}}') || body.includes('{{actorName}}')) &&
    actorName === undefined
  ) {
    throw new BadRequestException(
      'Notification actorName is required by this template.',
    );
  }
  return {
    title: title.replace(/\{\{actorName\}\}/g, () => actorName ?? ''),
    body: body.replace(/\{\{actorName\}\}/g, () => actorName ?? ''),
  };
}
