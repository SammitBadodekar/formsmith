"use client";
import Editor from "@/components/editor/editor";
import PublishedFormNotFound from "@/components/error-components/published-form-not-found";
import FormsLoading from "@/components/skeletons/forms-loading";
import { useGetPublishedFormQuery } from "@/hooks/use-queries";
import React from "react";

const ShowPublishedForm = ({
  domain,
  path,
}: {
  domain: string;
  path: string;
}) => {
  const { data, isLoading } = useGetPublishedFormQuery({ domain, path });
  console.log("data", data);
  return (
    <>
      {isLoading && <FormsLoading />}
      {!isLoading && !data?.data?.form && <PublishedFormNotFound />}
      {!isLoading && data?.data?.form && (
        <div>
          <Editor
            formData={data?.data?.form}
            image=""
            logo=""
            editable={false}
          />
        </div>
      )}
    </>
  );
};

export default ShowPublishedForm;
