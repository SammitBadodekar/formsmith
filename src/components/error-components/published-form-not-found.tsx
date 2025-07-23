import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Button } from "../ui/button";

const PublishedFormNotFound = () => {
  return (
    <div className="flex h-full min-h-[calc(100dvh_-_10rem)] w-full flex-col items-center justify-center gap-4">
      <Image
        src={"/crashed-error.svg"}
        alt={"form-not-found"}
        width={350}
        height={350}
      />
      <p className="text-center text-xl font-semibold">Oops! Form not found</p>
      <p>Either the author has unpublished the form or the url is invalid</p>
      <Button asChild variant="accent" className="font-bold">
        <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/`}>Try Formsmith</Link>
      </Button>
    </div>
  );
};

export default PublishedFormNotFound;
