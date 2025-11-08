import { Button } from "@/components/ui/button";
import { formCustomizationAtom } from "@/lib/atoms";
import { createReactBlockSpec } from "@blocknote/react";
import { useAtom } from "jotai";
import { Check } from "lucide-react";
import Link from "next/link";
import React from "react";

export const ThankYouPage = createReactBlockSpec(
  {
    type: "thankYouPage",
    propSchema: {},
    content: "none",
  },
  {
    render: (props) => {
      const [customizations] = useAtom(formCustomizationAtom);
      return (
        <div className="mt-8 flex h-full w-full flex-col items-center justify-center">
          <div
            className="mb-8 rounded-full p-4 font-black"
            style={{
              backgroundColor: customizations.color,
              color: customizations.backgroundColor,
            }}
          >
            <Check size={40} />
          </div>
          <h2 className="font-bold">Thanks for completing this form!</h2>
          <p className="text-center">
            Made with Formsmith, the simplest way to create forms for free.
          </p>

          <a
            href={
              process.env.NEXT_PUBLIC_FROMSMITH_URL ?? "https://formsmith.in"
            }
            className="mt-8"
            target="_blank"
          >
            <Button
              variant="accent"
              className="font-semiBold"
              type="button"
              style={{
                backgroundColor: customizations.buttonColor,
                color: customizations.buttonText,
              }}
            >
              Create your own form
            </Button>
          </a>
        </div>
      );
    },
  },
);
