import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CashService } from './cash.service';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';

@Controller('cash')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashController {
  constructor(private cash: CashService) {}

  @Post('registers')
  @RequirePermissions('cash.manage')
  createRegister(@Body() dto: CreateCashRegisterDto) {
    return this.cash.createRegister(dto);
  }

  @Get('registers')
  @RequirePermissions('cash.manage')
  listRegisters() {
    return this.cash.listRegisters();
  }

  @Post('sessions/open')
  @RequirePermissions('cash.open')
  openSession(@Body() dto: OpenCashSessionDto, @Req() req: any) {
    return this.cash.openSession(dto, req.user.userId);
  }

  @Get('sessions/current')
  @RequirePermissions('cash.open')
  currentSessions() {
    return this.cash.currentOpenSessions();
  }

  @Post('sessions/:id/close')
  @RequirePermissions('cash.close')
  closeSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseCashSessionDto,
    @Req() req: any,
  ) {
    return this.cash.closeSession(id, dto, req.user.userId);
  }
}
