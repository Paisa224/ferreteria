import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class StockMoveDto {
  @IsInt()
  product_id: number;

  @IsIn(['IN', 'OUT', 'ADJUST'])
  type: 'IN' | 'OUT' | 'ADJUST';

  @IsNumber()
  @Min(0)
  qty: number;

  @IsOptional()
  @IsString()
  note?: string;
}
