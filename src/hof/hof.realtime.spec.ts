import { HofService } from './hof.service';
import { HofController } from './hof.controller';
import { periodOf } from '../leaderboard/leaderboard.rules';
describe('Realtime HOF contract', () => {
  const repository = () => {
    const repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      manager: {
        transaction: jest.fn(),
        getRepository: jest
          .fn()
          .mockReturnValue({ find: jest.fn().mockResolvedValue([]) }),
      },
    };
    repo.manager.transaction.mockImplementation(async (_isolation, work) =>
      work({ getRepository: () => repo }),
    );
    return repo;
  };
  it('falls back only to the current GMT+8 period and marks missing data unavailable', async () => {
    const repo = repository();
    const service = new HofService(
      repo as any,
      {
        readsEnabled: true,
        read: jest.fn().mockRejectedValue(new Error('Redis down')),
      } as any,
    );
    const result = await service.getRealtime(128);
    const [year, month] = periodOf().split('-').map(Number);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { year, month, category: 'Paling Eksis' },
      }),
    );
    expect(result).toMatchObject({
      period: periodOf(),
      source: 'unavailable',
      stale: true,
      top: [],
      me: { rank: null, ranked: false, eligible: null },
    });
  });
  it('returns personal ranking outside top 5 and loads only required profiles', async () => {
    const repo = repository();
    const read = jest.fn().mockResolvedValue({
      top: [{ memberId: 2, point: 100, rank: 1 }],
      me: { point: 25, rank: 128, ranked: true },
      updatedAt: '2026-10-09T00:00:00Z',
    });
    const service = new HofService(
      repo as any,
      { readsEnabled: true, read } as any,
    );
    const result = await service.getRealtime(999, 'pendatang-terbaik');
    expect(read).toHaveBeenCalledWith(periodOf(), 'Pendatang Terbaik', 999);
    expect(result).toMatchObject({
      source: 'redis',
      stale: false,
      updatedAt: '2026-10-09T00:00:00Z',
      me: { point: 25, rank: 128, eligible: true },
    });
    expect(repo.find).not.toHaveBeenCalled();
    expect(repo.manager.getRepository).toHaveBeenCalledTimes(1);
  });
  it('takes personal member identity from authentication and rejects missing identity', async () => {
    const service = { getRealtime: jest.fn().mockResolvedValue({}) };
    const controller = new HofController(service as any);
    await expect(controller.getRealtime({}, {})).rejects.toThrow(
      'Missing or invalid token',
    );
    await controller.getRealtime(
      { userData: { id: 123 } },
      { category: 'paling-eksis' },
    );
    expect(service.getRealtime).toHaveBeenCalledWith(123, 'paling-eksis');
  });
  it('exposes public top 5 without a personal ranking', async () => {
    const service = {
      getRealtime: jest
        .fn()
        .mockResolvedValue({ top: [], me: { rank: 1, point: 99 } }),
    };
    const result = await new HofController(service as any).getRealtimePublic({
      category: 'tampil-kembali',
    });
    expect(service.getRealtime).toHaveBeenCalledWith(0, 'tampil-kembali');
    expect(result.data.me).toBeNull();
  });
});
