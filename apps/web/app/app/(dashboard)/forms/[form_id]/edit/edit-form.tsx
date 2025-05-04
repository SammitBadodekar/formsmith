"use client";
import Editor from "@/components/editor/editor";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import debounce from "lodash.debounce";

const saveForm = debounce((form) => {
  console.log(form);
}, 10000);

const EditForm = () => {
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById("route-header-slot");
    if (el) setSlotEl(el);
  }, []);
  return (
    <>
      <Editor image="" logo="" onSave={saveForm} />
      {slotEl &&
        createPortal(
          <div className="flex items-center gap-2 text-lg">
            <Button variant="ghost" size="sm" className="font-black">
              <p>Save</p>
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
