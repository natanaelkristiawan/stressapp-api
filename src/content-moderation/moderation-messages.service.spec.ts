import { ServiceUnavailableException } from '@nestjs/common';
import { ModerationMessagesService } from './moderation-messages.service';
import { DEFAULT_MESSAGES, violationType } from './moderation-policy';

describe('moderation message boundaries', () => {
  it('uses the most serious legacy category', () => {
    expect(
      violationType({
        categories: ['profanity', 'sara', 'pornography', 'self_harm'],
      }),
    ).toBe('self_harm');
    expect(violationType({ categories: ['threat', 'pornography'] })).toBe(
      'sexual',
    );
    expect(violationType({ categories: ['profanity', 'sara'] })).toBe('sara');
    expect(violationType({ categories: ['threat'] })).toBe('bullying');
  });

  it.each([
    'invalid',
    '{}',
    JSON.stringify({ ...DEFAULT_MESSAGES, sara: ' ' }),
    JSON.stringify({ ...DEFAULT_MESSAGES, extra: 'invalid' }),
  ])('fails closed for corrupted settings: %s', async (value) => {
    const service = new ModerationMessagesService({
      findOneBy: async () => ({ value }),
    } as never);
    await expect(
      service.forResult({ action: 'reject', type: 'sara' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('does not read messages for safe or pending results', async () => {
    const findOneBy = jest.fn();
    const service = new ModerationMessagesService({ findOneBy } as never);
    expect(
      await service.forResult({ action: 'publish', type: 'safe' }),
    ).toBeNull();
    expect(
      await service.forResult({ action: 'pending', type: 'uncertain' }),
    ).toBeNull();
    expect(findOneBy).not.toHaveBeenCalled();
  });

  it('returns only the configured matching message', async () => {
    const service = new ModerationMessagesService({
      findOneBy: async () => ({ value: JSON.stringify(DEFAULT_MESSAGES) }),
    } as never);
    expect(
      await service.forResult({ action: 'reject', type: 'self_harm' }),
    ).toBe(DEFAULT_MESSAGES.self_harm);
    await expect(
      service.forResult({ action: 'reject', type: 'unrelated' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
