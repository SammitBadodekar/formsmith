"use client";
import React from "react";
import { SessionProvider } from "./session-provider";
import { SessionValidationResult } from "@/lib/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "jotai";

const queryClient = new QueryClient();

const Providers = ({
  children,
  sessionData,
}: {
  children: React.ReactNode;
  sessionData: SessionValidationResult;
}) => {
  return (
    <SessionProvider value={sessionData}>
      <QueryClientProvider client={queryClient}>
        <Provider>{children}</Provider>
      </QueryClientProvider>
    </SessionProvider>
  );
};

export default Providers;
