import 'reflect-metadata';

/**
 * Unit tests for UsersService.hardDelete (eliminacion-cuenta-phase-01) plus
 * an explicit regression test for remove() (soft-delete), which must stay
 * untouched.
 *
 * We mock PrismaClient and the Prisma PG adapter to avoid any real DB
 * connection or env-var requirement.
 */

process.env.DATABASE_URL = 'postgresql://test';

const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockConnect = jest.fn().mockResolvedValue(undefined);

class MockPrismaClientKnownRequestError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('../generated/prisma', () => ({
  PrismaClient: class {
    user = {
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDelete,
    };
    $connect = mockConnect;
  },
  Prisma: {
    PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
  },
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({})),
}));

import { RpcException } from '@nestjs/microservices';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService();
  });

  describe('hardDelete', () => {
    it('permanently deletes the user via prisma.user.delete when it exists', async () => {
      mockFindFirst.mockResolvedValue({ id: 'user-1', isDeleted: false });
      mockDelete.mockResolvedValue({ id: 'user-1' });

      const result = await service.hardDelete('user-1');

      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'user-1' });
    });

    it('is an idempotent no-op when prisma.user.delete throws P2025 (record already deleted), without calling findFirst', async () => {
      mockDelete.mockRejectedValue(
        new MockPrismaClientKnownRequestError('An operation failed because it depends on one or more records that were required but not found.', 'P2025'),
      );

      const result = await service.hardDelete('missing-id');

      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'missing-id' } });
      expect(mockFindFirst).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('rethrows non-P2025 errors from prisma.user.delete', async () => {
      const dbDown = new Error('connection refused');
      mockDelete.mockRejectedValue(dbDown);

      await expect(service.hardDelete('user-1')).rejects.toThrow(dbDown);
    });
  });

  describe('remove — regression (soft-delete must remain untouched)', () => {
    it('sets isDeleted: true via prisma.user.update, never calls delete', async () => {
      mockFindFirst.mockResolvedValue({ id: 'user-2', isDeleted: false });
      mockUpdate.mockResolvedValue({ id: 'user-2', isDeleted: true });

      const result = await service.remove('user-2');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { isDeleted: true },
      });
      expect(mockDelete).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'user-2', isDeleted: true });
    });

    it('throws RpcException 404 when the user does not exist', async () => {
      mockFindFirst.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(RpcException);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
