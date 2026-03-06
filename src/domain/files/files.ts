export enum FilePurpose {
  USER_AVATAR = 'USER_AVATAR',
  PRODUCT_IMAGE = 'PRODUCT_IMAGE',
}

export enum FileStatus {
  PENDING = 'PENDING',
  READY = 'READY',
}

export enum FileVisibility {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

export enum FileContentType {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp',
}

export const FILE_EXTENSION_BY_CONTENT_TYPE: Record<FileContentType, string> = {
  [FileContentType.JPEG]: 'jpg',
  [FileContentType.PNG]: 'png',
  [FileContentType.WEBP]: 'webp',
};
