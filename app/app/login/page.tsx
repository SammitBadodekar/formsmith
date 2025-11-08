"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const GoogleIcon = (props: React.ComponentProps<"svg">) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: process.env.NEXT_PUBLIC_APP_URL,
    });
  };

  const handleGithubSignIn = async () => {
    setIsLoading(true);
    await authClient.signIn.social({
      provider: "github",
      callbackURL: process.env.NEXT_PUBLIC_APP_URL,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
        <div className="flex justify-center flex-col items-center w-full sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex items-center space-x-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-lg font-bold">F</span>
            </div>
            <p className="text-lg font-medium">Formsmith</p>
          </div>
          <h3 className="mt-6 text-lg font-semibold">
            Sign in to your account
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome! Please sign in to continue
          </p>
          <div className="mt-8 flex flex-col space-y-3 w-full ">
            <Button
              variant="outline"
              className="flex items-center justify-center space-x-2 cursor-pointer"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <GoogleIcon className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">Continue with Google</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-center space-x-2 cursor-pointer"
              onClick={handleGithubSignIn}
              disabled={isLoading}
            >
              <GithubIcon className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">Continue with GitHub</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
