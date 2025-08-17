import { Input } from "@/components/ui/input";
import { createReactBlockSpec, DragHandleMenuProps } from "@blocknote/react";
import { schema } from "../editor";
import cuid from "cuid";
import { cn } from "@/lib/utils";
import { getHighlightStyles } from "../helpers";
import { emailInputSchema } from "../validator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useAtom } from "jotai";
import { formCustomizationAtom } from "@/lib/atoms";
import { AtSign } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const emailInput = createReactBlockSpec(
  {
    type: "emailInput",
    propSchema: {
      type: {
        default: "emailInput",
        values: ["emailInput"],
      },
      placeholder: {
        default: "Type placeholder text...",
      },
      name: {
        default: "untitled emailInput",
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
        const schema = emailInputSchema(block.props); // Pass all props
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
          <div
            className="relative flex"
            style={{
              ...(customizations.inputsWidthType === "full"
                ? { width: "100%" }
                : {
                    width: "max-content",
                  }),
            }}
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
            {editor?.isEditable && (
              <span className="absolute right-2 top-[calc(50%_-_0.85rem)]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AtSign size={18} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Email Input</p>
                  </TooltipContent>
                </Tooltip>
              </span>
            )}
          </div>

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

export const getEmailInputSlashCommand = (
  editor: typeof schema.BlockNoteEditor,
) => {
  return {
    title: "Email",
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
            type: "emailInput",
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
    aliases: ["email"],
    group: "Questions",
    icon: <AtSign size={18} />,
  };
};

export const EmailInputDragHandleMenu = ({
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
