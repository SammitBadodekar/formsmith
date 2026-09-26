import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { checkServerIdentity } from "node:tls";
import { isPublicRoutableHost } from "@better-auth/core/utils/host";

export function outboundUrl(input: string) {
  const url = new URL(input);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    (url.port && url.port !== "443")
  )
    throw new Error("Use a public HTTPS URL on port 443 without credentials or a fragment");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (!isPublicRoutableHost(hostname)) throw new Error("Destination must be public");
  return url;
}
type AddressResolver = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<{ address: string; family: number }[]>;
export async function publicAddresses(
  hostname: string,
  resolve: AddressResolver = lookup,
  signal: AbortSignal = AbortSignal.timeout(5000),
) {
  signal.throwIfAborted();
  const addresses = await new Promise<Awaited<ReturnType<AddressResolver>>>((accept, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    resolve(hostname.replace(/^\[|\]$/g, ""), { all: true, verbatim: true })
      .then(accept, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
  if (
    !addresses.length ||
    addresses.some((a) => !isIP(a.address) || !isPublicRoutableHost(a.address))
  )
    throw new Error("Destination must resolve exclusively to public addresses");
  return addresses;
}
// A literal connect address avoids relying on runtime-specific DNS callbacks.
// Host, SNI and certificate identity remain the validated original hostname.
export async function publicFetch(
  input: string,
  init: {
    method?: "GET" | "HEAD" | "POST";
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
    limit?: number;
  } = {},
) {
  const url = outboundUrl(input),
    hostname = url.hostname.replace(/^\[|\]$/g, "");
  const signal = init.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)])
    : AbortSignal.timeout(10000);
  const addresses = await publicAddresses(hostname, lookup, signal),
    pinned = addresses[0];
  if (!pinned) throw new Error("Destination did not resolve");
  return new Promise<Response>((resolve, reject) => {
    const request = httpsRequest(
      {
        hostname: pinned.address,
        family: pinned.family,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: init.method ?? "GET",
        agent: false,
        servername: isIP(hostname) ? undefined : hostname,
        checkServerIdentity: (_host, cert) => checkServerIdentity(hostname, cert),
        headers: {
          ...init.headers,
          host: url.host,
          ...(init.body ? { "content-length": String(Buffer.byteLength(init.body)) } : {}),
        },
        signal,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > (init.limit ?? 65536)) {
            response.destroy(new Error("Destination response exceeds the limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.once("error", reject);
        response.once("end", () => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(response.headers))
            if (value !== undefined)
              headers.set(key, Array.isArray(value) ? value.join(", ") : value);
          const status = response.statusCode ?? 502;
          resolve(
            new Response(
              init.method === "HEAD" || [204, 205, 304].includes(status)
                ? null
                : Buffer.concat(chunks),
              { status, headers },
            ),
          );
        });
      },
    );
    request.once("error", reject);
    request.end(init.body);
  });
}
