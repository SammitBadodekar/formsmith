import React from "react";
import ShowPublishedForm from "./show-published-form";

const Page = async ({
  params: pramsPromise,
}: {
  params: Promise<{ domain: string[] }>;
}) => {
  const params = await pramsPromise;
  const domain = params.domain[0]?.split(".")[0];
  const path =
    params.domain.reduce((acc, curr, index) => {
      if (index === 0) return acc;
      return acc + "/" + curr;
    }, "") || "/";

  return (
    <div>
      <ShowPublishedForm domain={domain} path={path} />
    </div>
  );
};

export default Page;
