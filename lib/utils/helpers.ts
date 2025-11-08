import { uniqueNamesGenerator, adjectives } from "unique-names-generator";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { form as formTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Sanitize a string to be URL-safe
 */
export const sanitizeUrlString = (str: string) => {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

/**
 * Check if a domain already exists in the database
 */
export const checkIfDomainExists = async (domain: string) => {
  const result = await db
    .select({ form_name: formTable.name })
    .from(formTable)
    .where(eq(formTable.domain, domain))
    .limit(1);
  return result.length > 0;
};

/**
 * Generate a unique domain name for a form
 * If the sanitized name exists, append adjective + random ID
 */
export const getUniqueDomainName = async (name: string) => {
  let sanitizedName = sanitizeUrlString(name);
  const nameExists = await checkIfDomainExists(sanitizedName);

  if (!nameExists) {
    return sanitizedName;
  }

  const customConfig = {
    dictionaries: [[sanitizedName], adjectives],
    separator: "-",
    length: 1,
    style: "lowerCase" as const,
  };

  return (
    uniqueNamesGenerator(customConfig) + `-${nanoid(5).toLowerCase()}`
  );
};
