import { MemberOtpEmailProcessor } from './member-auth.email.processor';
import { MemberOtp } from '../entity/member-otp.entity';
describe('OTP email worker', () => {
  const data = {
    memberId: 7,
    purpose: 'registration' as const,
    code: '1234',
    codeHash: 'hash',
  };
  const otp = {
    ...data,
    consumedAt: null,
    attempts: 0,
    expiresAt: new Date(Date.now() + 300000),
  };
  /** Creates the worker with mocked boundaries. Returns worker and mail observations. */
  function setup(current: unknown = otp) {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    const db = {
      getRepository: (entity: unknown) => ({
        findOneBy: async () =>
          entity === MemberOtp
            ? current
            : {
                email: 'test@example.test',
                is_suspended: false, memberAuthEnabled: true,
                deleted_at: null,
                verifiedAt: null,
              },
      }),
    };
    return {
      worker: new MemberOtpEmailProcessor(
        db as never,
        { sendMail } as never,
        { get: () => undefined } as never,
      ),
      sendMail,
    };
  }
  it('delivers current OTP and returns a generic retryable SMTP error', async () => {
    const { worker, sendMail } = setup();
    await worker.process({ data } as never);
    expect(sendMail).toHaveBeenCalledTimes(1);
    sendMail.mockRejectedValueOnce(new Error('private SMTP details'));
    await expect(worker.process({ data } as never)).rejects.toThrow(
      'OTP email delivery failed',
    );
  });
  it.each([
    null,
    { ...otp, codeHash: 'replaced' },
    { ...otp, consumedAt: new Date() },
    { ...otp, expiresAt: new Date(0) },
    { ...otp, attempts: 5 },
  ])('skips unusable OTP', async (current) => {
    const { worker, sendMail } = setup(current);
    await worker.process({ data } as never);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
