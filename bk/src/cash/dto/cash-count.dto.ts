import {
  ArrayMinSize,
  IsInt,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DenomDto {
  @IsNumber()
  @Min(0)
  denom_value: number;

  @IsInt()
  @Min(0)
  qty: number;
}

export class CashCountDto {
  @ValidateNested({ each: true })
  @Type(() => DenomDto)
  @ArrayMinSize(1)
  denominations: DenomDto[];
}
