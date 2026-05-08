import { Controller, ParseUUIDPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserPayloadDto } from '@rideglory/contracts';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @MessagePattern('createUser')
  create(@Payload() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @MessagePattern('findOneUser')
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @MessagePattern('findUserByEmail')
  findByEmail(@Payload('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @MessagePattern('updateUser')
  update(@Payload() updateUserDto: UpdateUserPayloadDto) {
    const { id, ...data } = updateUserDto;
    return this.usersService.update(id, data);
  }

  @MessagePattern('removeUser')
  remove(@Payload('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
