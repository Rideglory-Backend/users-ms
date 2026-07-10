import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const mockUsersService = {
  create: jest.fn(),
  findOne: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  updateFcmToken: jest.fn(),
  getFcmTokenByEmail: jest.fn(),
  remove: jest.fn(),
  hardDelete: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('hardDelete — MessagePattern hardDeleteUser', () => {
    it('delegates to usersService.hardDelete with the given id', async () => {
      mockUsersService.hardDelete.mockResolvedValue({ id: 'user-1' });

      const result = await controller.hardDelete('user-1');

      expect(mockUsersService.hardDelete).toHaveBeenCalledWith('user-1');
      expect(mockUsersService.remove).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'user-1' });
    });
  });

  describe('remove — regression (removeUser MessagePattern must remain soft-delete)', () => {
    it('delegates to usersService.remove, not hardDelete', async () => {
      mockUsersService.remove.mockResolvedValue({ id: 'user-2', isDeleted: true });

      const result = await controller.remove('user-2');

      expect(mockUsersService.remove).toHaveBeenCalledWith('user-2');
      expect(mockUsersService.hardDelete).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'user-2', isDeleted: true });
    });
  });
});
