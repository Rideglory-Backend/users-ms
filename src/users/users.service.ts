import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from '@rideglory/contracts';
import { Prisma, PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class UsersService extends PrismaClient implements OnModuleInit {
  private logger = new Logger('Users Service')

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set');
    }
    super({
      adapter: new PrismaPg({ connectionString: url }),
    });

    this.logger.log('Database connected');
  }

  async onModuleInit() {
    await this.$connect();
  }

  async create(createUserDto: CreateUserDto) {
    await this.ensureEmailIsAvailable(createUserDto.email);

    return await this.user.create({
      data: createUserDto,
    });
  }

  async findOne(id: string) {
    const user = await this.user.findFirst({
      where: { id, isDeleted: false },
    });

    if (!user) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `User with id ${id} not found`,
      });
    }

    return user;
  }

  async findByEmail(email: string) {
    const user = await this.user.findFirst({
      where: { email, isDeleted: false },
    });

    if (!user) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `User with email ${email} not found`,
      });
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if ('email' in updateUserDto) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Email cannot be updated',
      });
    }

    await this.findOne(id);

    return this.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.user.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  private async ensureEmailIsAvailable(email: string) {
    const existingUser = await this.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new RpcException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'User could not be created',
      });
    }
  }
}
