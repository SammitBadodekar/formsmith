"use client";

import CopyButton from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { useFormQuery } from "@/hooks/use-queries";
import React from "react";

const ShareForm = ({ formId }: { formId: string }) => {
  const { data, isLoading } = useFormQuery({ formId });

  const url = `https://${data?.data?.form?.domain}.${process.env.NEXT_PUBLIC_FORM_DOMAIN}${data?.data?.form?.path}`;
  return (
    <div className="grid grid-cols-2 gap-20 pt-4">
      <div className="flex h-full w-full flex-col justify-center gap-4">
        <h2 className="text-xl font-black">Share Link</h2>
        <p className="text-sm text-primary/75">
          Your form is now published and ready to be shared with the world! Copy
          this link to share your form on social media, messaging apps or via
          email.
        </p>
        <div className="flex w-full items-center justify-between gap-2">
          <Input disabled value={url} />
          <CopyButton text={url} props={{ size: "sm" }} />
        </div>
      </div>
    </div>
  );
};

export default ShareForm;
