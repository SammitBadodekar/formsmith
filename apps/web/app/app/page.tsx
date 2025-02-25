import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Share2 } from "lucide-react";
import Link from "next/link";
import AutomatedActivity from "./automated-activity";

export default function Page() {
  const data: any = {};
  return (
    <main className="flex w-full justify-center">
      <div className="flex w-full max-w-[1200px] flex-col gap-2 px-4">
        <section className="px-4">
          <h1 className="text-3xl font-[999]">Hi, {data?.user?.name}</h1>
          <div className="flex items-center gap-4 text-sm">
            <p>
              <b>10</b> contacts
            </p>
          </div>
        </section>
        <section className="w-full py-12">
          <div className="container px-4">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Start Here</h2>
              <Link
                href="/templates"
                className="text-blue-500 transition-colors hover:text-blue-600"
              >
                Explore all Templates
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex-1">
                    <h3 className="mb-2 text-xl font-semibold">
                      Auto-DM links from comments
                    </h3>
                    <p className="text-muted-foreground">
                      Send a link when people comment on a post or reel
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="h-4 w-4" />
                      <span>Quick Automation</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-orange-500 text-white"
                    >
                      POPULAR
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex-1">
                    <h3 className="mb-2 text-xl font-semibold">
                      Generate leads with stories
                    </h3>
                    <p className="text-muted-foreground">
                      Use limited-time offers in your Stories to convert leads
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Share2 className="h-4 w-4" />
                      <span>Flow Builder</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex-1">
                    <h3 className="mb-2 text-xl font-semibold">
                      Automate conversations with AI
                    </h3>
                    <p className="text-muted-foreground">
                      Get AI to collect your follower&apos;s info, share details
                      or tell it how to reply
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Share2 className="h-4 w-4" />
                      <span>Flow Builder</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-gray-900 text-white"
                    >
                      AI
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <div className="px-4">
          <AutomatedActivity />
        </div>
      </div>
    </main>
  );
}
