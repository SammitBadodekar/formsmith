import React from "react";

const FormsLoading = () => {
  return (
    <div className="flex w-full flex-col gap-4 sm:px-12 md:px-24 lg:px-36">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="w-full">
          <div className="h-8 w-40 animate-pulse rounded-md bg-primary/10"></div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="h-8 w-20 animate-pulse rounded-md bg-primary/10"></div>
          <div className="h-8 w-20 animate-pulse rounded-md bg-primary/10"></div>
        </div>
      </div>
      <hr />
      <div className="h-12 w-full animate-pulse rounded-md bg-primary/10"></div>
      <div className="h-12 w-full animate-pulse rounded-md bg-primary/10"></div>
      <div className="h-12 w-full animate-pulse rounded-md bg-primary/10"></div>
    </div>
  );
};

export default FormsLoading;
