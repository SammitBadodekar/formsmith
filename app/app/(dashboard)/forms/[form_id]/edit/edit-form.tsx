"use client";
import Editor from "@/components/editor/editor";
import { Button } from "@/components/ui/button";
import { RefObject, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import debounce from "lodash.debounce";
import { Loader } from "lucide-react";
import PreviewFormModal from "@/components/modals/preview-form";
import { Form } from "@/lib/db/schema";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import FormCustomization from "@/components/editor/components/form-customization";
import { formCustomizationAtom } from "@/lib/atoms";
import { useAtom } from "jotai";
import isEqual from "lodash.isequal";
import { updateFormData, publishFormData } from "@/lib/actions/forms";

const saveFormWithDebounce = debounce(async (callback, payload) => {
  if (callback && payload) {
    await callback(payload);
  }
}, 3000);

const EditForm = ({ form: initialForm, formId }: { form: Form; formId: string }) => {
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [customizations] = useAtom(formCustomizationAtom);
  const formData = useRef<Form | null>(null);
  const router = useRouter();
  const prevRef = useRef<typeof customizations>(customizations);
  const [isSaving, startSaveTransition] = useTransition();
  const [isPublishing, startPublishTransition] = useTransition();

  const setFormData = (data: Partial<Form>) => {
    formData.current = { ...(formData.current ?? initialForm), ...data, customizations };
  };

  const saveForm = async (documents: any[]) => {
    startSaveTransition(async () => {
      const current = formData.current!;
      const result = await updateFormData({
        formId: formId,
        formData: {
          name: current.name || undefined,
          description: current.description || undefined,
          data: documents,
          customizations,
          image: current.image || undefined,
          logo: current.logo || undefined,
        },
      });

      if (!result.success) {
        toast.error(result.error || "Failed to save form");
      }
    });
  };

  useEffect(() => {
    const el = document.getElementById("route-header-slot");
    if (el) setSlotEl(el);
  }, []);

  useEffect(() => {
    if (initialForm) {
      setFormData(initialForm);
    }
  }, [initialForm]);

  useEffect(() => {
    if (prevRef.current && isEqual(prevRef.current, customizations)) {
      return;
    }
    setFormData({
      customizations,
    });
    saveFormWithDebounce(saveForm, formData.current?.data);
  }, [customizations]);
  const handlePublish = () => {
    startPublishTransition(async () => {
      const result = await publishFormData({
        formId: formId,
        formData: formData.current,
      });

      if (result.success) {
        toast.success("Form published successfully!");
        if (!initialForm.isPublished) {
          router.push(`/forms/${formId}/share`);
        }
      } else {
        toast.error(result.error || "Failed to publish form");
      }
    });
  };

  const handleSave = () => {
    startSaveTransition(async () => {
      const current = formData.current!;
      const result = await updateFormData({
        formId: formId,
        formData: {
          name: current.name || undefined,
          description: current.description || undefined,
          data: current.data,
          customizations: current.customizations,
          image: current.image || undefined,
          logo: current.logo || undefined,
        },
      });

      if (!result.success) {
        toast.error(result.error || "Failed to save form");
      }
    });
  };

  return (
    <>
      <div className="flex overflow-hidden">
        <Editor
          onSave={async (documents) => {
            setFormData({
              ...formData.current!,
              data: documents,
            });
            await saveFormWithDebounce(saveForm, documents);
          }}
          formData={initialForm}
          setFormData={setFormData}
          setShowCustomization={setShowCustomization}
        />
        <FormCustomization
          showCustomization={showCustomization}
          setShowCustomization={setShowCustomization}
        />
      </div>
      {slotEl &&
        createPortal(
          <div className="flex items-center gap-2 text-lg">
            <Button
              variant="ghost"
              size="sm"
              className="font-black"
              onClick={handleSave}
              disabled={isSaving}
            >
              <p>
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader className="animate-spin" /> Saving...
                  </span>
                ) : (
                  "Save"
                )}
              </p>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="font-black"
              onClick={() => setShowCustomization((prev) => !prev)}
            >
              Customize
            </Button>
            <PreviewFormModal ref={formData as RefObject<Form>} />
            <Button
              variant="accent"
              size="sm"
              className="font-black"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing ? (
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
