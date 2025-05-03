import { Input } from "@/components/ui/input";
import { createReactBlockSpec } from "@blocknote/react";
import { schema } from "../editor";
import { HiOutlineBars2 } from "react-icons/hi2";
import { v4 as uuid } from "uuid";
import { cn } from "@/lib/utils";
import { getHighlightStyles } from "../helpers";

export const shortAnswer = createReactBlockSpec(
  {
    type: "shortAnswer",
    propSchema: {
      type: {
        default: "shortAnswer",
        values: ["shortAnswer"],
      },
      placeholder: {
        default: "Type placeholder text...",
      },
      name: {
        default: "untitled shortAnswer",
      },
      highlight: {
        default: false,
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const highlight = props?.block?.props?.highlight;
      return (
        <div className={cn(`w-full`, highlight ? getHighlightStyles() : "")}>
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

export const getshortAnswerSlashCommand = (
  editor: typeof schema.BlockNoteEditor
) => {
  return {
    title: "Short Answer",
    subtext: "",
    onItemClick: () => {
      const inputId = uuid();
      const placeholder = "\u200B";
      const blocks = editor.insertBlocks(
        [
          {
            type: "label",
            props: {
              for: inputId,
              value: "Type a question",
            },
            content: [
              {
                type: "text",
                text: placeholder,
                styles: {
                  bold: true,
                },
              },
            ],
          },
          {
            type: "shortAnswer",
            id: inputId,
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
