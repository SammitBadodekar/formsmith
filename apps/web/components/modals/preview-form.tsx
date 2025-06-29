"use client";
import React, { RefObject, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="sm" className="font-black">
          Preview
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="flex h-dvh w-screen max-w-[95vw] items-center justify-center overflow-y-scroll rounded-2xl p-0">
        {pages.map((page: any, index) => {
          return (
            <div
              className={`${currentPage === index ? "" : "hidden"} relative flex h-full w-full items-center justify-center`}
              key={index}
            >
              <Button
                variant="secondary"
                size="sm"
                className="absolute right-4 top-4 z-10"
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
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PreviewFormModal;
