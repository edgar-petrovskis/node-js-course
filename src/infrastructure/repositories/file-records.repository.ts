import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import {
  FileRecord,
  FilePurpose,
  FileStatus,
  FileVisibility,
} from '../entities/file-record.entity';

export type CreatePendingFileRecordInput = {
  ownerId: string;
  purpose: FilePurpose;
  entityId: string;
  key: string;
  contentType: string;
  size: number;
  visibility: FileVisibility;
  expiresAt: Date;
};

@Injectable()
export class FileRecordsRepository {
  constructor(
    @InjectRepository(FileRecord)
    private readonly fileRecordsRepository: Repository<FileRecord>,
  ) {}

  createPending(input: CreatePendingFileRecordInput): Promise<FileRecord> {
    return this.fileRecordsRepository.save(
      this.fileRecordsRepository.create({
        ownerId: input.ownerId,
        purpose: input.purpose,
        entityId: input.entityId,
        key: input.key,
        contentType: input.contentType,
        size: input.size,
        status: FileStatus.PENDING,
        visibility: input.visibility,
        expiresAt: input.expiresAt,
      }),
    );
  }

  findById(id: string): Promise<FileRecord | null> {
    return this.fileRecordsRepository.findOne({ where: { id } });
  }

  async markReady(id: string): Promise<boolean> {
    const result = await this.fileRecordsRepository.update(
      { id, status: FileStatus.PENDING },
      { status: FileStatus.READY },
    );

    return (result.affected ?? 0) > 0;
  }
}
