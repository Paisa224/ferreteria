import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class SetUserRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  role_names!: string[];
}
