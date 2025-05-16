"use client";
import Editor from "@/components/editor/editor";
import React, { useEffect, useState } from "react";

const Page = () => {
  const [data, setData] = useState<any>(null);
  const onSave = (data: any) => {
    localStorage.setItem("formData", JSON.stringify(data));
  };

  useEffect(() => {
    const formData = localStorage.getItem("formData");
    if (formData) {
      setData(JSON.parse(formData));
    } else {
      setData([]);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center">
      {data && <Editor image="" logo="" onSave={onSave} data={data} />}
    </div>
  );
};

export default Page;
