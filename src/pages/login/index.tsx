import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthActions } from "@convex-dev/auth/react";
import { BookText, Github } from "lucide-react";
import { Link } from "react-router";

const LoginPage = () => {
  const { signIn } = useAuthActions();
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-white p-4">
      <Link
        to={"/"}
        className="flex items-center gap-2 self-center font-black text-xl p-2"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-thin text-base">
          <BookText />
        </div>
        Formsmith
      </Link>
      <Card className="w-full max-w-lg overflow-hidden shadow-xl selection:rounded-lg">
        <div className="grid gap-2 md:grid-cols-1">
          {/* Login Section */}
          <div className="flex-1 p-4 md:px-8 md:py-4">
            <CardHeader className="text-center text-lg">
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>
                Login with your Apple or Google account
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-6 space-y-6">
              <div className="grid gap-6">
                <div className="flex flex-col gap-4">
                  <Button>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    Login with Google
                  </Button>
                  <div className="w-full">
                    <Button
                      className="w-full flex"
                      onClick={() =>
                        signIn("github", { redirectTo: "/dashboard" })
                      }
                    >
                      <Github className="h-16 w-16" />
                      Login with Github
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
