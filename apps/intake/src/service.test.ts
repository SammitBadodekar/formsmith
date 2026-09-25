import { describe, expect, test } from "bun:test";
import { createForm, createQuestion, newId, text } from "@formsmith/core";
import { type JournalEntry, MAX_POLICY_AGE_MS } from "@formsmith/core/intake";
import { Intake, type ObjectStore } from "./service";

test("intake requires finalized file proofs bound to the attempt and question", async () => {
  const f = await fixture();
  const upload = { ...createQuestion("file"), label: text("Attachment"), required: true };
  const definition = { ...f.manifest.definition, blocks: [upload] };
  await f.intake.publish({ ...f.manifest, revision: 2, versionId: newId(), definition });
  const attempt = await f.intake.start(definition.id);
  const id = newId(),
    command = {
      formId: definition.id,
      versionId: attempt.versionId,
      attemptId: attempt.attemptId,
      answers: { [upload.id]: [id] },
      honeypot: "",
    };
  await expect(f.intake.submit(attempt.token, command)).rejects.toMatchObject({ status: 422 });
  const proof = {
    id,
    formId: definition.id,
    attemptId: attempt.attemptId,
    questionId: upload.id,
    bytes: 100,
  };
  await f.intake.finalizeUpload(proof);
  await f.intake.finalizeUpload(proof);
  await expect(f.intake.finalizeUpload({ ...proof, bytes: 200 })).rejects.toMatchObject({
    status: 409,
  });
  expect((await f.intake.submit(attempt.token, command)).status).toBe("pending");
  const other = await f.intake.start(definition.id);
  await expect(
    f.intake.submit(other.token, { ...command, attemptId: other.attemptId }),
  ).rejects.toMatchObject({ status: 422 });
});

class MemoryStore implements ObjectStore {
  records = new Map<string, { body: string; etag: string }>();
  failWrite = "";
  failAfterWrite = "";
  async get(key: string) {
    return this.records.get(key) ?? null;
  }
  async put(key: string, body: string, condition?: { etag: string } | { absent: true }) {
    if (this.failWrite && key.startsWith(this.failWrite)) throw new Error("Storage unavailable");
    const existing = this.records.get(key);
    if (condition && ("absent" in condition ? existing : existing?.etag !== condition.etag))
      return false;
    this.records.set(key, { body, etag: newId() });
    if (this.failAfterWrite && key.startsWith(this.failAfterWrite))
      throw new Error("Lost write acknowledgement");
    return true;
  }
  async delete(key: string) {
    this.records.delete(key);
  }
  async list(prefix: string, cursor?: string) {
    const remaining = [...this.records.keys()]
      .filter((key) => key.startsWith(prefix) && (!cursor || key > cursor))
      .sort();
    const keys = remaining.slice(0, 2);
    return { keys, cursor: remaining.length > keys.length ? keys.at(-1) : undefined };
  }
}
async function fixture() {
  const store = new MemoryStore();
  const form = createForm();
  const question = { ...createQuestion("short_text"), label: text("Your name"), required: true };
  form.blocks = [question];
  let now = Date.now();
  let queueDown = false;
  let backendStatus = 200;
  const queued: string[] = [];
  const committed = new Map<
    string,
    { receiptId: string; requestHash: string; submissionId: string }
  >();
  const intake = new Intake({
    store,
    apiUrl: "https://api.example.test",
    admissionKeys: { v1: "a".repeat(64) },
    controlKeys: { v1: "b".repeat(64) },
    activeKeyId: "v1",
    now: () => now,
    enqueue: async (key) => {
      if (queueDown) throw new Error("Queue unavailable");
      queued.push(key);
    },
    send: async (request) => {
      if (backendStatus !== 200) return new Response(null, { status: backendStatus });
      const entry: JournalEntry = await request.json();
      const key = entry.command.attemptId;
      let result = committed.get(key);
      if (!result) {
        result = {
          receiptId: entry.receiptId,
          requestHash: entry.requestHash,
          submissionId: newId(),
        };
        committed.set(key, result);
      }
      return Response.json(result);
    },
  });
  const manifest = {
    revision: 1,
    versionId: newId(),
    definition: form,
    closed: false,
    validUntil: now + MAX_POLICY_AGE_MS,
  };
  await intake.publish(manifest);
  const attempt = await intake.start(form.id);
  const command = {
    formId: form.id,
    versionId: attempt.versionId,
    attemptId: attempt.attemptId,
    answers: { [question.id]: "Ada" },
    honeypot: "",
  };
  const key = `journal/${form.id}/${attempt.attemptId}`;
  return {
    store,
    form,
    question,
    manifest,
    intake,
    attempt,
    command,
    key,
    queued,
    committed,
    advance: (ms: number) => {
      now += ms;
    },
    queueDown: (value: boolean) => {
      queueDown = value;
    },
    backendStatus: (status: number) => {
      backendStatus = status;
    },
  };
}

