import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

// Avatar uploads go to S3-compatible object storage (e.g. Cloudflare R2) when
// S3_* env vars are configured, and fall back to local disk otherwise - so local
// dev works with zero setup, and production just needs a bucket.
const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL_BASE, S3_REGION } = process.env

const s3Enabled = Boolean(S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY)

if (s3Enabled && !S3_PUBLIC_URL_BASE) {
  throw new Error('S3_PUBLIC_URL_BASE must be set alongside the other S3_* vars so uploaded avatar URLs are servable.')
}

const s3Client = s3Enabled
  ? new S3Client({
      region: S3_REGION || 'auto',
      endpoint: S3_ENDPOINT,
      credentials: { accessKeyId: S3_ACCESS_KEY_ID!, secretAccessKey: S3_SECRET_ACCESS_KEY! },
    })
  : null

const uploadsDir = path.resolve(process.cwd(), 'uploads')
if (!s3Enabled) fs.mkdirSync(uploadsDir, { recursive: true })

export const storageMode: 's3' | 'local' = s3Enabled ? 's3' : 'local'

if (storageMode === 'local') {
  console.log('[storage] S3_* env vars not set - avatar uploads are saved to local disk (fine for dev, not for a multi-instance deploy).')
}

export async function saveAvatar(buffer: Buffer, mimetype: string, ownerId: string): Promise<string> {
  const ext = (mimetype.split('/')[1] ?? 'png').replace('jpeg', 'jpg')
  const filename = `${ownerId}-${randomUUID()}.${ext}`

  if (s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: `avatars/${filename}`,
        Body: buffer,
        ContentType: mimetype,
      }),
    )
    return `${S3_PUBLIC_URL_BASE!.replace(/\/$/, '')}/avatars/${filename}`
  }

  fs.writeFileSync(path.join(uploadsDir, filename), buffer)
  return `/uploads/${filename}`
}
