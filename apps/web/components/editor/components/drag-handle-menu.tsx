import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { DragHandleMenuProps } from "@blocknote/react";

import React from "react";

const BlocksDragHandleMenu = (props: DragHandleMenuProps) => {
  return (
    <div>
      <Card className="border-none rounded-none p-0 m-0 shadow-none">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card Content</p>
        </CardContent>
        <CardFooter>
          <p>Card Footer</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default BlocksDragHandleMenu;
