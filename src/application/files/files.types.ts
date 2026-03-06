import {
  FileContentType,
  FilePurpose,
  FileStatus,
  FileVisibility,
} from '../../domain/files/files';
import { Role } from '../../domain/users/role';

export type FileActor = {
  id: string;
  role: Role;
};

export type PresignFileInput = {
  purpose: FilePurpose;
  entityId?: string;
  contentType: FileContentType;
  size: number;
  visibility: FileVisibility;
};

export type PresignFileResult = {
  fileId: string;
  key: string;
  uploadUrl: string;
  contentType: FileContentType;
};

export type CompleteFileInput = {
  fileId: string;
};

export type CompleteFileResult = {
  fileId: string;
  status: FileStatus;
};
