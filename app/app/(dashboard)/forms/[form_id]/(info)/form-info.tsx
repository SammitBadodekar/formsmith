"use client";
import DeleteFormModal from "@/components/modals/delete-form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Form } from "@/lib/db/schema";
import { PencilLine } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

const FORM_INFO_LIST = [
  {
    title: "Submissions",
    href: "submissions",
  },
  {
    title: "Share",
    href: "share",
  },
  {
    title: "Settings",
    href: "settings",
  },
];

const FormInfo = ({
  form,
  children,
}: {
  form: Form;
  children: React.ReactNode;
}) => {
  const pathName = usePathname();
  const router = useRouter();

  return (
    <>
      <div>
        <div className="flex w-full items-center justify-between">
          <h1 className="text-3xl font-black">{form.name}</h1>
          <div className="flex items-center gap-2">
            <Button asChild variant="accent" size="sm">
              <Link
                href={`/forms/${form.id}/edit`}
                className="flex items-center"
              >
                <PencilLine />
                <p>Edit</p>
              </Link>
            </Button>
            <DeleteFormModal
              form={form}
              onDelete={() => {
                router.push("/");
              }}
            />
          </div>
        </div>
        <ul className="flex w-full gap-4 pt-4 text-sm">
          {FORM_INFO_LIST.map((item) => (
            <li key={item.title}>
              <Link
                href={`/forms/${form.id}/${item.href}`}
                className={`text-primary/75 ${pathName.includes(item.href) ? "border-b-2 border-primary font-bold text-primary" : ""}`}
              >
                <p>{item.title}</p>
              </Link>
            </li>
          ))}
        </ul>
        <Separator className="my-2" />
      </div>
      {children}
    </>
  );
};

export default FormInfo;
