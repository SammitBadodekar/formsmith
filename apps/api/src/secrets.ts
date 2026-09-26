const encoder = new TextEncoder();
function bytes(key: string) {
  if (!/^[a-f0-9]{64}$/i.test(key))
    throw new Error("ENCRYPTION_KEY must contain 32 random bytes in hex");
  return Uint8Array.from(key.match(/../g) ?? [], (hex) => Number.parseInt(hex, 16));
}
export async function encryptSecret(value: string, key: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12)),
    cryptoKey = await crypto.subtle.importKey("raw", bytes(key), "AES-GCM", false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode("formsmith-secret-v1") },
    cryptoKey,
    encoder.encode(value),
  );
  return `v1.${Buffer.from(iv).toString("base64url")}.${Buffer.from(encrypted).toString("base64url")}`;
}
export async function decryptSecret(value: string, key: string) {
  const [version, iv, body] = value.split(".");
  if (version !== "v1" || !iv || !body) throw new Error("Invalid encrypted secret");
  const cryptoKey = await crypto.subtle.importKey("raw", bytes(key), "AES-GCM", false, ["decrypt"]);
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: Buffer.from(iv, "base64url"),
        additionalData: encoder.encode("formsmith-secret-v1"),
      },
      cryptoKey,
      Buffer.from(body, "base64url"),
    ),
  );
}
export async function webhookSignature(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${id}.${timestamp}.${body}`),
  );
  return `v1,${Buffer.from(signed).toString("base64")}`;
}
