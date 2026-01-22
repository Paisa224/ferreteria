import {
  ArrayMinSize,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SaleItemDto {
  @IsInt() product_id: number;
  @IsNumber() @Min(0.01) qty: number;
  @IsInt() @Min(0) price: number;
}

class PaymentDto {
  @IsIn(['CASH', 'QR', 'TC', 'TD', 'TRANSFER'])
  method: 'CASH' | 'QR' | 'TC' | 'TD' | 'TRANSFER';

  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateSaleDto {
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  @ArrayMinSize(1)
  items: SaleItemDto[];

  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  @ArrayMinSize(1)
  payments: PaymentDto[];

  @IsOptional() @IsString() customer_name?: string;
  @IsOptional() @IsString() note?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  discount?: number;
}
