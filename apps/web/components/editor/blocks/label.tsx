import { Input } from "@/components/ui/input";
import { insertOrUpdateBlock } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { Label as ShadCNLabel } from "@/components/ui/label";

export const Label = createReactBlockSpec(
  {
    type: "label",
    propSchema: {
      type: {
        default: "label",
        values: ["label"],
      },
      value: {
        default: "Type a question",
      },
      for: {
        default: "",
      },
    },
    content: "inline",
  },
  {
    render: (props) => {
      const hasContent = props.block.content.length > 0;

      return (
        <label
          htmlFor={props?.block?.props?.for}
          className="w-full relative block"
        >
          {/* Placeholder */}
          {!hasContent && (
            <span className="absolute top-0 left-0 text-muted-foreground pointer-events-none opacity-50">
              {props.block.props.value}
            </span>
          )}

          {/* Editable Content */}
          <div
            className="inline-content relative z-10"
            ref={props.contentRef}
          />
        </label>
      );
    },
  }
);
