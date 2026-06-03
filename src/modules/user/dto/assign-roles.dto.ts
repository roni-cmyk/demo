import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRolesDto {
  @ApiProperty({ type: [String], example: ['ADMIN', 'USER'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  roles: string[];
}
