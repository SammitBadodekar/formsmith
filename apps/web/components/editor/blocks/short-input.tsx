import { Input } from "@/components/ui/input";
import { insertOrUpdateBlock } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { schema } from "../editor";
import { HiOutlineBars2 } from "react-icons/hi2";
import { v4 as uuid } from "uuid";

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
      return (
        <div className="w-full">
          <Input
            ref={props.contentRef}
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
    onItemClick: () => {
      const blocks = editor.insertBlocks(
        [
          {
            type: "label",
            props: {
              for: "short-input",
              value: "Type a question",
            },
            content: [
              {
                type: "text",
                text: "Type a question",
                styles: {
                  bold: true,
                },
              },
            ],
          },
          {
            type: "shortInput",
            id: uuid(),
          },
        ],
        editor.getTextCursorPosition().block, // Insert after current block
        "after"
      );
      // @ts-ignore
      editor.removeBlocks([editor.getPrevBlock(blocks[0])]);
    },
    aliases: ["short input", "input", "text", "string"],
    group: "Form Components",
    icon: <HiOutlineBars2 size={18} />,
  };
};
