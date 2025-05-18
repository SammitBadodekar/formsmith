"use client";
import Image from "next/image";
import React from "react";
import { Button } from "@/components/ui/button";

const FormNotFound = () => {
  return (
    <div className="flex h-full min-h-[calc(100dvh_-_10rem)] w-full flex-col items-center justify-center gap-4">
      <Image
        src={"/crashed-error.svg"}
        alt={"form-not-found"}
        width={350}
        height={350}
      />
      <p className="text-center text-xl font-semibold">
        Oops! Something went wrong
      </p>
      <Button asChild variant="accent" className="font-bold">
        <a href={"/"}>Reload page</a>
      </Button>
    </div>
  );
};

export default FormNotFound;
