import { readBoundedBody } from "@formsmith/core/intake";
import type { ObjectStore } from "./service";

export class R2Store implements ObjectStore {
  constructor(private bucket: R2Bucket) {}
  async get(key: string) {
    const value = await this.bucket.get(key);
    if (!value) return null;
    return { body: await readBoundedBody(value.body, 2 * 1024 * 1024), etag: value.etag };
  }
  async put(key: string, body: string, condition?: { etag: string } | { absent: true }) {
    const onlyIf = condition
      ? new Headers(
          "etag" in condition ? { "if-match": `"${condition.etag}"` } : { "if-none-match": "*" },
        )
      : undefined;
    return (
      (await this.bucket.put(key, body, {
        onlyIf,
        httpMetadata: { contentType: "application/json" },
      })) !== null
    );
  }
  async delete(key: string) {
    await this.bucket.delete(key);
  }
  async list(prefix: string, cursor?: string, limit = 100) {
    const page = await this.bucket.list({ prefix, cursor, limit });
    return {
      keys: page.objects.map((object) => object.key),
      cursor: page.truncated ? page.cursor : undefined,
    };
  }
}
