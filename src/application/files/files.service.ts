import { randomUUID } from 'node:crypto';

import { DataSource } from 'typeorm';

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
import { FileRecord } from '../../infrastructure/entities/file-record.entity';
import { Product } from '../../infrastructure/entities/product.entity';
import { User } from '../../infrastructure/entities/user.entity';
import { FileRecordsRepository } from '../../infrastructure/repositories/file-records.repository';
import { FILE_STORAGE_PORT } from '../../interfaces/files/files.tokens';

import type { FileStoragePort } from './file-storage.port';
import type {
  CompleteFileArgs,
  CompleteFileResult,
  FileActor,
  PresignFileArgs,
  PresignFileResult,
  ViewFileArgs,
  ViewFileResult,
} from './files.types';

const PRESIGN_TTL_SECONDS = 15 * 60;
const VIEW_TTL_SECONDS = 5 * 60;

@Injectable()
export class FilesService {
  constructor(
    private readonly fileRecordsRepository: FileRecordsRepository,
    private readonly dataSource: DataSource,
    @Inject(FILE_STORAGE_PORT)
    private readonly fileStoragePort: FileStoragePort,
  ) {}

  async presign(
    actor: FileActor,
    args: PresignFileArgs,
  ): Promise<PresignFileResult> {
    this.validatePresignArgs(args);
    this.validatePurposeAccess(actor, args);
    const { entityId, keyPrefix } = this.resolveTarget(actor, args);
    const key = this.buildKey(keyPrefix, args);
    const expiresAt = new Date(Date.now() + PRESIGN_TTL_SECONDS * 1000);

    const record = await this.fileRecordsRepository.createPending({
      ownerId: actor.id,
      purpose: args.purpose,
      entityId,
      key,
      contentType: args.contentType,
      size: args.size,
      visibility: args.visibility,
      expiresAt,
    });

    const { uploadUrl } = await this.fileStoragePort.presignPut({
      key,
      contentType: args.contentType,
      expiresInSeconds: PRESIGN_TTL_SECONDS,
    });

    return {
      fileId: record.id,
      key: record.key,
      uploadUrl,
      contentType: args.contentType,
    };
  }

  async complete(
    actor: Pick<FileActor, 'id'>,
    args: CompleteFileArgs,
  ): Promise<CompleteFileResult> {
    const record = await this.fileRecordsRepository.findById(args.fileId);

    if (!record) throw new NotFoundException('File record not found');
    if (record.ownerId !== actor.id) {
      throw new ForbiddenException('File does not belong to current user');
    }

    if (record.status === FileStatus.READY) {
      return { fileId: record.id, status: record.status };
    }

    await this.dataSource.transaction(async (manager) => {
      const switchedToReady = await manager.update(
        FileRecord,
        { id: record.id, status: FileStatus.PENDING },
        { status: FileStatus.READY },
      );
      if ((switchedToReady.affected ?? 0) === 0) {
        throw new BadRequestException('File status transition failed');
      }

      if (record.purpose === FilePurpose.USER_AVATAR) {
        const updatedUser = await manager.update(
          User,
          { id: record.entityId },
          { avatarFileId: record.id },
        );
        if ((updatedUser.affected ?? 0) === 0) {
          throw new NotFoundException('User not found for avatar binding');
        }
        return;
      }

      if (record.purpose === FilePurpose.PRODUCT_IMAGE) {
        const updatedProduct = await manager.update(
          Product,
          { id: record.entityId },
          { imageFileId: record.id },
        );
        if ((updatedProduct.affected ?? 0) === 0) {
          throw new NotFoundException('Product not found for image binding');
        }
        return;
      }

      throw new BadRequestException('Unsupported file purpose');
    });

    return { fileId: record.id, status: FileStatus.READY };
  }

  async view(
    actor: Pick<FileActor, 'id'>,
    args: ViewFileArgs,
  ): Promise<ViewFileResult> {
    const record = await this.fileRecordsRepository.findById(args.fileId);

    if (!record) throw new NotFoundException('File record not found');
    if (record.ownerId !== actor.id) {
      throw new ForbiddenException('File does not belong to current user');
    }

    const { viewUrl } = await this.fileStoragePort.presignGet({
      key: record.key,
      expiresInSeconds: VIEW_TTL_SECONDS,
    });

    return { url: viewUrl };
  }

  private validatePresignArgs(args: PresignFileArgs): void {
    const ext = FILE_EXTENSION_BY_CONTENT_TYPE[args.contentType];
    if (!ext) throw new BadRequestException('Unsupported contentType');

    if (!Number.isInteger(args.size) || args.size <= 0) {
      throw new BadRequestException('size must be a positive integer');
    }
  }

  private validatePurposeAccess(actor: FileActor, args: PresignFileArgs): void {
    if (
      args.purpose === FilePurpose.PRODUCT_IMAGE &&
      actor.role !== Role.ADMIN
    ) {
      throw new ForbiddenException('Only ADMIN can presign PRODUCT_IMAGE');
    }
  }

  private resolveTarget(
    actor: FileActor,
    args: PresignFileArgs,
  ): { entityId: string; keyPrefix: string } {
    if (args.purpose === FilePurpose.PRODUCT_IMAGE) {
      if (!args.entityId) {
        throw new BadRequestException('entityId is required for PRODUCT_IMAGE');
      }
      return {
        entityId: args.entityId,
        keyPrefix: `products/${args.entityId}/images`,
      };
    }

    return {
      entityId: actor.id,
      keyPrefix: `users/${actor.id}/avatars`,
    };
  }

  private buildKey(keyPrefix: string, args: PresignFileArgs): string {
    const ext = FILE_EXTENSION_BY_CONTENT_TYPE[args.contentType];
    if (!ext) throw new BadRequestException('Unsupported contentType');
    return `${keyPrefix}/${randomUUID()}.${ext}`;
  }
}
