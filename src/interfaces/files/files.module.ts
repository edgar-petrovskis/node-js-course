import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FileRecord } from '../../infrastructure/entities/file-record.entity';
import { S3FileStorageAdapter } from '../../infrastructure/files/s3-file-storage.adapter';
import { FileRecordsRepository } from '../../infrastructure/repositories/file-records.repository';

export const FILE_STORAGE_PORT = Symbol('FILE_STORAGE_PORT');

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([FileRecord])],
  providers: [
    FileRecordsRepository,
    S3FileStorageAdapter,
    { provide: FILE_STORAGE_PORT, useExisting: S3FileStorageAdapter },
  ],
  exports: [FILE_STORAGE_PORT, FileRecordsRepository],
})
export class FilesModule {}
