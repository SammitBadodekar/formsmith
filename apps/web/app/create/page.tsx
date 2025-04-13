import TiptapEditor from "@/components/editor/tiptap-editor";
import React from "react";

const Page = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="max-w-[600px] w-full">
        <TiptapEditor />
      </div>
    </div>
  );
};

export default Page;
