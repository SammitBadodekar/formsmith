import { Input } from "@/components/ui/input";
import { createReactBlockSpec, DragHandleMenuProps } from "@blocknote/react";
import { schema } from "../editor";
import { HiOutlineBars2 } from "react-icons/hi2";
import cuid from "cuid";
import { cn } from "@/lib/utils";
import { getHighlightStyles } from "../helpers";
import { shortAnswerSchema } from "../validator";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useAtom } from "jotai";
import { formCustomizationAtom } from "@/lib/atoms";

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
        const schema = shortAnswerSchema(block.props); // Pass all props
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

      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          className={cn("relative mb-6 flex w-full flex-col gap-2")}
          style={highlight ? getHighlightStyles(customizations) : {}}
        >
          <Input
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
              `placeholder:text-editorText placeholder:opacity-50 ${customizations?.theme === "dark" ? "border-primary/25" : ""}`,
              {
                "border-red-500": !isValid && isDirty,
              },
            )}
            style={{
              ...(customizations.inputsWidthType === "full"
                ? { width: "100%" }
                : customizations.inputsWidthType === "auto"
                  ? { width: "auto" }
                  : {
                      width: `${customizations?.inputsWidth}px`,
                    }),
              height: `${customizations?.inputsHeight}px`,
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

export const getshortAnswerSlashCommand = (
  editor: typeof schema.BlockNoteEditor,
) => {
  return {
    title: "Short Answer",
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
            type: "shortAnswer",
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
    icon: <HiOutlineBars2 size={18} />,
  };
};

export const ShortAnswerDragHandleMenu = ({
  props,
  editor,
  block: Block,
}: {
  props: DragHandleMenuProps;
  editor: typeof schema.BlockNoteEditor;
  block: typeof schema.Block;
}) => {
  const block = Block ?? props.block;
  const [config, setConfig] = useState({
    required: (block?.props as any)?.required,
    defaultValue: (block?.props as any)?.value,
    minLength: (block?.props as any)?.minLength,
    maxLength: (block?.props as any)?.maxLength,
    customErrorMessage: (block?.props as any)?.customErrorMessage,
  });

  const handleDefaultAnswerChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    editor.updateBlock(block, {
      props: {
        value: e.target.value,
      },
    });
    setConfig({ ...config, defaultValue: e.target.value });
  };

  const handleRequiredChange = (value: boolean) => {
    editor.updateBlock(block, {
      props: {
        required: value,
      },
    });
    setConfig({ ...config, required: value });
  };

  const handleMinLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    editor.updateBlock(block, {
      props: {
        minLength: Number(e.target.value),
      },
    });
    setConfig({ ...config, minLength: Number(e.target.value) });
  };

  const handleMaxLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    editor.updateBlock(block, {
      props: {
        maxLength: Number(e.target.value),
      },
    });
    setConfig({ ...config, maxLength: Number(e.target.value) });
  };

  const handleCustomErrorMessageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    editor.updateBlock(block, {
      props: {
        customErrorMessage: e.target.value,
      },
    });
    setConfig({ ...config, customErrorMessage: e.target.value });
  };

  return (
    <div className="flex w-full flex-col gap-2 p-2">
      <div className="flex justify-between gap-2 text-sm">
        <Label className="text-primary/75">Required</Label>
        <Switch
          checked={config.required}
          onCheckedChange={handleRequiredChange}
        />
      </div>
      <div className="flex w-full items-center gap-2">
        <Label className="w-2/4 text-primary/75">Min Length</Label>
        <Input
          className="h-8 w-full"
          value={config.minLength}
          onChange={handleMinLengthChange}
        />
      </div>
      <div className="flex w-full items-center gap-2">
        <Label className="w-2/4 text-primary/75">Max Length</Label>
        <Input
          className="h-8 w-full"
          type="number"
          value={config.maxLength ?? Infinity}
          onChange={handleMaxLengthChange}
        />
      </div>
      <div>
        <Label className="text-primary/75">Default Answer</Label>
        <Input
          className="h-8 w-full"
          value={config.defaultValue}
          onChange={handleDefaultAnswerChange}
        />
      </div>
      <div>
        <Label className="text-primary/75">Custom Error Message</Label>
        <Input
          className="h-8 w-full"
          value={config.customErrorMessage}
          onChange={handleCustomErrorMessageChange}
        />
      </div>
    </div>
  );
};
