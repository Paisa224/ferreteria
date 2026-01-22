import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCashMovementDto {
  @IsIn(['IN', 'OUT'])
  type: 'IN' | 'OUT';

  @IsString()
  concept: string;

  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  reference?: string;
}
