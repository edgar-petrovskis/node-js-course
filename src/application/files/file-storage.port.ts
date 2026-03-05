export type PresignPutArgs = {
  key: string;
  contentType: string;
  expiresInSeconds: number;
};

export type PresignGetArgs = {
  key: string;
  expiresInSeconds: number;
};

export type PresignPutResult = {
  uploadUrl: string;
};

export type PresignGetResult = {
  viewUrl: string;
};

export interface FileStoragePort {
  presignPut(args: PresignPutArgs): Promise<PresignPutResult>;
  presignGet(args: PresignGetArgs): Promise<PresignGetResult>;
}
