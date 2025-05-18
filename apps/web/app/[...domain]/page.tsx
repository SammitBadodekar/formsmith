import React from "react";

const Page = async ({ params }: { params: Promise<{ domain: string[] }> }) => {
  const path =
    (await params).domain.reduce((acc, curr, index) => {
      if (index === 0) return acc;
      return acc + "/" + curr;
    }, "") || "/";
  return (
    <div>
      <p>domain {(await params).domain[0]?.split(".")[0]}</p>
      <p>path {path}</p>
    </div>
  );
};

export default Page;
