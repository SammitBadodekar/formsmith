import {
  type FormDefinition,
  formSchema,
  hashPayload,
  idSchema,
  newId,
  questions,
  submissionSchema,
  validateAnswers,
  validateDefinition,
} from "@formsmith/core";
import {
  type Admission,
  type CommitResult,
  commitResultSchema,
  controlHeaders,
  domainManifestSchema,
  issueAdmission,
  type JournalEntry,
  journalEntrySchema,
  MAX_POLICY_AGE_MS,
  type Manifest,
  manifestSchema,
  readBoundedBody,
  uploadProofSchema,
  verifyAdmission,
} from "@formsmith/core/intake";

export interface ObjectStore {
  get(key: string): Promise<{ body: string; etag: string } | null>;
  put(key: string, body: string, condition?: { etag: string } | { absent: true }): Promise<boolean>;
  delete(key: string): Promise<void>;
  list(
    prefix: string,
    cursor?: string,
    limit?: number,
  ): Promise<{ keys: string[]; cursor?: string }>;
}
export interface IntakeOptions {
  store: ObjectStore;
  enqueue: (key: string) => Promise<void>;
  send: (request: Request) => Promise<Response>;
  admissionKeys: Record<string, string>;
  controlKeys: Record<string, string>;
  activeKeyId: string;
  apiUrl: string;
  now?: () => number;
  report?: (event: string, receiptId?: string) => void;
}
export class IntakeError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
const journalKey = (formId: string, attemptId: string) => `journal/${formId}/${attemptId}`;
const related = (key: string, prefix: string) => key.replace(/^journal\//, `${prefix}/`);
export function isJournalKey(key: unknown): key is string {
  return (
    typeof key === "string" && /^journal\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}\/[0-9a-f-]{36}$/.test(key)
  );
}

