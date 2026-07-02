import 'reflect-metadata';

/**
 * Unit tests for UsersService.acceptMedicalConsent().
 */

const mockUpdate = jest.fn();
const mockFindFirst = jest.fn();
const mockConnect = jest.fn().mockResolvedValue(undefined);

jest.mock('../generated/prisma', () => ({
  PrismaClient: class {
    user = {
      findFirst: mockFindFirst,
      update: mockUpdate,
    };
    $connect = mockConnect;
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

describe('UsersService — acceptMedicalConsent()', () => {
  let service: UsersService;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test';
    mockFindFirst.mockReset();
    mockUpdate.mockReset();
    service = new UsersService();
  });

  it('persists medicalConsentAcceptedAt and returns it', async () => {
    const acceptedAt = new Date('2026-06-30T12:00:00Z');
    mockFindFirst.mockResolvedValue({
      id: 'user-1',
      email: 'jane@example.com',
    });
    mockUpdate.mockResolvedValue({
      id: 'user-1',
      medicalConsentAcceptedAt: acceptedAt,
    });

    const result = await service.acceptMedicalConsent('jane@example.com', 'v1');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { medicalConsentAcceptedAt: expect.any(Date) as Date },
    });
    expect(result).toEqual({ medicalConsentAcceptedAt: acceptedAt });
  });

  it('throws NOT_FOUND when the user does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      service.acceptMedicalConsent('missing@example.com', 'v1'),
    ).rejects.toBeInstanceOf(RpcException);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// findByEmail() — medicalConsentAcceptedAt passthrough (QA case 4.3)
// ----------------------------------------------------------------

describe('UsersService — findByEmail() medicalConsentAcceptedAt passthrough', () => {
  let service: UsersService;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test';
    mockFindFirst.mockReset();
    service = new UsersService();
  });

  it('CASE 4.3 — returns medicalConsentAcceptedAt: null without error for a user that never accepted consent', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'user-1',
      email: 'jane@example.com',
      isDeleted: false,
      medicalConsentAcceptedAt: null,
    });

    const result = await service.findByEmail('jane@example.com');

    expect(result).toHaveProperty('medicalConsentAcceptedAt', null);
  });
});
