import { z } from "zod";

export const createStringSchema = (blockProps: any) => {
  let schema = z.string();

  if (blockProps.required) {
    schema = schema.min(1, {
      message: blockProps.customErrorMessage || "This field is required.",
    });
  }
  if (blockProps.minLength) {
    schema = schema.min(blockProps.minLength, {
      message: `Minimum length is ${blockProps.minLength}.`,
    });
  }
  if (blockProps.maxLength) {
    schema = schema.max(blockProps.maxLength, {
      message: `Maximum length is ${blockProps.maxLength}.`,
    });
  }
  if (blockProps.pattern) {
    try {
      const regex = new RegExp(blockProps.pattern);
      schema = schema.regex(regex, { message: "Invalid format." });
    } catch (e) {
      console.warn(
        "Invalid regex pattern provided for block:",
        blockProps.pattern,
      );
    }
  }
  // Allow an empty string if not required and no minLength > 0
  if (
    !blockProps.required &&
    (blockProps.minLength === undefined || blockProps.minLength === 0)
  ) {
    // @ts-ignore
    schema = schema.optional().or(z.literal(""));
  }

  return schema;
};

export const shortAnswerSchema = createStringSchema;
export const longAnswerSchema = createStringSchema;
