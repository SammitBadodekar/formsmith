import { createReactBlockSpec } from "@blocknote/react";
import { schema } from "../editor";
import { HiOutlineBars2 } from "react-icons/hi2";
import cuid from "cuid";
import { cn } from "@/lib/utils";
import { getHighlightStyles } from "../helpers";
import { Textarea } from "@/components/ui/textarea";

export const longAnswer = createReactBlockSpec(
  {
    type: "longAnswer",
    propSchema: {
      type: {
        default: "longAnswer",
        values: ["longAnswer"],
      },
      placeholder: {
        default: "Type placeholder text...",
      },
      name: {
        default: "untitled longAnswer",
      },
      highlight: {
        default: false,
      },
      value: {
        default: "",
      },
      label: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const highlight = props?.block?.props?.highlight;
      return (
        <div className={cn(`w-full`, highlight ? getHighlightStyles() : "")}>
          <Textarea
            ref={props.contentRef}
            placeholder={props?.block?.props?.placeholder}
            className="min-w-full"
            onChange={(e) => {
              props.editor.updateBlock(props.block, {
                props: {
                  ...props.block.props,
                  ...(props.editor.isEditable
                    ? { placeholder: e.target.value }
                    : { value: e.target.value }),
                },
              });
            }}
          />
        </div>
      );
    },
  },
);

export const getLongAnswerSlashCommand = (
  editor: typeof schema.BlockNoteEditor,
) => {
  return {
    title: "Long Answer",
    subtext: "",
    onItemClick: () => {
      const labelId = cuid();
      const placeholder = "\u200B";
      const blocks = editor.insertBlocks(
        [
          {
            type: "label",
            id: labelId,
            props: {
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
            type: "longAnswer",
            props: {
              label: labelId,
            },
          },
        ],
        editor.getTextCursorPosition().block, // Insert after current block
        "after",
      );
      // @ts-ignore
      editor.removeBlocks([editor.getPrevBlock(blocks[0])]);
    },
    aliases: ["short input", "input", "text", "string"],
    group: "Form Components",
    icon: <HiOutlineBars2 size={18} />,
  };
};
