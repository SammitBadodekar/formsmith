import { atom } from "jotai";
import {
  defaultFormCustomizations,
  FormCustomizations,
} from "@formsmith/shared";

export const formCustomizationAtom = atom<FormCustomizations>({
  ...defaultFormCustomizations,
});
