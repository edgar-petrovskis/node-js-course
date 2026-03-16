import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

import {
  FileContentType,
  FilePurpose,
  FileVisibility,
} from '../../../domain/files/files';

export class PresignFileDto {
  @IsEnum(FilePurpose)
  purpose!: FilePurpose;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsEnum(FileContentType)
  contentType!: FileContentType;

  @IsInt()
  @Min(1)
  size!: number;

  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;
}

export class CompleteFileDto {
  @IsUUID()
  fileId!: string;
}
