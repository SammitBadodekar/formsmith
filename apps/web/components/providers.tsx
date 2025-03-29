import React from "react";
import { SessionProvider } from "./session-provider";
import { SessionValidationResult } from "@/lib/auth";

const Providers = ({
  children,
  sessionData,
}: {
  children: React.ReactNode;
  sessionData: SessionValidationResult;
}) => {
  return <SessionProvider value={sessionData}>{children}</SessionProvider>;
};

export default Providers;
