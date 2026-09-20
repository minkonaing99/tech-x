import 'server-only'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

const PUBLIC_BUCKET = process.env.R2_PUBLIC_BUCKET ?? ''
const PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET ?? ''

let cached: S3Client | null = null

function client(): S3Client {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials missing (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY)')
  }
  cached ??= new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })
  return cached
}

async function put(
  bucket: string,
  cacheControl: string,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  if (!bucket) throw new Error('R2 bucket not configured')
  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  )
}

/** Best-effort: a missing object or a dead bucket must not fail the caller. */
async function remove(bucket: string, key: string): Promise<void> {
  if (!bucket) return
  await client()
    .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    .catch(() => {})
}

export function putPublic(key: string, body: Buffer, contentType: string): Promise<void> {
  return put(PUBLIC_BUCKET, 'public, max-age=31536000, immutable', key, body, contentType)
}

export function putPrivate(key: string, body: Buffer, contentType: string): Promise<void> {
  return put(PRIVATE_BUCKET, 'private, no-store', key, body, contentType)
}

export function deletePublic(key: string): Promise<void> {
  return remove(PUBLIC_BUCKET, key)
}

export function deletePrivate(key: string): Promise<void> {
  return remove(PRIVATE_BUCKET, key)
}

/**
 * Reading a public URL is not an R2 operation and needs no credentials, so it
 * lives in `./cdn` - which is also importable from a client component, where
 * this `server-only` module is not. Import it from there.
 */
export async function getPrivateBytes(key: string): Promise<Buffer | null> {
  if (!PRIVATE_BUCKET) return null
  try {
    const res = await client().send(new GetObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key }))
    if (!res.Body) return null
    return Buffer.from(await res.Body.transformToByteArray())
  } catch {
    return null
  }
}

