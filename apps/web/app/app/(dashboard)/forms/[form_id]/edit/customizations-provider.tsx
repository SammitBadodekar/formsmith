"use client";

import FormNotFound from "@/app/error";
import FormsLoading from "@/components/skeletons/forms-loading";
import { getForm } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { Provider, createStore } from "jotai";
import { useRef } from "react";
import { useHydrateAtoms } from "jotai/utils";
import { formCustomizationAtom } from "@/lib/atoms";
import {
  defaultFormCustomizations,
  FormCustomizations,
} from "@formsmith/shared";

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
  customizations?: any;
}) {
  const store = useRef(createStore()).current;

  if (customizations) {
    return (
      <Provider key={formId} store={store}>
        <Hydrator formId={formId} customization={customizations}>
          {children}
        </Hydrator>
      </Provider>
    );
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ["getForm", formId] as const,
    queryFn: ({ queryKey: [, id] }) => getForm(id),
    staleTime: 0,
  });

  if (isLoading) return <FormsLoading />;
  if (isError || !data?.data?.form) return <FormNotFound />;

  const fromDb = (data?.data?.form?.customizations as FormCustomizations) ?? {};
  const initial = { ...defaultFormCustomizations, ...fromDb };

  console.log("setting initial customizations", initial);

  return (
    <Provider key={formId} store={store}>
      <Hydrator formId={formId} customization={initial}>
        {children}
      </Hydrator>
    </Provider>
  );
}
