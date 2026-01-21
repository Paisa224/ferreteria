import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { InventoryService } from './inventory.service';
import { StockMoveDto } from './dto/stock-move.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private inv: InventoryService) {}

  @Post('stock/move')
  @RequirePermissions('inventory.manage')
  move(@Body() dto: StockMoveDto, @Req() req: any) {
    return this.inv.createStockMovement(dto, req.user.userId);
  }

  @Get('products/:id/movements')
  @RequirePermissions('inventory.manage')
  movements(
    @Param('id', ParseIntPipe) id: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.inv.listProductMovements(id, from, to, parsedLimit);
  }

  @Get('products/:id/stock')
  @RequirePermissions('inventory.manage')
  stock(@Param('id', ParseIntPipe) id: number) {
    return this.inv.getProductStock(id);
  }
}
