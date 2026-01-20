import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() barcode?: string;

  @IsString() name: string;
  @IsOptional() @IsString() unit?: string;

  @IsNumber() @Min(0) cost: number;
  @IsNumber() @Min(0) price: number;

  @IsOptional() @IsBoolean() is_active?: boolean;
}
