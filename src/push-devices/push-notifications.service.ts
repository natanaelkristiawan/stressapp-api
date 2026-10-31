import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { DataSource } from 'typeorm';
import { Member } from '../entity/user-mimate.entity';
import { MemberAuthService } from '../member-auth/member-auth.service';
import { PushDevicesService } from './push-devices.service';

const FIREBASE_APP_NAME = 'temu-push';
const FAILURE_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/mismatched-credential',
  'messaging/third-party-auth-error',
  'messaging/server-unavailable',
  'messaging/internal-error',
  'messaging/quota-exceeded',
  'messaging/invalid-argument',
  'messaging/authentication-error',
  'messaging/invalid-payload',
  'messaging/invalid-options',
  'messaging/message-rate-exceeded',
  'messaging/device-message-rate-exceeded',
  'app/invalid-credential',
  'app/network-error',
]);

/** Narrows untrusted SDK response objects without exposing their messages or request data. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/** Returns only fixed diagnostic codes, including Google reasons hidden behind SDK unknown-error. */
export function pushFailureCode(
  error: unknown,
  fallback = 'messaging/unknown-error',
): string {
  if (!isRecord(error)) {
    return fallback;
  }
  const httpResponse = isRecord(error.httpResponse) ? error.httpResponse : null;
  const body =
    httpResponse && isRecord(httpResponse.data) ? httpResponse.data : null;
  const providerError = body && isRecord(body.error) ? body.error : null;
  const details =
    providerError && Array.isArray(providerError.details)
      ? providerError.details
      : [];

  for (const detail of details) {
    if (
      !isRecord(detail) ||
      detail['@type'] !== 'type.googleapis.com/google.rpc.ErrorInfo'
    ) {
      continue;
    }
    if (detail.reason === 'SERVICE_DISABLED') {
      return 'messaging/api-disabled';
    }
    if (
      detail.reason === 'IAM_PERMISSION_DENIED' ||
      detail.reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT'
    ) {
      return 'messaging/permission-denied';
    }
    if (detail.reason === 'CREDENTIALS_MISSING') {
      return 'messaging/authentication-error';
    }
  }
  if (typeof error.code === 'string' && FAILURE_CODES.has(error.code)) {
    return error.code;
  }
  if (httpResponse?.status === 401) {
    return 'messaging/authentication-error';
  }
  if (httpResponse?.status === 403) {
    return 'messaging/permission-denied';
  }
  return fallback;
}

@Injectable()
export class PushNotificationsService {
  /** Reuses registered devices, live member sessions and existing Redis request limits. */
  constructor(
    private readonly devices: PushDevicesService,
    private readonly memberAuth: MemberAuthService,
    private readonly config: ConfigService,
    @InjectDataSource('mimate') private readonly dataSource: DataSource,
  ) {}

  /** Reports configuration presence only; actual credential validity is checked when Firebase is called. */
  status() {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID') || '';
    const hasCredentials = !!this.config.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
    );
    const validProjectId = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId);
    return { configured: validProjectId && hasCredentials, projectId };
  }

  /** Lazily initializes the server SDK; missing private credentials never prevent API startup. */
  private messaging() {
    const status = this.status();
    if (!status.configured) {
      throw new ServiceUnavailableException(
        'Configure FIREBASE_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS on the API server first.',
      );
    }
    try {
      const app =
        getApps().find((app) => app.name === FIREBASE_APP_NAME) ??
        initializeApp(
          { projectId: status.projectId, credential: applicationDefault() },
          FIREBASE_APP_NAME,
        );
      return getMessaging(app);
    } catch {
      throw new ServiceUnavailableException(
        'Firebase Admin credentials could not be loaded. Check the API server configuration.',
      );
    }
  }

  /** Sends one fixed test message to one member's live FCM installations. Returns provider acceptance counts, never device tokens. */
  async sendTest(email: string, adminId: number) {
    await this.memberAuth.limit('push-test-admin', String(adminId), 5, 60);
    await this.memberAuth.limit('push-test-member', email, 5, 60);

    const member = await this.dataSource
      .getRepository(Member)
      .findOneBy({ email, memberAuthEnabled: true });
    if (
      !member ||
      member.deleted_at ||
      member.is_suspended ||
      !member.verifiedAt
    ) {
      throw new NotFoundException(
        'No active, verified mobile member matches this email.',
      );
    }
    const recipients = await this.devices.recipients(member.id);
    const fcmDevices = recipients.filter((device) => device.provider === 'fcm');
    if (fcmDevices.length === 0) {
      throw new BadRequestException(
        'This member has no active Android/web push registrations. Log in on the app and allow notifications first.',
      );
    }

    return this.sendToDevices(
      recipients,
      {
        title: 'Temu Sobat — Tes notifikasi',
        body: 'Ini adalah notifikasi uji coba dari CMS Temu Sobat.',
      },
      { type: 'test-notification' },
    );
  }

  /** Sends a saved activity snapshot to eligible live installations, without automatic retries. */
  async sendNotification(
    memberId: number,
    title: string,
    body: string,
    notificationId: number,
    category: string,
  ) {
    const recipients = await this.devices.recipients(memberId);
    return this.sendToDevices(
      recipients,
      { title, body },
      {
        type: 'member-notification',
        notificationId: String(notificationId),
        category,
      },
    );
  }

  /** Shares bounded multicast delivery and safe diagnostic aggregation with the CMS test. */
  private async sendToDevices(
    recipients: Awaited<ReturnType<PushDevicesService['recipients']>>,
    notification: { title: string; body: string },
    data: Record<string, string>,
  ) {
    const fcmDevices = recipients.filter((device) => device.provider === 'fcm');
    const messaging = fcmDevices.length ? this.messaging() : null;
    let accepted = 0;
    let failed = 0;
    const failures = new Map<string, number>();

    // Firebase permits up to 500 recipients per multicast call.
    for (let offset = 0; offset < fcmDevices.length; offset += 500) {
      const batch = fcmDevices.slice(offset, offset + 500);
      try {
        const result = await messaging.sendEachForMulticast({
          tokens: batch.map((device) => device.token),
          notification,
          data,
          android: { notification: { channelId: 'default' } },
        });
        accepted += result.successCount;
        failed += result.failureCount;
        for (const response of result.responses) {
          if (response.success) {
            continue;
          }
          const code = pushFailureCode(response.error);
          failures.set(code, (failures.get(code) || 0) + 1);
        }
      } catch (error) {
        // A failed/ambiguous batch is not automatically resent: that can duplicate notifications.
        failed += batch.length;
        const code = pushFailureCode(error, 'messaging/request-failed');
        failures.set(code, (failures.get(code) || 0) + batch.length);
      }
    }

    return {
      attempted: fcmDevices.length,
      accepted,
      failed,
      skipped: recipients.length - fcmDevices.length,
      failures: Array.from(failures, ([code, count]) => ({ code, count })),
    };
  }
}
