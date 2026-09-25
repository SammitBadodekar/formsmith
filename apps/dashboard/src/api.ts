import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import type { FormDefinition } from "@formsmith/core";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({ plugins: [oauthProviderClient()] });
export type FormRecord = {
  id: string;
  draft: FormDefinition;
  revision: number;
  policyRevision: number;
  syncedPolicyRevision: number;
  publishedVersionId: string | null;
  closed: boolean;
  updatedAt: string;
};
export type FormSummary = Pick<
  FormRecord,
  "id" | "revision" | "publishedVersionId" | "closed" | "updatedAt"
> & { title: string };
export type Page<T> = { items: T[]; nextCursor: string | null };
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    headers: options.body === undefined ? undefined : { "content-type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(data.error ?? "Request failed", response.status, data.details);
  return data as T;
}
