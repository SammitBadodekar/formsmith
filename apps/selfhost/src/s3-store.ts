import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { readBoundedBody } from "@formsmith/core/intake";
import type { ObjectStore } from "@formsmith/intake/service";

export class S3Store implements ObjectStore {
  constructor(
    private client: S3Client,
    private bucket: string,
    private prefix = "formsmith/",
  ) {
    if (!prefix.endsWith("/") || prefix.startsWith("/") || prefix.includes(".."))
      throw new Error("Journal prefix must be a relative directory ending in /");
  }

  async verify() {
    const key = `maintenance/storage-probe/${crypto.randomUUID()}`;
    try {
      if (!(await this.put(key, "first", { absent: true })))
        throw new Error("Could not create journal storage probe");
      if (await this.put(key, "overwrite", { absent: true }))
        throw new Error("Journal storage does not enforce conditional creation");
      const previous = await this.get(key);
      if (previous?.body !== "first") throw new Error("Journal storage read mismatch");
      if (!(await this.put(key, "second", { etag: previous.etag })))
        throw new Error("Journal storage conditional update failed");
      if (await this.put(key, "stale", { etag: previous.etag }))
        throw new Error("Journal storage does not enforce conditional updates");
    } finally {
      await this.delete(key);
    }
  }

  async get(key: string) {
    try {
      const value = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.prefix + key }),
        { abortSignal: AbortSignal.timeout(15000) },
      );
      if (!value.Body || !value.ETag) throw new Error("Journal object is incomplete");
      return {
        body: await readBoundedBody(value.Body.transformToWebStream(), 2 * 1024 * 1024),
        etag: value.ETag.replace(/^"|"$/g, ""),
      };
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === "NoSuchKey") return null;
      throw error;
    }
  }

  async put(key: string, body: string, condition?: { etag: string } | { absent: true }) {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.prefix + key,
          Body: body,
          ContentLength: Buffer.byteLength(body),
          ContentType: "application/json",
          ...(condition && "etag" in condition ? { IfMatch: `"${condition.etag}"` } : {}),
          ...(condition && "absent" in condition ? { IfNoneMatch: "*" } : {}),
        }),
        { abortSignal: AbortSignal.timeout(15000) },
      );
      return true;
    } catch (error) {
      if (
        condition &&
        error instanceof S3ServiceException &&
        (error.$metadata.httpStatusCode === 412 ||
          error.$metadata.httpStatusCode === 409 ||
          ("etag" in condition && error.name === "NoSuchKey"))
      )
        return false;
      throw error;
    }
  }

  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: this.prefix + key }),
      { abortSignal: AbortSignal.timeout(15000) },
    );
  }

  async list(prefix: string, cursor?: string, limit = 100) {
    const page = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: this.prefix + prefix,
        ContinuationToken: cursor,
        MaxKeys: limit,
      }),
      { abortSignal: AbortSignal.timeout(15000) },
    );
    if (page.IsTruncated && !page.NextContinuationToken)
      throw new Error("Journal listing did not provide its continuation cursor");
    return {
      keys: (page.Contents ?? []).map(({ Key }) => {
        if (!Key?.startsWith(this.prefix + prefix)) throw new Error("Invalid journal listing");
        return Key.slice(this.prefix.length);
      }),
      cursor: page.IsTruncated ? page.NextContinuationToken : undefined,
    };
  }
}
