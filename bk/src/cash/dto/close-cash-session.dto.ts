import { IsInt, IsOptional, Min } from 'class-validator';

export class CloseCashSessionDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  closing_amount?: number;
}
