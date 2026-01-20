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
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CashCountDto } from './dto/cash-count.dto';

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

  @Get('sessions/my-open')
  @RequirePermissions('cash.open')
  myOpen(@Req() req: any) {
    return this.cash.myOpenSession(req.user.userId);
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

  @Get('sessions/:id/summary')
  @RequirePermissions('cash.open')
  summary(@Param('id', ParseIntPipe) id: number) {
    return this.cash.sessionSummary(id);
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

  @Get('sessions/:id/movements')
  @RequirePermissions('cash.open')
  listMovements(@Param('id', ParseIntPipe) id: number) {
    return this.cash.listMovements(id);
  }

  @Get('sessions/:id/counts')
  @RequirePermissions('cash.open')
  listCounts(@Param('id', ParseIntPipe) id: number) {
    return this.cash.listCounts(id);
  }

  @Get('denominations')
  @RequirePermissions('cash.open')
  denominations() {
    return [1000, 2000, 5000, 10000, 20000, 50000, 100000];
  }
}
