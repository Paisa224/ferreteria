import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

function trimToNull(v: unknown) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export class CreateProductDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimToNull(value))
  sku?: string | null;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimToNull(value))
  barcode?: string | null;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value ?? '').trim())
  name: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimToNull(value))
  unit?: string | null;

  @IsInt()
  @Min(0)
  cost: number;

  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsBoolean()
  track_stock?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
