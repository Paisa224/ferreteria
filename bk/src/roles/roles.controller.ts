import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private service: RolesService) {}

  @Get()
  @RequirePermissions('users.manage')
  list() {
    return this.service.list();
  }

  @Get(':id')
  @RequirePermissions('users.manage')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.getRoleDetail(id);
  }

  @Post()
  @RequirePermissions('users.manage')
  create(@Body() dto: CreateRoleDto) {
    return this.service.create(dto.name);
  }

  @Put(':id/permissions')
  @RequirePermissions('users.manage')
  setPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.service.setPermissions(id, dto.permissionKeys);
  }
}
