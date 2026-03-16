import { DataSource } from 'typeorm';

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  FileContentType,
  FilePurpose,
  FileStatus,
  FileVisibility,
} from '../../domain/files/files';
import { Role } from '../../domain/users/role';
import { FileRecord } from '../../infrastructure/entities/file-record.entity';
import {
  CreatePendingFileRecordInput,
  FileRecordsRepository,
} from '../../infrastructure/repositories/file-records.repository';

import { FileStoragePort } from './file-storage.port';
import { FilesService } from './files.service';

const makeSut = () => {
  const createPendingMock = jest.fn<
    Promise<FileRecord>,
    [CreatePendingFileRecordInput]
  >();
  const findByIdMock = jest.fn<Promise<FileRecord | null>, [string]>();
  const markReadyMock = jest.fn<Promise<boolean>, [string]>();
  const fileRecordsRepository = {
    createPending: createPendingMock,
    findById: findByIdMock,
    markReady: markReadyMock,
  } as unknown as jest.Mocked<FileRecordsRepository>;

  const presignPutMock = jest.fn();
  const presignGetMock = jest.fn();
  const fileStoragePort = {
    presignPut: presignPutMock,
    presignGet: presignGetMock,
  } as jest.Mocked<FileStoragePort>;

  const transactionMock = jest.fn();
  const dataSource = {
    transaction: transactionMock,
  } as unknown as jest.Mocked<DataSource>;

  const service = new FilesService(
    fileRecordsRepository,
    dataSource,
    fileStoragePort,
  );

  return {
    service,
    fileRecordsRepository,
    fileStoragePort,
    dataSource,
    createPendingMock,
    findByIdMock,
    markReadyMock,
    presignPutMock,
    presignGetMock,
    transactionMock,
  };
};

