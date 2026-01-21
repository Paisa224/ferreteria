import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('summary')
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.summary({ from, to });
  }
}