describe("durable intake", () => {
  test("explicit recovery ignores old commit markers and resumes failed pages after a restore", async () => {
    const f = await fixture();
    const receipts = [];
    for (let i = 0; i < 3; i++) {
      const attempt = await f.intake.start(f.form.id);
      const receipt = await f.intake.submit(attempt.token, {
        ...f.command,
        attemptId: attempt.attemptId,
      });
      receipts.push(receipt.id);
      await f.intake.replay(`journal/${f.form.id}/${attempt.attemptId}`);
    }
    expect(f.committed.size).toBe(3);
    f.committed.clear();
    f.backendStatus(503);
    await expect(f.intake.recover(f.form.id)).rejects.toThrow();
    expect(f.committed.size).toBe(0);
    f.backendStatus(200);
    const page = await f.intake.recover(f.form.id);
    expect(page.recovered).toBe(2);
    expect(page.cursor).toBeTruthy();
    expect((await f.intake.recover(f.form.id, page.cursor ?? undefined)).recovered).toBe(1);
    expect([...f.committed.values()].map((r) => r.receiptId).sort()).toEqual(receipts.sort());
    await f.intake.recover(f.form.id);
    expect(f.committed.size).toBe(3);
  });
  test("simultaneous identical requests receive one stable receipt", async () => {
    const f = await fixture();
    const receipts = await Promise.all(
      Array.from({ length: 40 }, () => f.intake.submit(f.attempt.token, f.command)),
    );
    expect(new Set(receipts.map((r) => r.id)).size).toBe(1);
    expect(receipts[0]?.status).toBe("pending");
    expect([...f.store.records.keys()].filter((k) => k.startsWith("journal/"))).toHaveLength(1);
  });
  test("different payloads racing on the same attempt cannot both be accepted", async () => {
    const f = await fixture();
    const results = await Promise.allSettled([
      f.intake.submit(f.attempt.token, f.command),
      f.intake.submit(f.attempt.token, { ...f.command, answers: { [f.question.id]: "Grace" } }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r) => r.status === "rejected");
    expect(failed?.status === "rejected" && failed.reason.status).toBe(409);
  });
  test("journal failure never returns an accepted receipt", async () => {
    const f = await fixture();
    f.store.failWrite = "journal/";
    await expect(f.intake.submit(f.attempt.token, f.command)).rejects.toThrow(
      "Storage unavailable",
    );
    await expect(f.intake.status(f.attempt.token)).rejects.toMatchObject({ status: 404 });
    expect(f.queued).toHaveLength(0);
  });
  test("lost R2 acknowledgement recovers the same immutable command", async () => {
    const f = await fixture();
    f.store.failAfterWrite = "journal/";
    await expect(f.intake.submit(f.attempt.token, f.command)).rejects.toThrow(
      "Lost write acknowledgement",
    );
    f.store.failAfterWrite = "";
    const receipt = await f.intake.submit(f.attempt.token, f.command);
    await f.intake.reconcile();
    expect(f.queued).toContain(f.key);
    await f.intake.replay(f.key);
    expect(await f.intake.status(f.attempt.token)).toMatchObject({
      id: receipt.id,
      status: "committed",
    });
  });
  test("queue outage preserves acceptance and reconciliation recovers it", async () => {
    const f = await fixture();
    f.queueDown(true);
    expect((await f.intake.submit(f.attempt.token, f.command)).status).toBe("pending");
    f.queueDown(false);
    await f.intake.reconcile();
    expect(f.queued).toEqual([f.key]);
  });
  test("backend outage keeps receipt pending; replay is idempotent", async () => {
    const f = await fixture();
    await f.intake.submit(f.attempt.token, f.command);
    f.backendStatus(503);
    await expect(f.intake.replay(f.key)).rejects.toThrow("backend unavailable");
    expect((await f.intake.status(f.attempt.token)).status).toBe("pending");
    f.backendStatus(200);
    await Promise.all([f.intake.replay(f.key), f.intake.replay(f.key)]);
    expect(f.committed.size).toBe(1);
    expect((await f.intake.status(f.attempt.token)).status).toBe("committed");
    expect(f.store.records.has(f.key.replace("journal/", "pending/"))).toBe(false);
    expect(f.store.records.has(f.key)).toBe(true);
  });
  test("lost commit-marker write can retry backend without losing the journal", async () => {
    const f = await fixture();
    await f.intake.submit(f.attempt.token, f.command);
    f.store.failWrite = "results/";
    await expect(f.intake.replay(f.key)).rejects.toThrow("Storage unavailable");
    expect(f.committed.size).toBe(1);
    expect((await f.intake.status(f.attempt.token)).status).toBe("pending");
    f.store.failWrite = "";
    await f.intake.replay(f.key);
    expect(f.committed.size).toBe(1);
    expect((await f.intake.status(f.attempt.token)).status).toBe("committed");
  });
  test("permanent failures are retained and can be explicitly retried", async () => {
    const f = await fixture();
    await f.intake.submit(f.attempt.token, f.command);
    f.backendStatus(422);
    await f.intake.replay(f.key);
    expect(f.store.records.has(f.key.replace("journal/", "failures/"))).toBe(true);
    f.backendStatus(200);
    await f.intake.replay(f.key);
    expect(f.committed.size).toBe(0);
    await f.intake.retry(f.key);
    await f.intake.replay(f.key);
    expect(f.committed.size).toBe(1);
  });
  test("retries and receipt reads survive closure and token expiration", async () => {
    const f = await fixture();
    const receipt = await f.intake.submit(f.attempt.token, f.command);
    await f.intake.publish({ ...f.manifest, revision: 2, closed: true });
    f.advance(MAX_POLICY_AGE_MS + 1);
    expect(await f.intake.submit(f.attempt.token, f.command)).toEqual(receipt);
    expect(await f.intake.status(f.attempt.token)).toEqual(receipt);
    await expect(f.intake.start(f.form.id)).rejects.toMatchObject({ status: 410 });
  });
  test("new acceptance fails closed when admission or policy expires", async () => {
    const f = await fixture();
    f.advance(MAX_POLICY_AGE_MS + 1);
    await expect(f.intake.submit(f.attempt.token, f.command)).rejects.toMatchObject({
      status: 410,
    });
    await expect(f.intake.start(f.form.id)).rejects.toMatchObject({ status: 503 });
  });
  test("republishing keeps existing attempts on their original version", async () => {
    const f = await fixture();
    const next = structuredClone(f.form);
    next.blocks = [{ ...f.question, type: "number" }];
    await f.intake.publish({ ...f.manifest, revision: 2, versionId: newId(), definition: next });
    await expect(f.intake.submit(f.attempt.token, f.command)).resolves.toMatchObject({
      status: "pending",
    });
    expect((await f.intake.resume(f.attempt.token)).definition).toEqual(f.form);
    expect((await f.intake.start(f.form.id)).versionId).not.toBe(f.attempt.versionId);
  });
  test("delayed sync cannot reopen a closed form or change immutable versions", async () => {
    const f = await fixture();
    await f.intake.publish({ ...f.manifest, revision: 2, closed: true });
    expect(await f.intake.publish(f.manifest)).toEqual({ revision: 2 });
    await expect(f.intake.start(f.form.id)).rejects.toMatchObject({ status: 410 });
    await expect(
      f.intake.publish({ ...f.manifest, revision: 3, definition: { ...f.form, title: "Changed" } }),
    ).rejects.toMatchObject({ status: 409 });
  });
  test("validation rejects missing required answers and tokens for other attempts", async () => {
    const f = await fixture();
    await expect(
      f.intake.submit(f.attempt.token, { ...f.command, answers: {} }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      f.intake.submit(f.attempt.token, { ...f.command, attemptId: newId() }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(f.intake.status(`${f.attempt.token}tampered`)).rejects.toMatchObject({
      status: 401,
    });
  });
  test("reconciliation advances across pages and wraps without stranding later entries", async () => {
    const f = await fixture();
    f.queueDown(true);
    for (let i = 0; i < 5; i++) {
      const a = await f.intake.start(f.form.id);
      await f.intake.submit(a.token, { ...f.command, attemptId: a.attemptId });
    }
    f.queueDown(false);
    await f.intake.reconcile();
    await f.intake.reconcile();
    await f.intake.reconcile();
    expect(new Set(f.queued).size).toBe(5);
    await f.intake.reconcile();
    expect(f.queued).toHaveLength(7);
  });
});

describe("custom domain registry", () => {
  test("a delayed activation cannot override a newer revocation", async () => {
    const f = await fixture();
    const domain = {
      hostname: "forms.example.com",
      revision: 100,
      active: true,
      formIds: [f.form.id],
      defaultFormId: f.form.id,
      validUntil: f.manifest.validUntil,
    };
    await f.intake.publishDomain(domain);
    expect((await f.intake.domain(domain.hostname)).defaultFormId).toBe(f.form.id);
    await f.intake.publishDomain({
      ...domain,
      revision: 102,
      active: false,
      formIds: [],
      defaultFormId: null,
    });
    expect(await f.intake.publishDomain({ ...domain, revision: 101 })).toEqual({ revision: 102 });
    await expect(f.intake.domain(domain.hostname)).rejects.toMatchObject({ status: 404 });
  });
  test("domain configuration fails closed at expiry and refuses a foreign default", async () => {
    const f = await fixture();
    const domain = {
      hostname: "forms.example.com",
      revision: 1,
      active: true,
      formIds: [f.form.id],
      defaultFormId: f.form.id,
      validUntil: f.manifest.validUntil,
    };
    await expect(
      f.intake.publishDomain({ ...domain, defaultFormId: newId() }),
    ).rejects.toMatchObject({ status: 422 });
    await f.intake.publishDomain(domain);
    f.advance(MAX_POLICY_AGE_MS + 1);
    await expect(f.intake.domain(domain.hostname)).rejects.toMatchObject({ status: 503 });
  });
  test("a new owner's global revision replaces the removed owner's route", async () => {
    const f = await fixture(),
      replacement = newId();
    const domain = {
      hostname: "forms.example.com",
      revision: 10,
      active: false,
      formIds: [],
      defaultFormId: null,
      validUntil: f.manifest.validUntil,
    };
    await f.intake.publishDomain(domain);
    await f.intake.publishDomain({
      ...domain,
      revision: 11,
      active: true,
      formIds: [replacement],
      defaultFormId: replacement,
    });
    const current = await f.intake.domain(domain.hostname);
    expect(current.formIds).toEqual([replacement]);
    expect(current.formIds).not.toContain(f.form.id);
  });
});
