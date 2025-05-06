"use client";
import Editor, { schema } from "@/components/editor/editor";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import debounce from "lodash.debounce";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getForm } from "@/lib/queries";
import FormsLoading from "@/components/skeletons/forms-loading";
import FormNotFound from "@/components/error-components/form-not-found";
import { updateForm } from "@/lib/mutations";
import { Loader } from "lucide-react";

const saveFormWithDebounce = debounce(async (callback, payload) => {
  if (callback && payload) {
    await callback(payload);
  }
}, 3000);

const EditForm = ({ formId }: { formId: string }) => {
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["getForm", formId] as const,
    queryFn: ({ queryKey: [, id] }) => getForm(id),
    staleTime: 60000,
  });

  const { isPending, mutate, isSuccess, status } = useMutation({
    mutationFn: updateForm,
    onSuccess: (data) => {
      console.log(data);
    },
    onError: (error) => {
      console.error(error);
    },
  });
  console.log("isSuccess", isSuccess, isPending, status);

  const saveForm = async (formData: any[]) => {
    console.log("formData", formData);
    mutate({
      formId: data?.data?.form.id,
      formData: {
        ...data?.data?.form,
        data: formData,
      },
    });
  };

  useEffect(() => {
    const el = document.getElementById("route-header-slot");
    if (el) setSlotEl(el);
  }, []);
  return (
    <>
      {isLoading && <FormsLoading />}
      {!isLoading && !data?.data?.form && <FormNotFound />}
      {data?.data?.form && (
        <Editor
          image=""
          logo=""
          onSave={async (data) => await saveFormWithDebounce(saveForm, data)}
          data={data.data.form.data?.data}
        />
      )}
      {data?.data?.form &&
        slotEl &&
        createPortal(
          <div className="flex items-center gap-2 text-lg">
            <Button disabled variant="ghost" size="sm" className="font-black">
              <p>
                {status === "pending" ? (
                  <span className="flex items-center gap-2">
                    <Loader className="animate-spin" /> Saving...
                  </span>
                ) : status === "success" ? (
                  "Saved"
                ) : status === "error" ? (
                  "Error saving"
                ) : (
                  ""
                )}
              </p>
            </Button>
            <Button variant="secondary" size="sm" className="font-black">
              Preview
            </Button>
            <Button variant="accent" size="sm" className="font-black">
              Publish
            </Button>
          </div>,
          slotEl,
        )}
    </>
  );
};

export default EditForm;
