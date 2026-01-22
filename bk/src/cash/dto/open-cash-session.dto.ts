import { IsInt, Min } from 'class-validator';

export class OpenCashSessionDto {
  @IsInt()
  cash_register_id: number;

  @IsInt()
  @Min(0)
  opening_amount: number;
}
