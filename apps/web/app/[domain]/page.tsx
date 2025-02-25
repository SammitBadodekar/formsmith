import React from "react";

const Page = async ({ params }: { params: Promise<{ domain: string }> }) => {
  return <div>Page {(await params).domain}</div>;
};

export default Page;
