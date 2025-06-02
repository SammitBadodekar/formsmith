"use client";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  SuggestionMenuController,
  useCreateBlockNote,
  DragHandleMenu,
  SideMenu,
  SideMenuController,
  BlockColorsItem,
  RemoveBlockItem,
} from "@blocknote/react";
import Image from "next/image";
import {
  customBlockTypes,
  getSlashMenuItems,
  getSubmissionData,
  inputTypes,
} from "./helpers";
import { Button } from "../ui/button";
import {
  shortAnswer,
  Label,
  longAnswer,
  NewPage,
  ThankYouPage,
} from "./blocks";
import BlocksDragHandleMenu from "./components/drag-handle-menu";
import { ArrowRight, Loader, Trash2 } from "lucide-react";
import { Form } from "@formsmith/database";
import { memo, useCallback, useState } from "react";
import { longAnswerSchema, shortAnswerSchema } from "./validator";

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    shortAnswer: shortAnswer,
    label: Label,
    longAnswer: longAnswer,
    newPage: NewPage,
    thankYouPage: ThankYouPage,
  },
});

type EditorProps = {
  onSave?: (data: unknown) => void;
  onSubmit?: (data: unknown) => void;
  formData: Form | null;
  editable?: boolean;
  submitButtonText?: string;
  isThankYou?: boolean;
};

type ValidatableBlock = typeof schema.PartialBlock & {
  props: {
    value: string;
    required?: boolean;
    isValid?: boolean;
    isDirty?: boolean;
  };
};

function Editor(props: EditorProps) {
  const [isFormGloballyValid, setIsFormGloballyValid] = useState<boolean>(true);
  const {
    formData,
    editable = true,
    submitButtonText = "Submit",
    isThankYou,
  } = props;
  const [isLastPageThankYou, setIsLastPageThankYou] = useState(false);
  const editor = useCreateBlockNote({
    initialContent:
      (formData?.data as any[])?.length > 0
        ? (formData?.data as any[])
        : [
            {
              type: "heading",
              content: "",
            },
            {
              type: "paragraph",
              content: "",
            },
          ],
    schema: schema,
  });

  const checkOverallFormValidity = useCallback(
    (blocks: (typeof schema.PartialBlock)[]) => {
      let allValid = true;
      for (const block of blocks) {
        if (inputTypes.includes(block?.type!)) {
          const validatableBlock = block as ValidatableBlock;
          if (
            validatableBlock?.props?.required &&
            !validatableBlock?.props?.isValid
          ) {
            allValid = false;
            break;
          }
        }
      }
      setIsFormGloballyValid(allValid);
    },
    [],
  );

  const getBlockSchema = (type: string) => {
    if (type === "shortAnswer") return shortAnswerSchema;
    if (type === "longAnswer") return longAnswerSchema;
    return null;
  };

  const handleSubmit = async () => {
    if (!editor) return;

    let allFieldsValidAfterFinalCheck = true;
    const currentBlocks = editor.document;

    for (const block of currentBlocks) {
      if (block.type === "shortAnswer" || block.type === "longAnswer") {
        const currentBlockProps = block.props;
        const zodSchemaFn = getBlockSchema(block.type);

        if (zodSchemaFn) {
          const schema = zodSchemaFn(currentBlockProps);
          const validationResult = schema.safeParse(currentBlockProps.value);

          const newPropsUpdate: Record<string, any> = {
            isDirty: true,
          };

          if (!validationResult.success) {
            allFieldsValidAfterFinalCheck = false;
            newPropsUpdate.isValid = false;
            newPropsUpdate.errorMessage =
              validationResult.error.errors[0]?.message || "Invalid input.";
          } else {
            newPropsUpdate.isValid = true;
            newPropsUpdate.errorMessage = "";
          }
          editor.updateBlock(block, {
            props: { ...currentBlockProps, ...newPropsUpdate },
          });
        }
      }
    }

    // Update overall validity state based on these explicit checks
    checkOverallFormValidity(editor.document);

    if (!allFieldsValidAfterFinalCheck) {
      console.log("Form is invalid. Please check the fields.");
      return;
    }

    console.log("Form is valid. Submitting data...");
    props?.onSubmit?.(editor.document);
  };
  return (
    <div className="h-full w-full">
      {formData?.image && (
        <Image
          src={formData?.image}
          height={200}
          width={400}
          alt="cover image"
          className="max-h-60 w-full"
        />
      )}
      {!formData?.image && <div className="min-h-40 min-w-full"></div>}
      <div className="flex h-full w-full justify-center">
        <form
          className="flex w-full max-w-[800px] flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            console.log("submitted", getSubmissionData(editor));
            handleSubmit();
          }}
        >
          <BlockNoteView
            editor={editor}
            theme={"light"}
            className="m-0 w-full px-0"
            onChange={() => {
              props?.onSave?.(editor.document);
              setIsLastPageThankYou(
                editor.document.findLast((b) => b.type === "newPage")?.props
                  ?.isThankYou
                  ? true
                  : false,
              );
            }}
            editable={editable}
            autoFocus={true}
          >
            <SuggestionMenuController
              triggerCharacter={"/"}
              getItems={async (query) =>
                // @ts-ignore
                filterSuggestionItems(getSlashMenuItems(editor), query)
              }
            />
            <SideMenuController
              sideMenu={(props) => {
                return (
                  <SideMenu
                    {...props}
                    dragHandleMenu={(props) => (
                      <DragHandleMenu {...props}>
                        <BlockColorsItem {...props}>Colors</BlockColorsItem>
                        {customBlockTypes.includes(
                          props.block.type as string,
                        ) ? (
                          <BlocksDragHandleMenu props={props} editor={editor} />
                        ) : (
                          <RemoveBlockItem {...props}>
                            <div className="-ml-2 flex items-center gap-2 px-1">
                              <Trash2 size={12} />
                              <p className="text-xs font-medium">Delete</p>
                            </div>
                          </RemoveBlockItem>
                        )}
                      </DragHandleMenu>
                    )}
                  ></SideMenu>
                );
              }}
            />
          </BlockNoteView>
          {!isThankYou && !isLastPageThankYou && (
            <Button
              className="w-fit px-3 font-black"
              type={editable ? "button" : "submit"}
            >
              <p>{submitButtonText}</p>
              <ArrowRight />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

export default memo(Editor, () => true);
