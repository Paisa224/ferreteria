import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PosService } from './pos.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PosController {
  constructor(private pos: PosService) {}

  @Post('products')
  @RequirePermissions('inventory.manage')
  createProduct(@Body() dto: CreateProductDto) {
    return this.pos.createProduct(dto);
  }

  @Get('products')
  @RequirePermissions('inventory.manage')
  listProducts(@Query('q') q?: string) {
    return this.pos.listProducts(q);
  }

  @Patch('products/:id')
  @RequirePermissions('inventory.manage')
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.pos.updateProduct(id, dto);
  }

  @Post('pos/sales')
  @RequirePermissions('pos.sell')
  createSale(@Body() dto: CreateSaleDto, @Req() req: any) {
    return this.pos.createSale(dto, req.user.userId);
  }

  @Get('pos/sales/:id')
  @RequirePermissions('pos.sell')
  getSale(@Param('id', ParseIntPipe) id: number) {
    return this.pos.getSale(id);
  }
}
