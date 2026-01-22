import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequireAnyPermissions } from '../auth/require-any-permissions.decorator';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CashService } from './cash.service';
import { CashCountDto } from './dto/cash-count.dto';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { UpdateCashRegisterDto } from './dto/update-cash-register.dto';

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
  @RequireAnyPermissions('cash.manage', 'cash.open', 'cash.count', 'cash.close')
  listRegisters() {
    return this.cash.listRegisters();
  }

  @Patch('registers/:id')
  @RequirePermissions('cash.manage')
  updateRegister(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCashRegisterDto,
  ) {
    return this.cash.updateRegister(id, dto);
  }

  @Post('sessions/open')
  @RequirePermissions('cash.open')
  openSession(@Body() dto: OpenCashSessionDto, @Req() req: any) {
    return this.cash.openSession(dto, req.user.userId);
  }

  @Get('sessions/current')
  @RequireAnyPermissions('cash.manage', 'cash.open', 'cash.count', 'cash.close')
  currentSessions() {
    return this.cash.currentOpenSessions();
  }

  @Get('sessions/my-open')
  @RequireAnyPermissions('cash.open', 'cash.count', 'cash.close')
  myOpen(@Req() req: any) {
    return this.cash.myOpenSession(req.user.userId);
  }

  @Get('sessions/:id')
  @RequireAnyPermissions('cash.manage', 'cash.open', 'cash.count', 'cash.close')
  getSession(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.cash.getSessionById(id, req.user.userId);
  }

  @Get('sessions/:id/summary')
  @RequireAnyPermissions('cash.manage', 'cash.open', 'cash.count', 'cash.close')
  summary(@Param('id', ParseIntPipe) id: number) {
    return this.cash.sessionSummary(id);
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

  @Post('sessions/:id/movements')
  @RequirePermissions('cash.move')
  addMovement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCashMovementDto,
    @Req() req: any,
  ) {
    return this.cash.addMovement(id, dto, req.user.userId);
  }

  @Get('sessions/:id/movements')
  @RequireAnyPermissions(
    'cash.manage',
    'cash.open',
    'cash.move',
    'cash.count',
    'cash.close',
  )
  listMovements(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.cash.listMovements(id, req.user.userId);
  }

  @Post('sessions/:id/count')
  @RequirePermissions('cash.count')
  count(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CashCountDto,
    @Req() req: any,
  ) {
    return this.cash.countCash(id, dto, req.user.userId);
  }

  @Get('sessions/:id/counts')
  @RequireAnyPermissions('cash.manage', 'cash.open', 'cash.count', 'cash.close')
  listCounts(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.cash.listCounts(id, req.user.userId);
  }

  @Get('denominations')
  @RequireAnyPermissions('cash.manage', 'cash.open', 'cash.count', 'cash.close')
  denominations() {
    return [1000, 2000, 5000, 10000, 20000, 50000, 100000];
  }
}
