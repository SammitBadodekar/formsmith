import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Config } from "./config";

export interface BlobStorage {
  prepare(
    key: string,
    bytes: number,
    contentType: string,
  ): Promise<{ url: string; headers: Record<string, string> }>;
  head(key: string): Promise<{ bytes: number; contentType: string }>;
  prefix(key: string): Promise<Uint8Array>;
  download(key: string, contentType: string, fileName?: string): Promise<string>;
  remove(key: string): Promise<void>;
}
export function createStorage(config: Config): BlobStorage | null {
  if (
    !config.S3_ENDPOINT ||
    !config.S3_BUCKET ||
    !config.S3_ACCESS_KEY_ID ||
    !config.S3_SECRET_ACCESS_KEY
  )
    return null;
  const s3 = new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    },
    maxAttempts: 2,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const Bucket = config.S3_BUCKET;
  return {
    async prepare(Key, bytes, contentType) {
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket,
          Key,
          ContentLength: bytes,
          ContentType: contentType,
          IfNoneMatch: "*",
        }),
        {
          expiresIn: 600,
          signableHeaders: new Set(["content-type", "content-length", "if-none-match"]),
        },
      );
      // The browser supplies Content-Length from the File body. The signed
      // create-only precondition prevents mutation after finalization.
      return { url, headers: { "content-type": contentType, "if-none-match": "*" } };
    },
    async head(Key) {
      const result = await s3.send(new HeadObjectCommand({ Bucket, Key }), {
        abortSignal: AbortSignal.timeout(10000),
      });
      return {
        bytes: result.ContentLength ?? -1,
        contentType: result.ContentType ?? "application/octet-stream",
      };
    },
    async prefix(Key) {
      const result = await s3.send(new GetObjectCommand({ Bucket, Key, Range: "bytes=0-15" }), {
        abortSignal: AbortSignal.timeout(10000),
      });
      if (!result.Body) throw new Error("Object body missing");
      return result.Body.transformToByteArray();
    },
    async download(Key, contentType, fileName) {
      return getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket,
          Key,
          ResponseContentType: contentType,
          ResponseContentDisposition: fileName
            ? `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(fileName).replaceAll("'", "%27")}`
            : "inline",
        }),
        { expiresIn: 300 },
      );
    },
    async remove(Key) {
      await s3.send(new DeleteObjectCommand({ Bucket, Key }), {
        abortSignal: AbortSignal.timeout(10000),
      });
    },
  };
}

export function isImage(bytes: Uint8Array, type: string) {
  const ascii = new TextDecoder().decode(bytes);
  return (
    (type === "image/png" && [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) ||
    (type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
    (type === "image/gif" && /^(GIF87a|GIF89a)/.test(ascii)) ||
    (type === "image/webp" && ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP")
  );
}
