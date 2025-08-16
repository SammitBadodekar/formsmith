"use client";
import React from "react";
import { SessionProvider } from "./session-provider";
import { SessionValidationResult } from "@/lib/auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "./get-query-client";
import posthog from "posthog-js";

const Providers = ({
  children,
  sessionData,
}: {
  children: React.ReactNode;
  sessionData: SessionValidationResult;
}) => {
  const queryClient = getQueryClient();

  if (sessionData?.user) {
    posthog.identify(sessionData?.user?.id, { ...sessionData.user });
  }
  return (
    <SessionProvider value={sessionData}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
};

export default Providers;
