"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Editor from "../editor/editor";
import { Minimize2 } from "lucide-react";

const PreviewFormModal = ({ data }: { data: unknown[] }) => {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="sm" className="font-black">
          Preview
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="flex h-[90%] w-screen max-w-[90vw] items-center justify-center overflow-y-scroll rounded-2xl p-0">
        <Editor image="" logo="" editable={false} data={data} />
        <Button
          variant="secondary"
          className="fixed right-4 top-4 flex items-center rounded-xl p-2"
          onClick={() => setOpen(false)}
        >
          <Minimize2 />
          <p>Close</p>
        </Button>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PreviewFormModal;
