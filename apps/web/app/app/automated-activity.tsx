import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Instagram, HelpCircle } from "lucide-react";

export default function AutomatedActivity() {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Instagram className="h-6 w-6 text-pink-500" />
          <h2 className="text-2xl font-semibold">Automated Activity</h2>
        </div>
        <p className="text-muted-foreground">
          Automated 0 out of 0 interactions
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="last7days" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
            <TabsTrigger value="last7days">Last 7 days</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Comments</h3>
            <p className="text-4xl font-bold">0</p>
            <p className="text-muted-foreground">Out of 0</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Story replies</h3>
            <p className="text-4xl font-bold">0</p>
            <p className="text-muted-foreground">Out of 0</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium">DMs</h3>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-4xl font-bold">0</p>
            <p className="text-muted-foreground">Out of 0</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Story Mentions</h3>
            <p className="text-4xl font-bold">0</p>
            <p className="text-muted-foreground">Out of 0</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
