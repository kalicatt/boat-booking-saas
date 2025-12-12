import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const STORAGE_DRIVER = process.env.STORAGE_DRIVER ?? 's3'
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT
const STORAGE_REGION = process.env.STORAGE_REGION ?? 'eu-central-1'
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY
const STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_KEY
const STORAGE_BUCKET = process.env.STORAGE_BUCKET
const STORAGE_UPLOAD_URL_TTL = Number(process.env.STORAGE_UPLOAD_URL_TTL ?? 300)
const STORAGE_DOWNLOAD_URL_TTL = Number(process.env.STORAGE_DOWNLOAD_URL_TTL ?? 60)

let s3Client: S3Client | null = null

function getS3Client() {
  ensureConfig(['STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY'], {
    STORAGE_ACCESS_KEY,
    STORAGE_SECRET_KEY
  })

  if (!s3Client) {
    s3Client = new S3Client({
      region: STORAGE_REGION,
      endpoint: STORAGE_ENDPOINT,
      forcePathStyle: STORAGE_DRIVER === 'minio',
      credentials: {
        accessKeyId: STORAGE_ACCESS_KEY!,
        secretAccessKey: STORAGE_SECRET_KEY!
      }
    })
  }

  return s3Client
}

function getBucket() {
  if (!STORAGE_BUCKET) {
    throw new Error('Missing storage configuration: STORAGE_BUCKET')
  }
  return STORAGE_BUCKET
}

export type SignedUrlParams = {
  key: string
  contentType?: string
  expiresIn?: number
  checksumSha256?: string
}

const buildUploadCommand = ({ key, contentType, checksumSha256 }: SignedUrlParams) =>
  new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
    ChecksumSHA256: checksumSha256
  })

const buildHeadCommand = (key: string) =>
  new HeadObjectCommand({
    Bucket: getBucket(),
    Key: key
  })

const buildDeleteCommand = (key: string) =>
  new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key
  })

export function buildEmployeeDocumentKey(userId: string, documentId: string, fileName: string) {
  const normalized = fileName
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  const base = normalized || 'document'
  return `employees/${userId}/${documentId}/${base}`
}

export async function createUploadUrl({ key, contentType, expiresIn = STORAGE_UPLOAD_URL_TTL, checksumSha256 }: SignedUrlParams) {
  const command = buildUploadCommand({ key, contentType, checksumSha256 })
  const client = getS3Client()
  const url = await getSignedUrl(client, command, { expiresIn })
  return { url, expiresIn }
}

export async function createDownloadUrl({ key, expiresIn = STORAGE_DOWNLOAD_URL_TTL }: SignedUrlParams) {
  const client = getS3Client()
  await client.send(buildHeadCommand(key))
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key })
  const url = await getSignedUrl(client, command, { expiresIn })
  return { url, expiresIn }
}

export async function getObjectStream(key: string) {
  const client = getS3Client()
  const response = await client.send(new GetObjectCommand({ Bucket: getBucket(), Key: key }))
  if (!response.Body) {
    throw new Error('Objet de stockage vide')
  }
  return {
    body: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    eTag: response.ETag,
    lastModified: response.LastModified
  }
}

export async function deleteObject(key: string) {
  const client = getS3Client()
  await client.send(buildDeleteCommand(key))
}

function ensureConfig(keys: string[], env: Record<string, string | undefined>) {
  const missing = keys.filter((key) => !env[key])
  if (missing.length) {
    throw new Error(`Missing storage configuration: ${missing.join(', ')}`)
  }
}
