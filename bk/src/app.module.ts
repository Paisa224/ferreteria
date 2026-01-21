import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CashModule } from './cash/cash.module';
import { PosModule } from './pos/pos.module';
import { InventoryModule } from './inventory/inventory.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, CashModule, PosModule, InventoryModule, DashboardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
