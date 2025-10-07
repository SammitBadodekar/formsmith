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
  emailInput,
  linkInput,
  multiChoice,
} from "./blocks";
import BlocksDragHandleMenu from "./components/drag-handle-menu";
import {
  ArrowRight,
  Hexagon,
  Loader,
  Move,
  PanelTop,
  Trash2,
} from "lucide-react";
import { Form } from "@formsmith/database";
import {
  Dispatch,
  memo,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  emailInputSchema,
  linkInputSchema,
  longAnswerSchema,
  shortAnswerSchema,
} from "./validator";
import { Uploader } from "../modals/uploader";
import { useAtom } from "jotai";
import { formCustomizationAtom } from "@/lib/atoms";
import { hexToHsl } from "../ui/color-picker";
import { MdOutlineDashboardCustomize } from "react-icons/md";
import {
  multiColumnDropCursor,
  withMultiColumn,
} from "@blocknote/xl-multi-column";

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    shortAnswer: shortAnswer,
    label: Label,
    longAnswer: longAnswer,
    newPage: NewPage,
    thankYouPage: ThankYouPage,
    emailInput: emailInput,
    linkInput: linkInput,
    multiChoice: multiChoice,
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
  setShowCustomization?: Dispatch<SetStateAction<boolean>>;
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
  const {
    formData,
    editable = true,
    submitButtonText = "Submit",
    isThankYou,
    setFormData,
    onSave,
    setShowCustomization,
  } = props;

  const [isFormGloballyValid, setIsFormGloballyValid] = useState<boolean>(true);
  const [isLastPageThankYou, setIsLastPageThankYou] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customizations, setCustomizations] = useAtom(formCustomizationAtom);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
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

    schema: withMultiColumn(schema),
    dropCursor: multiColumnDropCursor,
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
      case "emailInput":
        return emailInputSchema;
      case "linkInput":
        return linkInputSchema;
      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    if (!editor || editable) return;

    let allFieldsValidAfterFinalCheck = true;
    const currentBlocks = editor.document;

    for (const block of currentBlocks) {
      if (inputTypes.includes(block.type)) {
        const currentBlockProps = block.props;
        const zodSchemaFn = getBlockSchema(block.type);

        if (zodSchemaFn) {
          const schema = zodSchemaFn(currentBlockProps);
          // @ts-ignore
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
    checkOverallFormValidity(editor.document as any);

    if (!allFieldsValidAfterFinalCheck) {
      console.log("Form is invalid. Please check the fields.");
      return;
    }

    console.log("Form is valid. Submitting data...");
    setIsSubmitting(true);
    const submissionData = getSubmissionData(editor as any);
    await props?.onSubmit?.(submissionData, editor.document);
    setIsSubmitting(false);
  };

  const handleUpdateCustomizations = (customizations: Record<string, any>) => {
    setFormData?.({ ...(customizations as any) });
    setCustomizations?.((prev) => ({ ...prev, ...customizations }));
    onSave?.(editor.document);
  };

  const calculateConstrainedPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageContainerRef.current || !imageRef.current) return null;

      const containerRect = imageContainerRef.current.getBoundingClientRect();
      const img = imageRef.current;

      // Get actual rendered image dimensions
      const imgNaturalWidth = img.naturalWidth;
      const imgNaturalHeight = img.naturalHeight;
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      // Calculate the scale factor (image is object-fit: cover)
      const scaleX = containerWidth / imgNaturalWidth;
      const scaleY = containerHeight / imgNaturalHeight;
      const scale = Math.max(scaleX, scaleY);

      // Calculate rendered image dimensions
      const renderedWidth = imgNaturalWidth * scale;
      const renderedHeight = imgNaturalHeight * scale;

      // Calculate how much the image overflows the container
      const overflowX = renderedWidth - containerWidth;
      const overflowY = renderedHeight - containerHeight;

      // Calculate mouse position relative to container
      const mouseX = clientX - containerRect.left;
      const mouseY = clientY - containerRect.top;

      // Convert to percentage, but constrain to prevent black areas
      let x = (mouseX / containerWidth) * 100;
      let y = (mouseY / containerHeight) * 100;

      // Constrain based on overflow
      if (overflowX > 0) {
        const minX = 0;
        const maxX = 100;
        x = Math.max(minX, Math.min(maxX, x));
      } else {
        x = 50; // Center if image is wider than container
      }

      if (overflowY > 0) {
        const minY = 0;
        const maxY = 100;
        y = Math.max(minY, Math.min(maxY, y));
      } else {
        y = 50; // Center if image is taller than container
      }

      return { x, y };
    },
    [],
  );

  const handleImageMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;

      const position = calculateConstrainedPosition(e.clientX, e.clientY);
      if (position) {
        setImagePosition(position);
      }
    },
    [isDragging, calculateConstrainedPosition],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isRepositioning) return;
      setIsDragging(true);
      const position = calculateConstrainedPosition(e.clientX, e.clientY);
      if (position) {
        setImagePosition(position);
      }
    },
    [isRepositioning, calculateConstrainedPosition],
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setIsRepositioning(false);
      handleUpdateCustomizations({
        imagePosition: `${imagePosition.x}% ${imagePosition.y}%`,
      });
    }
  }, [isDragging, imagePosition, handleUpdateCustomizations]);

  const handleRepositionStart = () => {
    // Parse existing position if any
    const currentPos = customizations.imagePosition || "center";
    const positionMap: Record<string, { x: number; y: number }> = {
      "top left": { x: 0, y: 0 },
      "top center": { x: 50, y: 0 },
      "top right": { x: 100, y: 0 },
      "center left": { x: 0, y: 50 },
      center: { x: 50, y: 50 },
      "center right": { x: 100, y: 50 },
      "bottom left": { x: 0, y: 100 },
      "bottom center": { x: 50, y: 100 },
      "bottom right": { x: 100, y: 100 },
    };

    // Try to parse percentage values
    if (currentPos.includes("%")) {
      const [xStr, yStr] = currentPos.split(" ");
      const x = parseFloat(xStr);
      const y = parseFloat(yStr);
      if (!isNaN(x) && !isNaN(y)) {
        setImagePosition({ x, y });
        setIsRepositioning(true);
        return;
      }
    }

    setImagePosition(positionMap[currentPos] || { x: 50, y: 50 });
    setIsRepositioning(true);
  };

  useEffect(() => {
    if (
      !formData?.customizations ||
      Object.keys(formData?.customizations).length === 0
    )
      return;

    // setCustomizations({
    //   ...(formData?.customizations as FormCustomizations),
    // });

    document.documentElement.style.setProperty(
      "--editor-background",
      customizations.backgroundColor,
    );
    document.documentElement.style.setProperty(
      "--editor-text",
      customizations.color,
    );
    document.documentElement.style.setProperty(
      "--editor-background-hsl",
      `${hexToHsl(customizations.backgroundColor)}`,
    );
    document.documentElement.style.setProperty(
      "--editor-text-hsl",
      `${hexToHsl(customizations.color)}`,
    );
  }, [formData?.customizations]);
  return (
    <div
      className={`h-full ${editable ? "min-h-[calc(100svh_-_56px)]" : "min-h-svh"} w-full overflow-y-auto pb-12`}
      style={{ ...(formData?.customizations ?? {}), ...customizations }}
    >
      {customizations?.image ? (
        <div
          ref={imageContainerRef}
          className="relative select-none"
          onMouseMove={handleImageMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: isRepositioning
              ? isDragging
                ? "grabbing"
                : "grab"
              : "default",
          }}
        >
          <img
            ref={imageRef}
            src={customizations?.image}
            height={customizations.imageHeight ?? 200}
            width={400}
            alt="cover image"
            className="pointer-events-none w-full object-cover"
            draggable={false}
            style={{
              height: `${customizations.imageHeight ?? 200}px`,
              objectPosition: isDragging
                ? `${imagePosition.x}% ${imagePosition.y}%`
                : customizations.imagePosition || "center",
            }}
          />
          {isRepositioning && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-white">
                <Move className="h-8 w-8" />
                <p className="text-lg font-bold">
                  {isDragging ? "Dragging..." : "Click and drag to reposition"}
                </p>
                <p className="text-sm">{isDragging ? "Release to save" : ""}</p>
              </div>
            </div>
          )}
          {editable && !isRepositioning && (
            <div className="absolute bottom-4 right-4 flex gap-4">
              <Uploader
                callback={(url) => {
                  handleUpdateCustomizations({ image: url });
                }}
                showUnsplash={true}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2 font-black"
                >
                  <PanelTop />
                  <p>Change</p>
                </Button>
              </Uploader>{" "}
              <Button
                variant="secondary"
                size="sm"
                className="flex items-center gap-2 font-black"
                onClick={handleRepositionStart}
              >
                <Move />
                <p>Reposition</p>
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
            <div className={`mt-2 flex w-full gap-4`}>
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
                  showUnsplash={true}
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
              <Button
                variant="ghost"
                onClick={() => setShowCustomization?.((prev: boolean) => !prev)}
              >
                <MdOutlineDashboardCustomize />
                <p>Customize</p>
              </Button>
            </div>
          )}
          <BlockNoteView
            ref={editorRef}
            editor={editor}
            data-theming-formsmith
            theme={customizations?.theme === "dark" ? "dark" : "light"}
            className="m-0 w-full px-0"
            onChange={() => {
              onSave?.(editor.document);
              setIsLastPageThankYou(
                (
                  editor.document.findLast((b) => b.type === "newPage")
                    ?.props as any
                )?.isThankYou
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
                "--editor-background-hsl": hexToHsl(
                  customizations?.backgroundColor,
                ),
                "--editor-text-hsl": hexToHsl(customizations?.color),
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
                          <BlocksDragHandleMenu
                            props={props}
                            editor={editor as any}
                          />
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
            <div
              style={{
                display: "flex",
                width: "100%",
                justifyContent:
                  customizations.buttonAlignment === "left"
                    ? "flex-start"
                    : customizations.buttonAlignment === "center"
                      ? "center"
                      : "flex-end",
                alignItems: "center",
              }}
            >
              <Button
                className={`${customizations?.theme === "dark" ? "bg-primary-foreground text-primary hover:bg-primary-foreground/80" : ""} w-fit px-3 font-black`}
                type={editable ? "button" : "submit"}
                disabled={isSubmitting}
                style={{
                  backgroundColor: customizations.buttonColor,
                  color: customizations.buttonText,
                  width:
                    customizations.buttonWidthType === "auto"
                      ? "auto"
                      : customizations?.buttonWidthType === "full"
                        ? "100%"
                        : `${customizations.buttonWidth}px`,
                  height: `${customizations.buttonHeight}px`,
                  borderRadius: `${customizations.buttonRadius}px`,
                  fontSize: `${customizations.buttonFontSize}px`,
                  paddingInline: `${customizations.buttonHorizontalPadding}px`,
                  marginBlock: `${customizations.buttonVerticalMargin}px`,
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
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default memo(Editor, () => true);
