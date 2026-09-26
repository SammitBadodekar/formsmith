import { afterAll, beforeAll, expect, test } from "bun:test";
import { newId } from "@formsmith/core";
import { eq, inArray, sql } from "drizzle-orm";
import { connectDatabase } from "../src/db";
import { customDomains, forms, jobs, user, workspaces } from "../src/db/schema";
import { domainService, normalizeHostname } from "../src/domains";
import { repository } from "../src/repository";

const url = process.env.DATABASE_URL;
if (!url || new URL(url).hostname !== "127.0.0.1" || new URL(url).port !== "54329")
  throw new Error("Use the isolated integration database");
const { db, client } = connectDatabase(url, 5),
  repo = repository(db);
const owners = [newId(), newId()],
  workspaceIds: string[] = [],
  records = new Map<string, string[][]>();
const service = domainService(db, {
  canonicalHost: "formsmith.samz.in",
  cnameTarget: "forms.formsmith.samz.in",
  resolve: async (name) => records.get(name) ?? [],
});
beforeAll(async () => {
  for (const owner of owners) {
    await db
      .insert(user)
      .values({ id: owner, name: "Domain test", email: `${owner}@example.invalid` });
    workspaceIds.push((await repo.workspace(owner)).id);
  }
});
afterAll(async () => {
  await db.delete(jobs).where(
    sql`${jobs.payload}->>'domainId' IN (SELECT id::text FROM custom_domains WHERE workspace_id IN (${sql.join(
      workspaceIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )}))`,
  );
  await db.delete(customDomains).where(inArray(customDomains.workspaceId, workspaceIds));
  await db.delete(forms).where(inArray(forms.workspaceId, workspaceIds));
  await db.delete(workspaces).where(inArray(workspaces.id, workspaceIds));
  await db.delete(user).where(inArray(user.id, owners));
  await client.end();
});
test("hostname normalization rejects URL tricks, IP addresses and service hosts", () => {
  expect(normalizeHostname(" FORMS.Example.COM. ", [])).toBe("forms.example.com");
  for (const host of [
    "https://forms.example.com",
    "forms.example.com:443",
    "127.0.0.1",
    "a.localhost",
    "a.local",
    "*.example.com",
    "formsmith.samz.in",
    "x.formsmith.samz.in",
    "a..com",
    "user@example.com",
    "example.com/path",
    "example.com%00",
  ])
    expect(() => normalizeHostname(host, ["formsmith.samz.in"])).toThrow();
});
test("an unverified claim cannot squat on another owner's hostname", async () => {
  const hostname = `forms-${newId()}.example.com`;
  const a = await service.add(owners[0] as string, hostname),
    b = await service.add(owners[1] as string, hostname);
  await expect(service.verify(owners[0] as string, a.id)).rejects.toMatchObject({ status: 422 });
  records.set(`_formsmith.${hostname}`, [[b.verificationToken]]);
  await expect(service.verify(owners[1] as string, b.id)).resolves.toMatchObject({
    status: "provisioning",
  });
  await expect(service.verify(owners[0] as string, a.id)).rejects.toMatchObject({ status: 422 });
  const queued = await db.select().from(jobs).where(sql`${jobs.payload}->>'domainId' = ${b.id}`);
  expect(queued).toHaveLength(1);
});
test("concurrent ownership verification cannot activate the same hostname twice", async () => {
  const hostname = `race-${newId()}.example.com`;
  const a = await service.add(owners[0] as string, hostname),
    b = await service.add(owners[1] as string, hostname);
  records.set(`_formsmith.${hostname}`, [[a.verificationToken], [b.verificationToken]]);
  const results = await Promise.allSettled([
    service.verify(owners[0] as string, a.id),
    service.verify(owners[1] as string, b.id),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const rows = await db.select().from(customDomains).where(eq(customDomains.hostname, hostname));
  expect(rows.filter((r) => r.verifiedAt)).toHaveLength(1);
});
test("default form and domain management respect workspace boundaries", async () => {
  const foreign = await repo.create(owners[1] as string);
  if (!foreign) throw new Error("Fixture missing");
  const domain = await service.add(owners[0] as string, `owner-${newId()}.example.com`);
  await expect(service.configure(owners[0] as string, domain.id, foreign.id)).rejects.toMatchObject(
    { status: 404 },
  );
  await expect(service.remove(owners[1] as string, domain.id)).rejects.toMatchObject({
    status: 404,
  });
});
test("removal retains verified ownership until edge revocation completes", async () => {
  const hostname = `remove-${newId()}.example.com`,
    domain = await service.add(owners[0] as string, hostname);
  records.set(`_formsmith.${hostname}`, [[domain.verificationToken]]);
  await service.verify(owners[0] as string, domain.id);
  const result = await service.remove(owners[0] as string, domain.id);
  expect(result.status).toBe("removing");
  expect(result.verifiedAt).not.toBeNull();
});
