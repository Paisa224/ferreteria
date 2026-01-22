import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequireAnyPermissions } from '../auth/require-any-permissions.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('summary')
  @RequireAnyPermissions('dashboard.view', 'users.manage')
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.summary({ from, to });
  }
}