"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import CreateForm from "@/components/modals/create-form";
import { getForms, getWorkspaces } from "@/lib/queries";
import { Form } from "@formsmith/database";
import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PencilLine } from "lucide-react";
import DeleteFormModal from "@/components/modals/delete-form";
import FormsLoading from "@/components/skeletons/forms-loading";

const ShowForms = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["getForms"],
    queryFn: getForms,
    staleTime: 60000,
  });
  const { data: workspaceData } = useQuery({
    queryKey: ["getWorkspaces"],
    queryFn: getWorkspaces,
    staleTime: 60000,
  });
  const workspaceId = workspaceData?.data?.workspaces[0]?.id;

  return (
    <div className="flex h-full w-full flex-col">
      {isLoading && <FormsLoading />}
      <div className="">
        {data?.data?.forms?.length === 0 && (
          <div className="flex h-full min-h-[calc(100dvh_-_10rem)] w-full flex-col items-center justify-center gap-4">
            <Image
              src={"/digital-nomad.svg"}
              alt={"digital-nomad"}
              width={250}
              height={250}
            />
            <p className="text-center font-semibold">No forms found</p>
            <p className="max-w-80 text-center">
              Roll up your sleeves and let’s get started. It's as simple as
              one-two-three.
            </p>
            <CreateForm workspaceId={workspaceId} />
          </div>
        )}
      </div>
      {data?.data?.forms?.length > 0 && (
        <>
          <div className="flex w-full flex-col gap-4 sm:px-12 md:px-24 lg:px-36">
            <div className="flex w-full items-center">
              <h3 className="text-2xl font-black">Home</h3>
              <div className="ml-auto flex items-center gap-4">
                <button>New workspace</button>
                <CreateForm workspaceId={workspaceId} />
              </div>
            </div>
            <hr />
          </div>
          <div className="flex w-full flex-col gap-4 pt-8 sm:px-8 md:px-20 lg:px-32">
            <ul className="flex w-full flex-col gap-2">
              {data?.data?.forms?.map((form: Form) => {
                console.log(form);
                return <FormItem form={form} />;
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

const FormItem = ({ form }: { form: Form }) => {
  const date = form?.createdAt;
  const timeAgo = formatDistanceToNowStrict(date!, { addSuffix: true });
  return (
    <li
      key={form.id}
      className="group relative flex w-full rounded-lg p-2 px-4 hover:bg-primary/5"
    >
      <div className="flex w-full flex-col gap-0">
        <p className="font-semibold">{form.name}</p>
        <p className="text-sm text-primary/50">Edited {timeAgo}</p>
      </div>
      <div className="hidden items-center justify-center gap-2 group-hover:flex">
        <Button asChild variant="ghost" size={"icon"}>
          <Link href={`/forms/${form.id}/edit`} className="flex items-center">
            <PencilLine />
            <p>Edit</p>
          </Link>
        </Button>
        <DeleteFormModal form={form} />
      </div>
    </li>
  );
};

export default ShowForms;
