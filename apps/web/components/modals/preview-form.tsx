"use client";
import React, { RefObject, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Editor, { schema } from "../editor/editor";
import { Minimize2 } from "lucide-react";
import { Form } from "@formsmith/database";
import { divideFormIntoPages } from "../editor/helpers";

const PreviewFormModal = ({ ref }: { ref: RefObject<Form> | null }) => {
  const [open, setOpenState] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [formData, setFormData] = useState(ref?.current);

  const setOpen = (value: boolean) => {
    setOpenState(value);
    if (!value) {
      setCurrentPage(0);
    }
  };

  useEffect(() => {
    if (open) {
      setFormData(ref?.current);
    }
  }, [open, ref]);

  const pages = divideFormIntoPages(formData as Form);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="font-black">
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-full max-h-[90dvh] w-screen max-w-[95vw] items-center justify-center overflow-y-scroll rounded-2xl p-0">
        {pages.map((page: any, index) => {
          return (
            <div
              className={`${currentPage === index ? "" : "hidden"} relative flex h-full w-full items-center justify-center`}
              key={index}
            >
              <Button
                variant="secondary"
                size="sm"
                className="absolute right-4 top-4 z-10 hover:bg-secondary"
                onClick={() => {
                  setOpen(false);
                }}
              >
                <Minimize2 />
                <p>Back to editor</p>
              </Button>
              <Editor
                editable={false}
                formData={{
                  ...formData!,
                  data: page.blocks,
                }}
                onSubmit={(data) => {
                  setCurrentPage((prev) => prev + 1);
                }}
                isThankYou={page.isThankYou ?? index === pages.length - 1}
                submitButtonText={page.buttonText}
              />
            </div>
          );
        })}
      </DialogContent>
    </Dialog>
  );
};

export default PreviewFormModal;
