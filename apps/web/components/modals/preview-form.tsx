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
      <DialogContent className="flex h-[90%] w-screen max-w-[90vw] items-center justify-center overflow-y-scroll rounded-2xl p-0">
        {pages.map((page: any, index) => {
          return (
            <div
              className={`${currentPage === index ? "" : "hidden"} flex w-full items-center justify-center`}
            >
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
