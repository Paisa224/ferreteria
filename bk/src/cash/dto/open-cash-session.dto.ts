import { IsInt, IsNumber, Min } from 'class-validator';

export class OpenCashSessionDto {
  @IsInt()
  cash_register_id: number;

  @IsNumber()
  @Min(0)
  opening_amount: number;
}
