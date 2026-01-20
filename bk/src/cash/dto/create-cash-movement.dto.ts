import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCashMovementDto {
  @IsIn(['IN', 'OUT'])
  type: 'IN' | 'OUT';

  @IsString()
  concept: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  reference?: string;
}
