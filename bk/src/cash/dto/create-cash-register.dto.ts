import { IsString, MinLength } from 'class-validator';

export class CreateCashRegisterDto {
  @IsString()
  @MinLength(2)
  name: string;
}
