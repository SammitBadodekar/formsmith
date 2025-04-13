import { Input } from "@/components/ui/input";
import { insertOrUpdateBlock } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { FileInput } from "lucide-react";
import { BlockNoteEditor } from "@blocknote/core";
import { schema } from "../editor";
import { HiOutlineBars2 } from "react-icons/hi2";

export const ShortInput = createReactBlockSpec(
  {
    type: "shortInput",
    propSchema: {
      type: {
        default: "shortInput",
        values: ["shortInput"],
      },
      placeholder: {
        default: "Type placeholder text...",
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      console.log("here in render", props);
      return (
        <div className="w-full">
          <Input
            placeholder={props?.block?.props?.placeholder}
            className="min-w-full"
            onChange={(e) => {
              props.editor.updateBlock(props.block, {
                props: {
                  placeholder: e.target.value,
                },
              });
            }}
          />
          {/* <div className={"inline-content"} ref={props.contentRef} /> */}
        </div>
      );
    },
  }
);

export const getShortInputSlashCommand = (
  editor: typeof schema.BlockNoteEditor
) => {
  return {
    title: "Short Input",
    subtext: "",
    onItemClick: () =>
      // If the block containing the text caret is empty, `insertOrUpdateBlock`
      // changes its type to the provided block. Otherwise, it inserts the new
      // block below and moves the text caret to it. We use this function with an
      // Alert block.
      insertOrUpdateBlock(editor, {
        type: "shortInput",
      }),
    aliases: [
      "alert",
      "notification",
      "emphasize",
      "warning",
      "error",
      "info",
      "success",
    ],
    group: "Form Components",
    icon: <HiOutlineBars2 size={18} />,
  };
};
