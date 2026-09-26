import { expect, test } from "bun:test";
import { outboundUrl, publicAddresses } from "./outbound";
import { decryptSecret, encryptSecret, webhookSignature } from "./secrets";

test("outbound destinations reject private, credentialed and ambiguous URLs", () => {
  for (const url of [
    "http://example.com",
    "https://user:pass@example.com",
    "https://127.0.0.1",
    "https://[::1]",
    "https://169.254.169.254/latest",
    "https://0x7f000001",
    "https://10.0.0.1",
    "https://example.com:8443",
    "https://example.com/#fragment",
  ])
    expect(() => outboundUrl(url)).toThrow();
  expect(outboundUrl("https://example.com/webhook").hostname).toBe("example.com");
});
test("every resolved address must be public, including mixed-answer DNS rebinding", async () => {
  const mixed = async () => [
    { address: "1.1.1.1", family: 4 },
    { address: "127.0.0.1", family: 4 },
  ];
  // This overload is the exact all-address DNS lookup contract used by transport.
  await expect(publicAddresses("example.com", mixed)).rejects.toThrow("public addresses");
});
test("a stuck DNS lookup cannot hold a delivery indefinitely", async () => {
  const controller = new AbortController();
  const pending = publicAddresses("example.com", () => new Promise(() => {}), controller.signal);
  controller.abort(new Error("DNS deadline exceeded"));
  await expect(pending).rejects.toThrow("DNS deadline exceeded");
});
test("stored connector secrets are authenticated and signatures bind event and payload", async () => {
  const key = "a".repeat(64),
    plaintext = "test-secret";
  const encrypted = await encryptSecret(plaintext, key);
  expect(encrypted).not.toContain(plaintext);
  expect(await decryptSecret(encrypted, key)).toBe(plaintext);
  await expect(decryptSecret(encrypted, "b".repeat(64))).rejects.toThrow();
  expect(await webhookSignature(plaintext, "event", "100", "{}")).not.toBe(
    await webhookSignature(plaintext, "event", "100", "[]"),
  );
});
