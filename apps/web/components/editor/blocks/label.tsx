import { createReactBlockSpec } from "@blocknote/react";
import { getHighlightStyles, getPlainText } from "../helpers";
import { cn } from "@/lib/utils";
import { useAtom } from "jotai";
import { formCustomizationAtom } from "@/lib/atoms";

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
      name: {
        default: "untitled label",
      },
      highlight: {
        default: false,
      },
    },
    content: "inline",
  },
  {
    render: (props) => {
      const hasContent = getPlainText(props.block)?.length > 0;
      const highlight = props?.block?.props?.highlight;
      const [customizations] = useAtom(formCustomizationAtom);

      return (
        <label
          htmlFor={props?.block?.props?.for}
          className={cn("relative block w-full")}
          style={highlight ? getHighlightStyles(customizations) : {}}
        >
          {/* Placeholder */}
          {!hasContent && props.editor.isEditable && (
            <span className="pointer-events-none absolute left-0 top-0 text-[1.25rem] leading-[1.25rem] text-muted-foreground opacity-50">
              {props.block.props.value}
            </span>
          )}

          {/* Editable Content */}
          <div className="inline-content relative" ref={props.contentRef} />
        </label>
      );
    },
  },
);
