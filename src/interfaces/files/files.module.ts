import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FilesService } from '../../application/files/files.service';
import { FileRecord } from '../../infrastructure/entities/file-record.entity';
import { S3FileStorageAdapter } from '../../infrastructure/files/s3-file-storage.adapter';
import { FileRecordsRepository } from '../../infrastructure/repositories/file-records.repository';

import { FilesController } from './files.controller';

export const FILE_STORAGE_PORT = Symbol('FILE_STORAGE_PORT');

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([FileRecord])],
  controllers: [FilesController],
  providers: [
    FilesService,
    FileRecordsRepository,
    S3FileStorageAdapter,
    { provide: FILE_STORAGE_PORT, useExisting: S3FileStorageAdapter },
  ],
  exports: [FILE_STORAGE_PORT, FileRecordsRepository],
})
export class FilesModule {}