export class Intake {
  private now: () => number;
  constructor(private options: IntakeOptions) {
    this.now = options.now ?? Date.now;
  }
  private async read<T>(key: string, parse: (input: unknown) => T): Promise<T | null> {
    const record = await this.options.store.get(key);
    return record ? parse(JSON.parse(record.body)) : null;
  }
  private async getPolicy(formId: string): Promise<Manifest> {
    const manifest = await this.read(`forms/${formId}`, (value) => manifestSchema.parse(value));
    if (!manifest) throw new IntakeError(404, "Form not found");
    if (manifest.closed) throw new IntakeError(410, "This form is closed");
    if (manifest.validUntil <= this.now())
      throw new IntakeError(503, "Form availability must be refreshed. Please retry shortly.");
    return manifest;
  }
  async domain(hostname: string) {
    const record = await this.read(`domains/${hostname}`, (input) =>
      domainManifestSchema.parse(input),
    );
    if (!record?.active || record.hostname !== hostname)
      throw new IntakeError(404, "Domain is not connected");
    if (record.validUntil <= this.now())
      throw new IntakeError(503, "Domain availability must be refreshed");
    return record;
  }
  async publishDomain(input: unknown) {
    const manifest = domainManifestSchema.parse(input),
      key = `domains/${manifest.hostname}`;
    if (manifest.validUntil <= this.now() || manifest.validUntil > this.now() + MAX_POLICY_AGE_MS)
      throw new IntakeError(422, "Invalid domain availability lease");
    if (manifest.defaultFormId && !manifest.formIds.includes(manifest.defaultFormId))
      throw new IntakeError(422, "Default form must belong to this domain's workspace");
    for (let tries = 0; tries < 5; tries++) {
      const current = await this.options.store.get(key);
      if (current) {
        const previous = domainManifestSchema.parse(JSON.parse(current.body));
        if (previous.revision > manifest.revision) return { revision: previous.revision };
        if (previous.revision === manifest.revision) {
          if ((await hashPayload(previous)) !== (await hashPayload(manifest)))
            throw new IntakeError(409, "Domain revision already has different contents");
          return { revision: previous.revision };
        }
      }
      if (
        await this.options.store.put(
          key,
          JSON.stringify(manifest),
          current ? { etag: current.etag } : { absent: true },
        )
      )
        return { revision: manifest.revision };
    }
    throw new IntakeError(409, "Domain changed concurrently");
  }
  async publish(input: unknown): Promise<{ revision: number }> {
    const manifest = manifestSchema.parse(input);
    const problems = validateDefinition(manifest.definition);
    if (problems.length) throw new IntakeError(422, "Repair this form before publishing", problems);
    if (manifest.validUntil <= this.now() || manifest.validUntil > this.now() + MAX_POLICY_AGE_MS)
      throw new IntakeError(422, "Availability lease must expire within 24 hours");
    const formId = manifest.definition.id;
    const definition = JSON.stringify(manifest.definition);
    const versionKey = `versions/${formId}/${manifest.versionId}`;
    const inserted = await this.options.store.put(versionKey, definition, { absent: true });
    if (!inserted) {
      const existing = await this.read(versionKey, (value) => formSchema.parse(value));
      if ((await hashPayload(existing)) !== (await hashPayload(manifest.definition)))
        throw new IntakeError(409, "Published versions are immutable");
    }
    const key = `forms/${formId}`;
    const body = JSON.stringify(manifest);
    for (let tries = 0; tries < 5; tries++) {
      const current = await this.options.store.get(key);
      if (current) {
        const previous = manifestSchema.parse(JSON.parse(current.body));
        if (previous.revision > manifest.revision) return { revision: previous.revision };
        if (previous.revision === manifest.revision) {
          if ((await hashPayload(previous)) !== (await hashPayload(manifest)))
            throw new IntakeError(409, "Revision already has different contents");
          return { revision: previous.revision };
        }
      }
      if (
        await this.options.store.put(key, body, current ? { etag: current.etag } : { absent: true })
      )
        return { revision: manifest.revision };
    }
    throw new IntakeError(409, "Publication changed concurrently. Retry synchronization.");
  }
  async finalizeUpload(input: unknown) {
    const proof = uploadProofSchema.parse(input),
      key = `uploads/${proof.id}`;
    if (!(await this.options.store.put(key, JSON.stringify(proof), { absent: true }))) {
      const existing = await this.read(key, (value) => uploadProofSchema.parse(value));
      if ((await hashPayload(existing)) !== (await hashPayload(proof)))
        throw new IntakeError(409, "Upload identity already finalized differently");
    }
    return { id: proof.id };
  }
  async start(formId: string) {
    const manifest = await this.getPolicy(formId);
    const admission: Admission = {
      purpose: "formsmith-attempt-v1",
      formId,
      versionId: manifest.versionId,
      definitionHash: await hashPayload(manifest.definition),
      attemptId: newId(),
      issuedAt: this.now(),
      expiresAt: Math.min(this.now() + MAX_POLICY_AGE_MS, manifest.validUntil),
    };
    return {
      definition: manifest.definition,
      versionId: manifest.versionId,
      attemptId: admission.attemptId,
      expiresAt: admission.expiresAt,
      token: await issueAdmission(admission, this.options.admissionKeys, this.options.activeKeyId),
    };
  }
  private async authenticate(token: string): Promise<Admission> {
    const admission = await verifyAdmission(token, this.options.admissionKeys);
    if (!admission) throw new IntakeError(401, "Invalid attempt token");
    return admission;
  }
  async resume(token: string) {
    const admission = await this.authenticate(token);
    const definition = await this.read(
      `versions/${admission.formId}/${admission.versionId}`,
      (value) => formSchema.parse(value),
    );
    if (!definition) throw new IntakeError(404, "Published version unavailable");
    return {
      definition,
      versionId: admission.versionId,
      attemptId: admission.attemptId,
      expiresAt: admission.expiresAt,
    };
  }
  private async receipt(entry: JournalEntry) {
    const key = journalKey(entry.command.formId, entry.command.attemptId);
    const result = await this.read(related(key, "results"), (value) =>
      commitResultSchema.parse(value),
    );
    return {
      id: entry.receiptId,
      attemptId: entry.command.attemptId,
      receivedAt: entry.receivedAt,
      status: result ? ("committed" as const) : ("pending" as const),
    };
  }
  async status(token: string) {
    const admission = await this.authenticate(token);
    const entry = await this.read(journalKey(admission.formId, admission.attemptId), (value) =>
      journalEntrySchema.parse(value),
    );
    if (!entry) throw new IntakeError(404, "No submission received for this attempt");
    return this.receipt(entry);
  }
  async submit(token: string, input: unknown) {
    const admission = await this.authenticate(token);
    const command = submissionSchema.parse(input);
    if (
      command.formId !== admission.formId ||
      command.versionId !== admission.versionId ||
      command.attemptId !== admission.attemptId
    )
      throw new IntakeError(403, "Attempt does not match this submission");
    const requestHash = await hashPayload(command);
    const key = journalKey(command.formId, command.attemptId);
    const previous = await this.read(key, (value) => journalEntrySchema.parse(value));
    if (previous) {
      if (previous.requestHash !== requestHash)
        throw new IntakeError(409, "This attempt already received different answers");
      return this.receipt(previous);
    }
    if (admission.expiresAt <= this.now())
      throw new IntakeError(410, "This attempt expired. Start a new attempt to submit.");
    if (command.honeypot) throw new IntakeError(422, "Submission could not be accepted");
    await this.getPolicy(command.formId);
    const definition: FormDefinition | null = await this.read(
      `versions/${command.formId}/${command.versionId}`,
      (value) => formSchema.parse(value),
    );
    if (!definition || (await hashPayload(definition)) !== admission.definitionHash)
      throw new IntakeError(503, "Published version unavailable");
    const checked = validateAnswers(definition, command.answers);
    if (!checked.valid) throw new IntakeError(422, "Check your answers", checked.errors);
    for (const question of questions(definition)) {
      if (question.type !== "file") continue;
      const ids = checked.answers[question.id];
      if (!Array.isArray(ids)) continue;
      for (const id of ids) {
        const proof = await this.read(`uploads/${id}`, (value) => uploadProofSchema.parse(value));
        if (
          !proof ||
          proof.formId !== command.formId ||
          proof.attemptId !== command.attemptId ||
          proof.questionId !== question.id
        )
          throw new IntakeError(422, "Finish uploading every file before submitting", {
            [question.id]: "Upload is not finalized",
          });
      }
    }
    const entry: JournalEntry = {
      protocolVersion: 1,
      receiptId: newId(),
      receivedAt: new Date(this.now()).toISOString(),
      requestHash,
      definitionHash: admission.definitionHash,
      command: { ...command, answers: checked.answers },
    };
    // Index before journal: enqueue failure or a crash cannot strand a receipt.
    await this.options.store.put(
      related(key, "pending"),
      JSON.stringify({ createdAt: this.now() }),
      { absent: true },
    );
    const inserted = await this.options.store.put(key, JSON.stringify(entry), { absent: true });
    const saved = inserted
      ? entry
      : await this.read(key, (value) => journalEntrySchema.parse(value));
    if (!saved)
      throw new IntakeError(503, "Submission outcome is unknown. Retry this same attempt.");
    if (saved.requestHash !== requestHash)
      throw new IntakeError(409, "This attempt already received different answers");
    // Queue availability is not the durability boundary: the journal is.
    try {
      await this.options.enqueue(key);
    } catch {
      this.options.report?.("intake.enqueue_failed", saved.receiptId);
    }
    return this.receipt(saved);
  }
  async replay(key: string, recovering = false): Promise<void> {
    if (!isJournalKey(key)) throw new IntakeError(400, "Invalid journal key");
    const entry = await this.read(key, (value) => journalEntrySchema.parse(value));
    if (!entry) {
      if (recovering) throw new IntakeError(503, "Journal entry disappeared during recovery");
      return;
    }
    const resultKey = related(key, "results");
    if (!recovering && (await this.options.store.get(resultKey))) {
      await this.options.store.delete(related(key, "pending"));
      return;
    }
    if (!recovering && (await this.options.store.get(related(key, "failures")))) return;
    const url = new URL("/api/internal/intake/commit", this.options.apiUrl);
    const body = JSON.stringify(entry);
    const headers = await controlHeaders(
      "POST",
      url.pathname,
      body,
      this.options.controlKeys,
      this.options.activeKeyId,
      this.now(),
    );
    const response = await this.options.send(
      new Request(url, {
        method: "POST",
        headers,
        body,
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      }),
    );
    if (response.status === 409 || response.status === 422) {
      await response.body?.cancel();
      await this.options.store.put(
        related(key, "failures"),
        JSON.stringify({ status: response.status, at: this.now(), receiptId: entry.receiptId }),
        { absent: true },
      );
      this.options.report?.("intake.replay_needs_attention", entry.receiptId);
      if (recovering)
        throw new IntakeError(503, "Repair the journal conflict before continuing recovery");
      return;
    }
    if (response.status !== 200) {
      await response.body?.cancel();
      throw new Error("Submission backend unavailable");
    }
    const result: CommitResult = commitResultSchema.parse(
      JSON.parse(await readBoundedBody(response.body, 4096)),
    );
    if (result.receiptId !== entry.receiptId || result.requestHash !== entry.requestHash)
      throw new Error("Backend acknowledgement does not match journal");
    await this.options.store.put(
      resultKey,
      JSON.stringify(result),
      recovering ? undefined : { absent: true },
    );
    if (recovering) await this.options.store.delete(related(key, "failures"));
    await this.options.store.delete(related(key, "pending"));
  }
  async recover(formId: string, cursor?: string) {
    const prefix = `journal/${idSchema.parse(formId)}/`;
    const page = await this.options.store.list(prefix, cursor, 25);
    // Recovery is explicit and synchronous. A page is acknowledged only after
    // the restored database confirms every entry, irrespective of old markers.
    // Retry a failed page from its original cursor; commits remain idempotent.
    for (let offset = 0; offset < page.keys.length; offset += 5) {
      const results = await Promise.allSettled(
        page.keys.slice(offset, offset + 5).map(async (key) => {
          if (!key.startsWith(prefix) || !isJournalKey(key))
            throw new IntakeError(503, "Invalid journal entry in recovery page");
          return this.replay(key, true);
        }),
      );
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
    }
    return { recovered: page.keys.length, cursor: page.cursor ?? null };
  }
  async reconcile(): Promise<void> {
    const checkpoint = await this.options.store.get("maintenance/pending-cursor");
    const page = await this.options.store.list("pending/", checkpoint?.body || undefined);
    for (const marker of page.keys) {
      const key = marker.replace(/^pending\//, "journal/");
      if (!isJournalKey(key)) continue;
      if (await this.options.store.get(related(key, "results"))) {
        await this.options.store.delete(marker);
        continue;
      }
      if (await this.options.store.get(related(key, "failures"))) continue;
      if (!(await this.options.store.get(key))) continue;
      // On failure do not advance the cursor; the next scheduled run retries.
      await this.options.enqueue(key);
    }
    await this.options.store.put(
      "maintenance/pending-cursor",
      page.cursor ?? "",
      checkpoint ? { etag: checkpoint.etag } : { absent: true },
    );
  }
  async retry(key: string) {
    if (!isJournalKey(key)) throw new IntakeError(400, "Invalid journal key");
    if (!(await this.options.store.get(key))) throw new IntakeError(404, "Receipt not found");
    await this.options.store.delete(related(key, "failures"));
    await this.options.enqueue(key);
  }
}
