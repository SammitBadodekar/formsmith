"use client";
import React from "react";
import { Provider } from "jotai";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return <Provider>{children}</Provider>;
};

export default Providers;
