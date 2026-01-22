import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

function trimToNull(v: unknown) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value ?? '').trim())
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimToNull(value))
  sku?: string | null;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimToNull(value))
  barcode?: string | null;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimToNull(value))
  unit?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  track_stock?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
