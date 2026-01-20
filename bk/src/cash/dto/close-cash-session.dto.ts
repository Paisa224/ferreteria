import { IsNumber, IsOptional, Min } from 'class-validator';

export class CloseCashSessionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  closing_amount?: number;
}
