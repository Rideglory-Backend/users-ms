import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from '@rideglory/contracts';
import { Prisma, PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { RpcException } from '@nestjs/microservices';
import { Pool } from 'pg';

@Injectable()
export class UsersService extends PrismaClient implements OnModuleInit {
  private logger = new Logger('Users Service')

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set');
    }
    const pool = new Pool({
      connectionString: url,
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 5_000,
    });
    super({
      adapter: new PrismaPg(pool),
    });

    this.logger.log('Database connected');
  }

  async onModuleInit() {
    await this.$connect();
  }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.user.findUnique({
      where: { email: createUserDto.email },
    });

    // Idempotente y reconciliador: el alta se hace después de crear/validar el
    // usuario en Firebase, así que aquí nunca se rechaza por "email en uso".
    // - Si ya existe activo -> se devuelve tal cual (reintento o usuario que
    //   existía en Firebase pero no aquí).
    // - Si existía borrado lógicamente -> se reactiva con los datos nuevos.
    // - Si no existe -> se crea.
    if (existingUser) {
      if (existingUser.isDeleted) {
        return this.user.update({
          where: { id: existingUser.id },
          data: { ...createUserDto, isDeleted: false },
        });
      }
      return existingUser;
    }

    return this.user.create({
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

  async updateFcmToken(id: string, fcmToken: string) {
    await this.findOne(id);
    return this.user.update({
      where: { id },
      data: { fcmToken },
    });
  }

  async getFcmTokenByEmail(email: string): Promise<string | null> {
    const user = await this.user.findFirst({
      where: { email, isDeleted: false },
      select: { fcmToken: true },
    });
    return user?.fcmToken ?? null;
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.user.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
