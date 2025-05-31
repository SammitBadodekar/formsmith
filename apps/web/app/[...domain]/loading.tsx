import { Loader } from "lucide-react";
import React from "react";

const Loading = () => {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-4">
      <Loader className="animate-spin" />
    </div>
  );
};

export default Loading;
