"use client";

import { Provider, createStore } from "jotai";
import { useRef } from "react";
import { useHydrateAtoms } from "jotai/utils";
import { formCustomizationAtom } from "@/lib/atoms";
import {
  defaultFormCustomizations,
  FormCustomizations,
} from "@/lib/shared";

function Hydrator({
  formId,
  customization,
  children,
}: {
  formId: string;
  customization: FormCustomizations;
  children: React.ReactNode;
}) {
  // Re-hydrate when formId changes (key forces remount of Hydrator only)
  useHydrateAtoms([[formCustomizationAtom, customization]]);
  return <>{children}</>;
}

export function CustomizationsStoreProvider({
  formId,
  children,
  customizations,
}: {
  formId: string;
  children: React.ReactNode;
  customizations: any;
}) {
  const store = useRef(createStore()).current;
  const fromDb = (customizations as FormCustomizations) ?? {};
  const initial = { ...defaultFormCustomizations, ...fromDb };

  return (
    <Provider key={formId} store={store}>
      <Hydrator formId={formId} customization={initial}>
        {children}
      </Hydrator>
    </Provider>
  );
}
