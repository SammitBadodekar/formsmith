import { ReactNode, useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { useNavigate } from "react-router";

export function Authenticated({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("here in auth", { isAuthenticated, isLoading });
    if (!isAuthenticated && !isLoading) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <>Loading...</>;
  }

  if (!isAuthenticated) {
    return <></>;
  }

  return <>{children}</>;
}

export function Unauthenticated({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <>Loading...</>;
  }
  if (isAuthenticated) {
    return <></>;
  }
  return <>{children}</>;
}
