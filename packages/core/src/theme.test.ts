import { expect, test } from "bun:test";
import { createForm, formSchema, themeSchema } from "./model";

test("existing definitions retain their serialized theme when parsed", () => {
  const form = createForm();
  const serialized = JSON.stringify(form);
  expect(JSON.stringify(formSchema.parse(JSON.parse(serialized)))).toBe(serialized);
  expect(Object.hasOwn(formSchema.parse(form).theme, "inputWidth")).toBe(false);
});

test("independent input and button appearance survives form export and import", () => {
  const form = createForm();
  Object.assign(form.theme, {
    inputRadius: 2,
    buttonRadius: 24,
    inputWidthMode: "full",
    buttonWidthMode: "fixed",
    buttonWidth: 180,
    inputBorder: "#3d3b3529",
    font: "Georgia",
    coverHeight: 200,
    coverHeightUnit: "px",
  });
  expect(formSchema.parse(JSON.parse(JSON.stringify(form))).theme).toEqual(form.theme);
});

test("theme rejects executable CSS values and invalid dimensions", () => {
  const theme = createForm().theme;
  expect(
    themeSchema.safeParse({ ...theme, inputBackground: "url(https://example.com)" }).success,
  ).toBe(false);
  expect(themeSchema.safeParse({ ...theme, font: "unknown;font-size:0" }).success).toBe(false);
  expect(themeSchema.safeParse({ ...theme, inputWidth: -1 }).success).toBe(false);
  expect(themeSchema.safeParse({ ...theme, buttonHeight: 10000 }).success).toBe(false);
});
