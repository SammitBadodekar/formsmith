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
} from "@blocknote/react";
import Image from "next/image";
import { getSlashMenuItems, getSubmissionData, inputTypes } from "./helpers";
import { Button } from "../ui/button";
import { shortAnswer, Label, longAnswer } from "./blocks";
import BlocksDragHandleMenu from "./components/drag-handle-menu";
import { ArrowRight, Loader } from "lucide-react";
import { Form } from "@formsmith/database";
import { useCallback, useState } from "react";
import { longAnswerSchema, shortAnswerSchema } from "./validator";

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    shortAnswer: shortAnswer,
    label: Label,
    longAnswer: longAnswer,
  },
});

type EditorProps = {
  image: string;
  logo: string;
  onSave?: (data: unknown) => void;
  formData: Form | null;
  editable?: boolean;
};

type ValidatableBlock = typeof schema.PartialBlock & {
  props: {
    value: string;
    required?: boolean;
    isValid?: boolean;
    isDirty?: boolean;
  };
};

export default function Editor(props: EditorProps) {
  const [isFormGloballyValid, setIsFormGloballyValid] = useState<boolean>(true);
  const { image, logo, formData, editable = true } = props;
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

    // If all valid, proceed with submission
    console.log("Form is valid. Submitting data...");
    const formData = editor.document
      .filter((b) => b.type === "shortAnswer" || b.type === "longAnswer")
      .map((b) => ({
        id: b.id,
        name: (b.props as any).name || `block-${b.id}`,
        value: b.props.value,
        labelId: (b.props as any).label,
      }));

    console.log("Formatted Data:", formData);
  };

  return (
    <div className="h-full w-full">
      {image && (
        <Image
          src={image}
          height={200}
          width={400}
          alt="cover image"
          className="max-h-60 w-full"
        />
      )}
      {!image && <div className="min-h-40 min-w-full"></div>}
      <div className="flex h-full w-full justify-center">
        <form
          className="flex w-full max-w-[600px] flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            console.log("submitted", getSubmissionData(editor));
            handleSubmit();
          }}
        >
          <BlockNoteView
            editor={editor}
            theme={"light"}
            className="-mx-[54px] w-full p-0"
            onChange={() => {
              props?.onSave?.(editor.document);
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
            {/* <SideMenuController
              sideMenu={(props) => (
                <SideMenu
                  {...props}
                  dragHandleMenu={(props) => (
                    <DragHandleMenu {...props}>
                      <RemoveBlockItem {...props}>Delete</RemoveBlockItem>
                      <BlockColorsItem {...props}>Colors</BlockColorsItem>
                      <BlocksDragHandleMenu props={props} editor={editor} />
                    </DragHandleMenu>
                  )}
                ></SideMenu>
              )}
            /> */}
          </BlockNoteView>
          <Button className="w-fit px-3 font-black" type="submit">
            <p>Submit</p>
            <ArrowRight />
          </Button>
        </form>
      </div>
    </div>
  );
}
