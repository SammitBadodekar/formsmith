import { createReactBlockSpec } from "@blocknote/react";
import { getHighlightStyles, getPlainText } from "../helpers";
import { cn } from "@/lib/utils";
import { useAtom } from "jotai";
import { formCustomizationAtom } from "@/lib/atoms";
import { Asterisk } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import cuid from "cuid";

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
      const correspondentInput = props.editor.document.find(
        // @ts-ignore
        (b) => b?.props?.label === props.block?.id,
      );

      return (
        <div
          className="w-full"
          style={highlight ? getHighlightStyles(customizations) : {}}
        >
          <div
            className={`relative w-max ${!hasContent && props.editor.isEditable && "min-w-40"}`}
          >
            <label htmlFor={props?.block?.props?.for} className={cn("block")}>
              {/* Placeholder */}
              {!hasContent && props.editor.isEditable && (
                <span className="pointer-events-none absolute left-0 top-0 text-[1.25rem] leading-[1.25rem] text-muted-foreground opacity-50">
                  {props.block.props.value}
                </span>
              )}

              {/* Editable Content */}
              <div className="inline-content relative" ref={props.contentRef} />
            </label>

            {correspondentInput &&
              (correspondentInput as any)?.props?.required &&
              props?.editor?.isEditable && (
                <span
                  className="absolute -right-6 top-[calc(50%_-_0.75rem)] cursor-pointer rounded-full bg-primary/10 font-black shadow-sm"
                  onClick={() => {
                    if (props?.editor?.isEditable) {
                      props.editor.updateBlock(correspondentInput, {
                        props: {
                          required: false,
                        },
                      } as any);

                      // Re-render the label block
                      props.editor.updateBlock(props.block, {
                        props: {
                          for: cuid(),
                        },
                      });
                    }
                  }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Asterisk size={18} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Required</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
              )}
          </div>
        </div>
      );
    },
  },
);
