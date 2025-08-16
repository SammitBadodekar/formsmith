import { createReactBlockSpec } from "@blocknote/react";
import { schema } from "../editor";
import { HiOutlineBars3 } from "react-icons/hi2";
import cuid from "cuid";
import { cn } from "@/lib/utils";
import { getHighlightStyles } from "../helpers";
import { Textarea } from "@/components/ui/textarea";
import { longAnswerSchema } from "../validator";
import { useAtom } from "jotai";
import { formCustomizationAtom } from "@/lib/atoms";

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
      required: {
        default: true,
      },
      pattern: {
        default: "",
      },
      minLength: {
        default: 0,
      },
      maxLength: {
        default: Infinity,
      },
      customErrorMessage: {
        default: "",
      },
      isValid: {
        default: true,
      },
      errorMessage: {
        default: "",
      },
      isDirty: {
        default: false,
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { editor, block } = props;
      const { value, placeholder, required, isValid, errorMessage, isDirty } =
        block.props;
      const [customizations] = useAtom(formCustomizationAtom);

      const highlight = props?.block?.props?.highlight;

      const validateAndCommit = (currentValue: string) => {
        const schema = longAnswerSchema(block.props);
        const validationResult = schema.safeParse(currentValue);

        const newProps: Record<string, any> = {
          value: currentValue,
          isDirty: true,
        };

        if (!validationResult.success) {
          newProps.isValid = false;
          newProps.errorMessage =
            validationResult.error.errors[0]?.message || "Invalid input.";
        } else {
          newProps.isValid = true;
          newProps.errorMessage = "";
        }

        editor.updateBlock(block, {
          props: { ...block.props, ...newProps },
        });
      };

      const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        if (editor.isEditable) {
          editor.updateBlock(block, {
            props: { ...block.props, placeholder: newValue },
          });
        } else {
          editor.updateBlock(block, {
            props: { ...block.props, value: newValue, isDirty: true },
          });
          validateAndCommit(newValue);
        }
      };

      const handleBlur = () => {
        if (!editor.isEditable) {
          validateAndCommit(block.props.value);
        }
      };
      return (
        <div
          className={cn(
            `relative mb-6 flex w-full flex-col gap-2`,
            highlight ? getHighlightStyles() : "",
          )}
        >
          <Textarea
            ref={props.contentRef}
            placeholder={
              editor.isEditable
                ? placeholder
                : placeholder !== "Type placeholder text..."
                  ? placeholder
                  : "Type your answer..."
            }
            value={
              editor.isEditable
                ? placeholder !== "Type placeholder text..."
                  ? placeholder
                  : ""
                : value
            }
            className={cn(
              `min-w-full placeholder:text-editorText placeholder:opacity-50 ${customizations?.theme === "dark" ? "border-primary/25" : ""}`,
              {
                "border-red-500": !isValid && isDirty,
              },
            )}
            style={{
              borderRadius: `${customizations?.inputsRadius}px`,
              borderWidth: `${customizations?.inputsBorderWidth}px`,
              backgroundColor: customizations?.inputsBackgroundColor,
              color: customizations?.inputsTextColor,
              borderColor: customizations?.inputsBorderColor,
              marginBottom: `${customizations?.inputsMarginBottom}px`,
              paddingInline: `${customizations?.inputsHorizontalPadding}px`,
            }}
            onChange={handleInputChange}
            onBlur={handleBlur}
            aria-invalid={!isValid && isDirty ? "true" : "false"}
            aria-describedby={
              !isValid && isDirty ? `${block.id}-error` : undefined
            }
          />
          {!isValid && isDirty && errorMessage && (
            <span id={`${block.id}-error`} className="text-sm text-red-600">
              {errorMessage}
            </span>
          )}
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
    group: "Questions",
    icon: <HiOutlineBars3 size={18} />,
  };
};
