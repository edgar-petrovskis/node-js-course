import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  FILE_EXTENSION_BY_CONTENT_TYPE,
  FilePurpose,
  FileStatus,
} from '../../domain/files/files';
import { Role } from '../../domain/users/role';
import { FileRecordsRepository } from '../../infrastructure/repositories/file-records.repository';
import { FILE_STORAGE_PORT } from '../../interfaces/files/files.module';

import type { FileStoragePort } from './file-storage.port';
import type {
  CompleteFileInput,
  CompleteFileResult,
  FileActor,
  PresignFileInput,
  PresignFileResult,
} from './files.types';

const PRESIGN_TTL_SECONDS = 15 * 60;

@Injectable()
export class FilesService {
  constructor(
    private readonly fileRecordsRepository: FileRecordsRepository,
    @Inject(FILE_STORAGE_PORT)
    private readonly fileStoragePort: FileStoragePort,
  ) {}

  async presign(
    actor: FileActor,
    input: PresignFileInput,
  ): Promise<PresignFileResult> {
    const ext = FILE_EXTENSION_BY_CONTENT_TYPE[input.contentType];
    if (!ext) throw new BadRequestException('Unsupported contentType');

    if (!Number.isInteger(input.size) || input.size <= 0) {
      throw new BadRequestException('size must be a positive integer');
    }

    let entityId = actor.id;
    let keyPrefix = `users/${actor.id}/avatars`;

    if (input.purpose === FilePurpose.PRODUCT_IMAGE) {
      if (actor.role !== Role.ADMIN) {
        throw new ForbiddenException('Only ADMIN can presign PRODUCT_IMAGE');
      }
      if (!input.entityId) {
        throw new BadRequestException('entityId is required for PRODUCT_IMAGE');
      }
      entityId = input.entityId;
      keyPrefix = `products/${entityId}/images`;
    }

    const key = `${keyPrefix}/${randomUUID()}.${ext}`;
    const expiresAt = new Date(Date.now() + PRESIGN_TTL_SECONDS * 1000);

    const record = await this.fileRecordsRepository.createPending({
      ownerId: actor.id,
      purpose: input.purpose,
      entityId,
      key,
      contentType: input.contentType,
      size: input.size,
      visibility: input.visibility,
      expiresAt,
    });

    const { uploadUrl } = await this.fileStoragePort.presignPut({
      key,
      contentType: input.contentType,
      expiresInSeconds: PRESIGN_TTL_SECONDS,
    });

    return {
      fileId: record.id,
      key: record.key,
      uploadUrl,
      contentType: input.contentType,
    };
  }

  async complete(
    actor: Pick<FileActor, 'id'>,
    input: CompleteFileInput,
  ): Promise<CompleteFileResult> {
    const record = await this.fileRecordsRepository.findById(input.fileId);

    if (!record) throw new NotFoundException('File record not found');
    if (record.ownerId !== actor.id) {
      throw new ForbiddenException('File does not belong to current user');
    }

    if (record.status === FileStatus.READY) {
      return { fileId: record.id, status: record.status };
    }

    const switchedToReady = await this.fileRecordsRepository.markReady(
      record.id,
    );
    if (!switchedToReady) {
      throw new BadRequestException('File status transition failed');
    }

    return { fileId: record.id, status: FileStatus.READY };
  }
}
