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
import { ArrowRight, Hexagon, Loader, PanelTop, Trash2 } from "lucide-react";
import { Form, PublishedForm } from "@formsmith/database";
import {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { longAnswerSchema, shortAnswerSchema } from "./validator";
import { Uploader } from "../modals/uploader";
import { useAtom } from "jotai";
import { formCustomizationAtom } from "@/lib/atoms";

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
  onSubmit?: (submissionData: unknown, document: any) => void;
  formData: Form | null;
  setFormData?: (data: Form) => void;
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
    setFormData,
    onSave,
  } = props;
  const [isLastPageThankYou, setIsLastPageThankYou] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customizations, setCustomizations] = useAtom(formCustomizationAtom);
  const editorRef = useRef<HTMLDivElement>(null);
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
    switch (type) {
      case "shortAnswer":
        return shortAnswerSchema;
      case "longAnswer":
        return longAnswerSchema;
      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    if (!editor || editable) return;

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
    setIsSubmitting(true);
    const submissionData = getSubmissionData(editor);
    await props?.onSubmit?.(submissionData, editor.document);
    setIsSubmitting(false);
  };

  const handleUpdateCustomizations = (customizations: Record<string, any>) => {
    setFormData?.({ ...(customizations as any) });
    setCustomizations?.((prev) => ({ ...prev, ...customizations }));
    onSave?.(editor.document);
  };

  useEffect(() => {
    setCustomizations({
      ...(formData?.customizations ?? {}),
      logo: formData?.logo,
      image: formData?.image,
    });

    document.documentElement.style.setProperty(
      "--editor-background",
      customizations.backgroundColor,
    );
    document.documentElement.style.setProperty(
      "--editor-text",
      customizations.color,
    );
  }, [formData?.customizations]);
  return (
    <div
      className={`h-full ${editable ? "min-h-[calc(100svh_-_56px)]" : "min-h-svh"} w-full pb-12`}
      style={{ ...(formData?.customizations ?? {}), ...customizations }}
    >
      {customizations?.image ? (
        <div className="relative">
          <img
            src={customizations?.image}
            height={200}
            width={400}
            alt="cover image"
            className="max-h-60 w-full object-cover"
          />
          {editable && (
            <div className="absolute bottom-4 right-4 flex gap-4">
              <Uploader
                callback={(url) => {
                  handleUpdateCustomizations({ image: url });
                }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2 font-black"
                >
                  <PanelTop />
                  <p>Change</p>
                </Button>
              </Uploader>
              <Button
                variant="secondary"
                className="flex items-center gap-2 font-black"
                size="sm"
                onClick={() => {
                  handleUpdateCustomizations({
                    image: "",
                  });
                }}
              >
                <Trash2 />
                Remove
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-40 w-full"></div>
      )}
      <div className="flex w-full flex-col items-center">
        <form
          className="flex w-full flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          style={{
            maxWidth: `${customizations.pageWidth ?? 800}px`,
            fontSize: `${customizations.baseFontSize ?? 16}px`,
          }}
        >
          {customizations?.logo && (
            <Uploader
              callback={(url) => {
                handleUpdateCustomizations({ logo: url });
              }}
            >
              <img
                src={customizations?.logo}
                alt="cover image"
                className="relative z-10 -mt-10 object-cover"
                style={{
                  borderRadius: `${customizations?.logoCornerRadius ?? 50}%`,
                  height: `${customizations?.logoHeight ?? 100}px`,
                  width: `${customizations?.logoWidth ?? 100}px`,
                }}
              />
            </Uploader>
          )}
          {editable && (
            <div
              className={`${customizations?.image && formData?.logo ? "hidden" : "mt-2 flex w-full gap-4"}`}
            >
              {!customizations?.logo && (
                <Uploader
                  callback={(url) => {
                    handleUpdateCustomizations({ logo: url });
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 font-black"
                  >
                    <Hexagon />
                    <p> Add logo</p>
                  </Button>
                </Uploader>
              )}
              {!customizations?.image && (
                <Uploader
                  callback={(url) => {
                    handleUpdateCustomizations({ image: url });
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 font-black"
                  >
                    <PanelTop />
                    <p> Add cover</p>
                  </Button>
                </Uploader>
              )}
            </div>
          )}
          <BlockNoteView
            ref={editorRef}
            editor={editor}
            data-theming-formsmith
            theme={customizations?.theme ?? "light"}
            className="m-0 w-full px-0"
            onChange={() => {
              onSave?.(editor.document);
              setIsLastPageThankYou(
                editor.document.findLast((b) => b.type === "newPage")?.props
                  ?.isThankYou
                  ? true
                  : false,
              );
            }}
            editable={editable}
            autoFocus={true}
            style={
              {
                "--editor-background": customizations?.backgroundColor,
                "--editor-text": customizations?.color,
              } as any
            }
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
              className={`${customizations?.theme === "dark" ? "bg-primary-foreground text-primary hover:bg-primary-foreground/80" : ""} w-fit px-3 font-black`}
              type={editable ? "button" : "submit"}
              disabled={isSubmitting}
              style={{
                backgroundColor: customizations.buttonColor,
                color: customizations.buttonText,
              }}
            >
              {isSubmitting ? (
                <Loader className="mx-8 animate-spin" />
              ) : (
                <>
                  <p>{submitButtonText}</p>
                  <ArrowRight />
                </>
              )}
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

export default memo(Editor, () => true);
