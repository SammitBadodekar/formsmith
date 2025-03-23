"use client";
import { Button } from "@/components/ui/button";
import { signIn, useSession } from "@/lib/auth-client";
import React from "react";

const LoginForm = () => {
  return (
    <div>
      <Button
        onClick={async () => {
          const data = await signIn.social({
            provider: "google",
          });
        }}
      >
        Google Login
      </Button>
      <Button
        onClick={async () => {
          const data = await signIn.social({
            provider: "github",
            callbackURL: "/",
          });
        }}
      >
        Github Login
      </Button>
    </div>
  );
};

export default LoginForm;
