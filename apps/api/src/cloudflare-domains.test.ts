import { expect, test } from "bun:test";
import { cloudflareDomains } from "./cloudflare-domains";

test("custom hostname routing reconciles a lost create reply and preserves unrelated Workers", async () => {
  const routes = [{ id: "unrelated", pattern: "other.example/*", script: "other-app" }];
  let lost = true,
    creates = 0;
  const provider = cloudflareDomains(
    {
      CLOUDFLARE_ZONE_ID: "zone",
      CLOUDFLARE_API_TOKEN: "test",
      CLOUDFLARE_GATEWAY_WORKER: "formsmith-dashboard",
    },
    async (url, init) => {
      expect(url).toStartWith("https://api.cloudflare.com/client/v4/zones/zone/workers/routes");
      if (init.method === "POST") {
        const input = JSON.parse(String(init.body));
        creates++;
        routes.push({ id: "formsmith", ...input });
        if (lost) {
          lost = false;
          throw new Error("Lost provider reply");
        }
      }
      if (init.method === "DELETE") {
        const id = url.split("/").at(-1);
        const index = routes.findIndex((r) => r.id === id);
        if (index >= 0) routes.splice(index, 1);
      }
      return Response.json({ success: true, result: routes });
    },
  );
  await expect(provider.ensureRoute("forms.customer.example")).rejects.toThrow(
    "Lost provider reply",
  );
  await provider.ensureRoute("forms.customer.example");
  expect(creates).toBe(1);
  await expect(provider.ensureRoute("other.example")).rejects.toThrow(
    "different Cloudflare Worker",
  );
  await provider.removeRoute("other.example");
  expect(routes).toHaveLength(2);
  await provider.removeRoute("forms.customer.example");
  await provider.removeRoute("forms.customer.example");
  expect(routes).toEqual([{ id: "unrelated", pattern: "other.example/*", script: "other-app" }]);
});
