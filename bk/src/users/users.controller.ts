import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @RequirePermissions('users.manage')
  list() {
    return this.users.listUsers();
  }

  @Post()
  @RequirePermissions('users.manage')
  create(@Body() dto: CreateUserDto) {
    return this.users.createUser(dto);
  }

  @Get(':id')
  @RequirePermissions('users.manage')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.users.getUser(id);
  }

  @Patch(':id')
  @RequirePermissions('users.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.users.updateUser(id, dto);
  }
}
