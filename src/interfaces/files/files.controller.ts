import type { Request } from 'express';

import { Body, Controller, Post, Req, ValidationPipe } from '@nestjs/common';

import type { UserRecord } from '../../application/auth/ports/users-repository.port';
import { FilesService } from '../../application/files/files.service';
import { FileVisibility } from '../../domain/files/files';

import { CompleteFileDto, PresignFileDto } from './dto/files.dto';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('presign')
  presign(
    @Req() request: Request & { user: UserRecord },
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: PresignFileDto,
  ) {
    const { id, role } = request.user;

    return this.filesService.presign(
      { id, role },
      {
        purpose: dto.purpose,
        entityId: dto.entityId,
        contentType: dto.contentType,
        size: dto.size,
        visibility: dto.visibility ?? FileVisibility.PRIVATE,
      },
    );
  }

  @Post('complete')
  complete(
    @Req() request: Request & { user: UserRecord },
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CompleteFileDto,
  ) {
    return this.filesService.complete({ id: request.user.id }, dto);
  }
}
