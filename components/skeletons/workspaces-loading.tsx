import React from "react";

const WorkspacesLoading = () => {
  return (
    <div className="flex w-full flex-col gap-4 px-2">
      <div className="h-6 w-full animate-pulse rounded-md bg-primary/10"></div>
      <div className="h-6 w-full animate-pulse rounded-md bg-primary/10"></div>
      <div className="h-6 w-full animate-pulse rounded-md bg-primary/10"></div>
    </div>
  );
};

export default WorkspacesLoading;
