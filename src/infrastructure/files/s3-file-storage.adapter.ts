import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  FileStoragePort,
  PresignGetArgs,
  PresignGetResult,
  PresignPutArgs,
  PresignPutResult,
} from '../../application/files/file-storage.port';

@Injectable()
export class S3FileStorageAdapter implements FileStoragePort {
  private readonly bucket: string;
  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('storage.bucket');

    this.s3Client = new S3Client({
      endpoint: this.configService.get<string>('storage.endpoint'),
      region: this.configService.getOrThrow<string>('storage.region'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('storage.accessKey'),
        secretAccessKey:
          this.configService.getOrThrow<string>('storage.secretKey'),
      },
      forcePathStyle:
        this.configService.get<boolean>('storage.forcePathStyle') ?? false,
    });
  }

  async presignPut(args: PresignPutArgs): Promise<PresignPutResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: args.key,
      ContentType: args.contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: args.expiresInSeconds,
    });

    return { uploadUrl };
  }

  async presignGet(args: PresignGetArgs): Promise<PresignGetResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: args.key,
    });
    const viewUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: args.expiresInSeconds,
    });

    return { viewUrl };
  }
}
