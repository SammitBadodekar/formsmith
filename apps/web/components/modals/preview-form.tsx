"use client";
import React, { RefObject, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Editor, { schema } from "../editor/editor";
import { Minimize2 } from "lucide-react";
import { Form } from "@formsmith/database";

const PreviewFormModal = ({ ref }: { ref: RefObject<Form> | null }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(ref?.current);

  useEffect(() => {
    if (open) {
      setFormData(ref?.current);
    }
  }, [open, ref]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="font-black">
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[90%] w-screen max-w-[90vw] items-center justify-center overflow-y-scroll rounded-2xl p-0">
        <Editor
          image={formData?.image ?? ""}
          logo={formData?.logo ?? ""}
          editable={false}
          formData={formData as Form}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PreviewFormModal;
