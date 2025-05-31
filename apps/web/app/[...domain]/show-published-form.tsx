"use client";
import Editor from "@/components/editor/editor";
import PublishedFormNotFound from "@/components/error-components/published-form-not-found";
import { Form } from "@formsmith/database";
import React from "react";

const ShowPublishedForm = ({ data: form }: { data: Form }) => {
  return (
    <>
      {form && (
        <div>
          <Editor formData={form} image="" logo="" editable={false} />
        </div>
      )}
      {!form && <PublishedFormNotFound />}
    </>
  );
};

export default ShowPublishedForm;
