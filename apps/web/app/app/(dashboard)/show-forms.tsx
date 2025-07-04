"use client";
import React from "react";
import Image from "next/image";
import CreateForm from "@/components/modals/create-form";
import { Form } from "@formsmith/database";
import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PencilLine } from "lucide-react";
import DeleteFormModal from "@/components/modals/delete-form";
import FormsLoading from "@/components/skeletons/forms-loading";
import { useRouter } from "next/navigation";
import { useGetFormsQuery, useGetWorkspacesQuery } from "@/hooks/use-queries";

const ShowForms = () => {
  const { data, isLoading, error } = useGetFormsQuery();
  const { data: workspaceData } = useGetWorkspacesQuery();
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
        <div className="flex w-full flex-col items-center">
          <div className="w-full max-w-[900px]">
            <div className="flex w-full flex-col gap-4 px-4">
              <div className="flex w-full items-center">
                <h3 className="text-2xl font-black">Home</h3>
                <div className="ml-auto flex items-center gap-4">
                  {/* <button>New workspace</button> */}
                  <CreateForm workspaceId={workspaceId} />
                </div>
              </div>
              <hr />
            </div>
            <div className="flex w-full flex-col gap-4 pt-8">
              <ul className="flex w-full flex-col gap-2">
                {data?.data?.forms
                  ?.sort((a: Form, b: Form) => {
                    const aDate = new Date(a.updatedAt!)?.getTime?.();
                    const bDate = new Date(b.updatedAt!)?.getTime?.();
                    return bDate - aDate;
                  })
                  ?.map((form: Form) => {
                    return <FormItem form={form} key={form.id} />;
                  })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FormItem = ({ form }: { form: Form }) => {
  const date = form?.updatedAt;
  const timeAgo = formatDistanceToNowStrict(date!, { addSuffix: true });
  const router = useRouter();
  return (
    <li
      key={form.id}
      className="group relative flex w-full cursor-pointer rounded-lg p-2 px-4 hover:bg-primary/5"
      onClick={() => {
        router.push(`/forms/${form.id}/${form.isPublished ? "share" : "edit"}`);
      }}
    >
      <div className="flex w-full flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{form.name}</p>
          {!form.isPublished && (
            <p className="rounded-full bg-primary/5 p-1 px-2 text-xs text-primary/50">
              Draft
            </p>
          )}
        </div>
        <p className="text-sm text-primary/50">Edited {timeAgo}</p>
      </div>
      <div
        className="hidden items-center justify-center gap-2 group-hover:flex"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
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
