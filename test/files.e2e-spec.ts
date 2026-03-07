import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { AuthService } from '../src/application/auth/auth.service';
import { FileStoragePort } from '../src/application/files/file-storage.port';
import type { PresignFileResult } from '../src/application/files/files.types';
import {
  FileContentType,
  FilePurpose,
  FileStatus,
  FileVisibility,
} from '../src/domain/files/files';
import { Role } from '../src/domain/users/role';
import { FileRecord } from '../src/infrastructure/entities/file-record.entity';
import { User } from '../src/infrastructure/entities/user.entity';
import { FILE_STORAGE_PORT } from '../src/interfaces/files/files.tokens';

const runDbE2e = process.env.RUN_DB_E2E_TESTS === '1';
const describeDbE2e = runDbE2e ? describe : describe.skip;

const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';
const TEST_TOKEN = 'e2e-token';

describeDbE2e('FilesController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let usersRepository: Repository<User>;
  let fileRecordsRepository: Repository<FileRecord>;

  const storageMock: jest.Mocked<FileStoragePort> = {
    presignPut: jest.fn(({ key }) =>
      Promise.resolve({ uploadUrl: `https://upload.local/${key}` }),
    ),
    presignGet: jest.fn(({ key }) =>
      Promise.resolve({ viewUrl: `https://cdn.local/${key}` }),
    ),
  };

  const authServiceMock: Pick<AuthService, 'findUserByAccessToken'> = {
    findUserByAccessToken: jest.fn((token: string) =>
      Promise.resolve(
        token !== TEST_TOKEN
          ? null
          : {
              id: TEST_USER_ID,
              email: 'files-e2e@local.test',
              passwordHash: 'hash',
              role: Role.USER,
              refreshTokenHash: null,
            },
      ),
    ),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authServiceMock)
      .overrideProvider(FILE_STORAGE_PORT)
      .useValue(storageMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    usersRepository = dataSource.getRepository(User);
    fileRecordsRepository = dataSource.getRepository(FileRecord);

    await usersRepository.upsert(
      {
        id: TEST_USER_ID,
        email: 'files-e2e@local.test',
        passwordHash: 'hash',
        role: Role.USER,
        refreshTokenHash: null,
        avatarFileId: null,
      },
      ['id'],
    );
  });

  afterAll(async () => {
    await usersRepository.delete({ id: TEST_USER_ID });
    await fileRecordsRepository.delete({ ownerId: TEST_USER_ID });

    await app.close();
  });

  it('presign -> complete -> view for USER_AVATAR', async () => {
    const authHeader = { Authorization: `Bearer ${TEST_TOKEN}` };

    const presignResponse = await request(app.getHttpServer())
      .post('/files/presign')
      .set(authHeader)
      .send({
        purpose: FilePurpose.USER_AVATAR,
        contentType: FileContentType.JPEG,
        size: 2048,
        visibility: FileVisibility.PRIVATE,
      })
      .expect(201);

    const { fileId, key, uploadUrl, contentType } =
      presignResponse.body as PresignFileResult;

    expect(fileId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(key).toMatch(
      /^users\/11111111-1111-4111-8111-111111111111\/avatars\/.+\.jpg$/,
    );
    expect(uploadUrl).toBe(`https://upload.local/${key}`);
    expect(contentType).toBe(FileContentType.JPEG);

    const pendingRecord = await fileRecordsRepository.findOneByOrFail({
      id: fileId,
    });
    expect(pendingRecord.status).toBe(FileStatus.PENDING);

    await request(app.getHttpServer())
      .post('/files/complete')
      .set(authHeader)
      .send({ fileId })
      .expect(201)
      .expect({ fileId, status: FileStatus.READY });

    const updatedUser = await usersRepository.findOneByOrFail({
      id: TEST_USER_ID,
    });
    const readyRecord = await fileRecordsRepository.findOneByOrFail({
      id: fileId,
    });
    expect(updatedUser.avatarFileId).toBe(fileId);
    expect(readyRecord.status).toBe(FileStatus.READY);

    await request(app.getHttpServer())
      .get(`/files/${fileId}/view`)
      .set(authHeader)
      .expect(200)
      .expect({ url: `https://cdn.local/${key}` });
  });
});
