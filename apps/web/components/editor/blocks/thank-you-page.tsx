import { Button } from "@/components/ui/button";
import { createReactBlockSpec } from "@blocknote/react";
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
      return (
        <div className="-mt-28 flex h-full w-full flex-col items-center justify-center">
          <div className="mb-8 rounded-full bg-blue-50 p-4 font-black text-blue-500">
            <Check size={40} />
          </div>
          <h2 className="font-bold">Thanks for completing this form!</h2>
          <p>Made with Formsmith, the simplest way to create forms for free.</p>

          <a
            href={
              process.env.NEXT_PUBLIC_FROMSMITH_URL ?? "https://formsmith.in"
            }
            className="mt-8"
            target="_blank"
          >
            <Button variant="accent" className="font-semiBold" type="button">
              Create your own form
            </Button>
          </a>
        </div>
      );
    },
  },
);
