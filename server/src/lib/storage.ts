import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, normalize, resolve, sep } from 'node:path';
import { nanoid } from 'nanoid';

type UploadMethod = 'PUT' | 'POST';

export type UploadTarget = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  uploadMethod: UploadMethod;
};

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export const MAX_LOCAL_UPLOAD_BYTES = 10 * 1024 * 1024;

export class PayloadTooLargeError extends Error {}
export class EmptyUploadBodyError extends Error {}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getStorageMode(): string {
  return process.env.STORAGE_MODE ?? 'local';
}

function getStoragePublicUrl(): string {
  return stripTrailingSlash(process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:8787/storage');
}

function getApiPublicUrl(): string {
  const explicitUrl = process.env.API_PUBLIC_URL;
  if (explicitUrl) {
    return stripTrailingSlash(explicitUrl);
  }

  return getStoragePublicUrl().replace(/\/storage$/, '');
}

function getLocalStorageRoot(): string {
  return resolve(process.env.STORAGE_LOCAL_PATH ?? './storage');
}

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 storage requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function isAllowedImageContentType(contentType: string): contentType is keyof typeof EXTENSIONS {
  return ALLOWED_CONTENT_TYPES.has(contentType);
}

function assertValidImageContentType(contentType: string): asserts contentType is keyof typeof EXTENSIONS {
  if (!isAllowedImageContentType(contentType)) {
    throw new Error(`Unsupported image content type: ${contentType}`);
  }
}

export function getExpectedContentTypeForKey(key: string): string | undefined {
  return MIME_BY_EXTENSION[extname(key).toLowerCase()];
}

export function getLocalPublicUrlForKey(key: string): string {
  return `${getStoragePublicUrl()}/${key}`;
}

function safeStoragePath(key: string): string {
  const normalizedKey = normalize(key).replace(/^(\.\.[/\\])+/, '');
  const root = getLocalStorageRoot();
  const target = resolve(root, normalizedKey);

  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error('Invalid storage key.');
  }

  return target;
}

export async function createUploadTarget(contentType: string): Promise<UploadTarget> {
  assertValidImageContentType(contentType);

  const key = `rooms/${nanoid()}.${EXTENSIONS[contentType]}`;

  if (getStorageMode() === 'r2') {
    const bucket = process.env.R2_BUCKET_NAME;
    const publicBaseUrl = process.env.R2_PUBLIC_URL;
    if (!bucket || !publicBaseUrl) {
      throw new Error('R2 storage requires R2_BUCKET_NAME and R2_PUBLIC_URL.');
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    return {
      key,
      uploadUrl: await getSignedUrl(getR2Client(), command, { expiresIn: 300 }),
      publicUrl: `${stripTrailingSlash(publicBaseUrl)}/${key}`,
      uploadMethod: 'PUT',
    };
  }

  return {
    key,
    uploadUrl: `${getApiPublicUrl()}/api/rooms/storage-upload/${key}`,
    publicUrl: getLocalPublicUrlForKey(key),
    uploadMethod: 'POST',
  };
}

export async function storeLocalFile(key: string, buffer: Buffer): Promise<string> {
  const path = safeStoragePath(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
  return getLocalPublicUrlForKey(key);
}

export async function readLimitedBody(request: Request, maxBytes: number): Promise<Buffer> {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      throw new PayloadTooLargeError();
    }
  }

  const reader = request.body?.getReader();
  if (!reader) {
    throw new EmptyUploadBodyError();
  }

  const chunks: Buffer[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new PayloadTooLargeError();
    }
    chunks.push(Buffer.from(value));
  }

  if (total === 0) {
    throw new EmptyUploadBodyError();
  }

  return Buffer.concat(chunks, total);
}

export async function readLocalFile(key: string): Promise<{
  body: ArrayBuffer;
  contentType: string;
}> {
  const path = safeStoragePath(key);
  const buffer = await readFile(path);
  return {
    body: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    contentType: MIME_BY_EXTENSION[extname(path).toLowerCase()] ?? 'application/octet-stream',
  };
}

export function isLocalStorageMode(): boolean {
  return getStorageMode() !== 'r2';
}
