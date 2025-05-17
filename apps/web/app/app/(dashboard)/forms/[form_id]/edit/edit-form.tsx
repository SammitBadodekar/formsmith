"use client";
import Editor from "@/components/editor/editor";
import { Button } from "@/components/ui/button";
import { RefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import debounce from "lodash.debounce";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getForm } from "@/lib/queries";
import FormsLoading from "@/components/skeletons/forms-loading";
import FormNotFound from "@/components/error-components/form-not-found";
import { publishForm, updateForm } from "@/lib/mutations";
import { Loader } from "lucide-react";
import PreviewFormModal from "@/components/modals/preview-form";
import { Form } from "@formsmith/database";
import { toast } from "sonner";

const saveFormWithDebounce = debounce(async (callback, payload) => {
  if (callback && payload) {
    await callback(payload);
  }
}, 3000);

const EditForm = ({ formId }: { formId: string }) => {
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);
  const formData = useRef<Form | null>(null);

  const setFormData = (data: Form) => {
    formData.current = data;
  };

  const { data, isLoading } = useQuery({
    queryKey: ["getForm", formId] as const,
    queryFn: ({ queryKey: [, id] }) => getForm(id),
    staleTime: 0,
  });

  const { mutate, status } = useMutation({
    mutationFn: updateForm,
    onSuccess: (data) => {},
    onError: (error) => {
      console.error(error);
    },
  });

  const { mutate: publishMutation, status: publishStatus } = useMutation({
    mutationFn: publishForm,
    onSuccess: (data) => {},
    onError: (error) => {
      console.error(error);
    },
  });

  const saveForm = async (formData: any[]) => {
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

  useEffect(() => {
    if (data?.data?.form) {
      setFormData({
        ...data?.data?.form,
      });
    }
  }, [data?.data?.form]);

  useEffect(() => {
    if (publishStatus === "success") {
      toast.success("Form published successfully!");
    }
  }, [publishStatus]);
  return (
    <>
      {isLoading && <FormsLoading />}
      {!isLoading && !data?.data?.form && <FormNotFound />}
      {data?.data?.form && (
        <Editor
          image=""
          logo=""
          onSave={async (documents) => {
            setFormData({
              ...data?.data?.form,
              data: documents,
            });
            await saveFormWithDebounce(saveForm, documents);
          }}
          formData={data?.data?.form}
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
            <PreviewFormModal ref={formData as RefObject<Form>} />
            <Button
              variant="accent"
              size="sm"
              className="font-black"
              onClick={() => {
                publishMutation({
                  formId: formData?.current?.id!,
                  formData: formData?.current,
                });
              }}
            >
              {publishStatus === "pending" ? (
                <span className="flex items-center gap-2">
                  <Loader className="animate-spin" /> Publishing...
                </span>
              ) : (
                "Publish"
              )}
            </Button>
          </div>,
          slotEl,
        )}
    </>
  );
};

export default EditForm;