describe('FilesService', () => {
  it('presign creates pending avatar record and returns upload URL', async () => {
    const { service, createPendingMock, presignPutMock } = makeSut();

    createPendingMock.mockImplementation((input) =>
      Promise.resolve({
        id: 'file-1',
        ownerId: input.ownerId,
        purpose: input.purpose,
        entityId: input.entityId,
        key: input.key,
        contentType: input.contentType,
        size: input.size,
        visibility: input.visibility,
        status: FileStatus.PENDING,
        expiresAt: input.expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as FileRecord),
    );
    presignPutMock.mockResolvedValue({ uploadUrl: 'https://upload' });

    const result = await service.presign(
      { id: 'user-1', role: Role.USER },
      {
        purpose: FilePurpose.USER_AVATAR,
        contentType: FileContentType.JPEG,
        size: 123,
        visibility: FileVisibility.PRIVATE,
      },
    );

    expect(createPendingMock).toHaveBeenCalledTimes(1);
    const [createPendingArgs] = createPendingMock.mock.calls[0];
    expect(createPendingArgs.ownerId).toBe('user-1');
    expect(createPendingArgs.entityId).toBe('user-1');
    expect(createPendingArgs.key).toMatch(/^users\/user-1\/avatars\/.+\.jpg$/);
    expect(presignPutMock).toHaveBeenCalledWith({
      key: createPendingArgs.key,
      contentType: FileContentType.JPEG,
      expiresInSeconds: 900,
    });
    expect(result.uploadUrl).toBe('https://upload');
  });

  it('presign throws for product image when actor is not admin', async () => {
    const { service } = makeSut();

    await expect(
      service.presign(
        { id: 'user-1', role: Role.USER },
        {
          purpose: FilePurpose.PRODUCT_IMAGE,
          entityId: 'product-1',
          contentType: FileContentType.PNG,
          size: 10,
          visibility: FileVisibility.PRIVATE,
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('presign throws for invalid size', async () => {
    const { service } = makeSut();

    await expect(
      service.presign(
        { id: 'user-1', role: Role.USER },
        {
          purpose: FilePurpose.USER_AVATAR,
          contentType: FileContentType.PNG,
          size: 0,
          visibility: FileVisibility.PRIVATE,
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('complete throws NotFound when file record does not exist', async () => {
    const { service, findByIdMock } = makeSut();
    findByIdMock.mockResolvedValue(null);

    await expect(
      service.complete({ id: 'user-1' }, { fileId: 'missing-file' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('complete throws Forbidden for non-owner', async () => {
    const { service, findByIdMock } = makeSut();
    findByIdMock.mockResolvedValue({
      id: 'file-1',
      ownerId: 'other-user',
      purpose: FilePurpose.USER_AVATAR,
      entityId: 'other-user',
      key: 'users/other-user/avatars/a.jpg',
      contentType: FileContentType.JPEG,
      size: 111,
      visibility: FileVisibility.PRIVATE,
      status: FileStatus.PENDING,
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FileRecord);

    await expect(
      service.complete({ id: 'user-1' }, { fileId: 'file-1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('complete transitions pending to ready and binds avatar file to user in transaction', async () => {
    const { service, findByIdMock, transactionMock } = makeSut();

    findByIdMock.mockResolvedValue({
      id: 'file-1',
      ownerId: 'user-1',
      purpose: FilePurpose.USER_AVATAR,
      entityId: 'user-1',
      key: 'users/user-1/avatars/a.jpg',
      contentType: FileContentType.JPEG,
      size: 111,
      visibility: FileVisibility.PRIVATE,
      status: FileStatus.PENDING,
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FileRecord);

    type TransactionManagerMock = {
      update: jest.Mock;
    };
    const manager: TransactionManagerMock = {
      update: jest
        .fn()
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 1 }),
    };
    transactionMock.mockImplementation(
      (cb: (trxManager: TransactionManagerMock) => Promise<unknown>) =>
        cb(manager),
    );

    await expect(
      service.complete({ id: 'user-1' }, { fileId: 'file-1' }),
    ).resolves.toEqual({ fileId: 'file-1', status: FileStatus.READY });

    expect(manager.update).toHaveBeenCalledTimes(2);
  });

  it('complete throws NotFound when product bind target does not exist', async () => {
    const { service, findByIdMock, transactionMock } = makeSut();

    findByIdMock.mockResolvedValue({
      id: 'file-product-1',
      ownerId: 'admin-1',
      purpose: FilePurpose.PRODUCT_IMAGE,
      entityId: 'product-missing',
      key: 'products/product-missing/images/p.png',
      contentType: FileContentType.PNG,
      size: 111,
      visibility: FileVisibility.PRIVATE,
      status: FileStatus.PENDING,
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FileRecord);

    const manager = {
      update: jest
        .fn()
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 0 }),
    };
    transactionMock.mockImplementation(
      (cb: (trxManager: typeof manager) => Promise<unknown>) => cb(manager),
    );

    await expect(
      service.complete({ id: 'admin-1' }, { fileId: 'file-product-1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('view returns presigned GET URL for file owner', async () => {
    const { service, findByIdMock, presignGetMock } = makeSut();

    findByIdMock.mockResolvedValue({
      id: 'file-1',
      ownerId: 'user-1',
      purpose: FilePurpose.USER_AVATAR,
      entityId: 'user-1',
      key: 'users/user-1/avatars/a.jpg',
      contentType: FileContentType.JPEG,
      size: 111,
      visibility: FileVisibility.PRIVATE,
      status: FileStatus.READY,
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FileRecord);
    presignGetMock.mockResolvedValue({ viewUrl: 'https://view' });

    await expect(
      service.view({ id: 'user-1' }, { fileId: 'file-1' }),
    ).resolves.toEqual({ url: 'https://view' });
  });

  it('view throws Forbidden for non-owner', async () => {
    const { service, findByIdMock } = makeSut();

    findByIdMock.mockResolvedValue({
      id: 'file-1',
      ownerId: 'owner-1',
      purpose: FilePurpose.USER_AVATAR,
      entityId: 'owner-1',
      key: 'users/owner-1/avatars/a.jpg',
      contentType: FileContentType.JPEG,
      size: 111,
      visibility: FileVisibility.PRIVATE,
      status: FileStatus.READY,
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FileRecord);

    await expect(
      service.view({ id: 'other-user' }, { fileId: 'file-1' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
