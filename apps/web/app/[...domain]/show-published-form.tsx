"use client";
import Editor from "@/components/editor/editor";
import {
  divideFormIntoPages,
  getSubmissionData,
} from "@/components/editor/helpers";
import PublishedFormNotFound from "@/components/error-components/published-form-not-found";
import { submitForm } from "@/lib/mutations";
import { Form, PublishedForm } from "@formsmith/database";
import React, { useRef, useState } from "react";

export type Submission = {
  label: string;
  value: string;
  input_id: string;
  label_id: string;
};

const ShowPublishedForm = ({ data: form }: { data: Form }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const submissions = useRef<Submission[]>([]);
  const pages = divideFormIntoPages(form);
  return (
    <>
      {form && (
        <>
          {pages.map((page: any, index) => {
            const isThankYouPage =
              page.isThankYou ?? index === pages.length - 1;
            return (
              <div
                className={`${currentPage === index ? "" : "hidden"} flex w-full items-center justify-center`}
              >
                <Editor
                  editable={false}
                  formData={{
                    ...form!,
                    data: page.blocks,
                  }}
                  onSubmit={async (data: any) => {
                    submissions.current = [...submissions.current, ...data];

                    const isNextPageThankYouPage =
                      pages[index + 1]?.isThankYou ??
                      index + 1 === pages.length - 1;

                    if (isNextPageThankYouPage) {
                      await submitForm({
                        formId: (form as any)?.formId,
                        formData: submissions.current,
                      });
                    }
                    setCurrentPage((prev) => prev + 1);
                  }}
                  isThankYou={isThankYouPage}
                  submitButtonText={page.buttonText}
                />
              </div>
            );
          })}
        </>
      )}
      {!form && <PublishedFormNotFound />}
    </>
  );
};

export default ShowPublishedForm;
