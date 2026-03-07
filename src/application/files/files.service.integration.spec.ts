import { randomUUID } from 'node:crypto';

import { DataSource, Repository } from 'typeorm';

import {
  FileContentType,
  FilePurpose,
  FileStatus,
  FileVisibility,
} from '../../domain/files/files';
import { Role } from '../../domain/users/role';
import { createDatabaseOptions } from '../../infrastructure/database/data-source';
import { FileRecord } from '../../infrastructure/entities/file-record.entity';
import { Product } from '../../infrastructure/entities/product.entity';
import { User } from '../../infrastructure/entities/user.entity';
import { FileRecordsRepository } from '../../infrastructure/repositories/file-records.repository';

import { FileStoragePort } from './file-storage.port';
import { FilesService } from './files.service';

const runDbIntegration = process.env.RUN_DB_INTEGRATION_TESTS === '1';
const describeDb = runDbIntegration ? describe : describe.skip;

const parsePort = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
};

const createIntegrationDataSource = (host: string, port: number): DataSource =>
  new DataSource({
    ...createDatabaseOptions({
      host,
      port,
      username: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      database: process.env.DATABASE_NAME ?? 'node_course',
    }),
    entities: [FileRecord, User, Product],
  });

const initializeIntegrationDataSource = async (): Promise<DataSource> => {
  const envHost = process.env.DATABASE_HOST ?? 'localhost';
  const envPort = parsePort(process.env.DATABASE_PORT, 5432);

  const baseCandidates: Array<{ host: string; port: number }> = [
    { host: envHost, port: envPort },
    { host: 'localhost', port: 5433 },
    { host: 'localhost', port: 5432 },
    { host: 'postgres', port: 5432 },
  ];

  const seen = new Set<string>();
  const candidates = baseCandidates.filter((candidate) => {
    const key = `${candidate.host}:${candidate.port}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let lastError: unknown;

  for (const candidate of candidates) {
    const ds = createIntegrationDataSource(candidate.host, candidate.port);
    try {
      await ds.initialize();
      return ds;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Unable to connect DB for integration tests. Tried: ${candidates
      .map((c) => `${c.host}:${c.port}`)
      .join(', ')}. Last error: ${String(lastError)}`,
  );
};

describeDb('FilesService (DB integration)', () => {
  let dataSource: DataSource;
  let filesService: FilesService;
  let fileRecordsRepository: FileRecordsRepository;
  let usersRepository: Repository<User>;
  let productsRepository: Repository<Product>;

  beforeAll(async () => {
    dataSource = await initializeIntegrationDataSource();

    usersRepository = dataSource.getRepository(User);
    productsRepository = dataSource.getRepository(Product);
    fileRecordsRepository = new FileRecordsRepository(
      dataSource.getRepository(FileRecord),
    );

    const fileStoragePort: FileStoragePort = {
      presignPut: jest.fn(),
      presignGet: jest.fn(),
    };

    filesService = new FilesService(
      fileRecordsRepository,
      dataSource,
      fileStoragePort,
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('complete binds READY file to User.avatarFileId for USER_AVATAR', async () => {
    const userId = randomUUID();

    await usersRepository.save(
      usersRepository.create({
        id: userId,
        email: `${userId}@integration.local`,
        passwordHash: 'hash',
        role: Role.USER,
        refreshTokenHash: null,
        avatarFileId: null,
      }),
    );

    const record = await fileRecordsRepository.createPending({
      ownerId: userId,
      purpose: FilePurpose.USER_AVATAR,
      entityId: userId,
      key: `users/${userId}/avatars/${randomUUID()}.jpg`,
      contentType: FileContentType.JPEG,
      size: 128,
      visibility: FileVisibility.PRIVATE,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await expect(
      filesService.complete({ id: userId }, { fileId: record.id }),
    ).resolves.toEqual({ fileId: record.id, status: FileStatus.READY });

    const updatedUser = await usersRepository.findOneByOrFail({ id: userId });
    const updatedRecord = await fileRecordsRepository.findById(record.id);

    expect(updatedUser.avatarFileId).toBe(record.id);
    expect(updatedRecord?.status).toBe(FileStatus.READY);

    await usersRepository.delete({ id: userId });
    await dataSource.getRepository(FileRecord).delete({ id: record.id });
  });

  it('complete binds READY file to Product.imageFileId for PRODUCT_IMAGE', async () => {
    const adminId = randomUUID();
    const productId = randomUUID();

    await usersRepository.save(
      usersRepository.create({
        id: adminId,
        email: `${adminId}@integration.local`,
        passwordHash: 'hash',
        role: Role.ADMIN,
        refreshTokenHash: null,
        avatarFileId: null,
      }),
    );

    await productsRepository.save(
      productsRepository.create({
        id: productId,
        title: `Product ${productId}`,
        description: null,
        priceCents: 100,
        currency: 'UAH',
        stock: 1,
        isActive: true,
        imageFileId: null,
      }),
    );

    const record = await fileRecordsRepository.createPending({
      ownerId: adminId,
      purpose: FilePurpose.PRODUCT_IMAGE,
      entityId: productId,
      key: `products/${productId}/images/${randomUUID()}.png`,
      contentType: FileContentType.PNG,
      size: 256,
      visibility: FileVisibility.PRIVATE,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await expect(
      filesService.complete({ id: adminId }, { fileId: record.id }),
    ).resolves.toEqual({ fileId: record.id, status: FileStatus.READY });

    const updatedProduct = await productsRepository.findOneByOrFail({
      id: productId,
    });
    const updatedRecord = await fileRecordsRepository.findById(record.id);

    expect(updatedProduct.imageFileId).toBe(record.id);
    expect(updatedRecord?.status).toBe(FileStatus.READY);

    await productsRepository.delete({ id: productId });
    await usersRepository.delete({ id: adminId });
    await dataSource.getRepository(FileRecord).delete({ id: record.id });
  });
});
