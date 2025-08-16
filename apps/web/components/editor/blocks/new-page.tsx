import { Input } from "@/components/ui/input";
import { createReactBlockSpec, DragHandleMenuProps } from "@blocknote/react";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, StickyNote } from "lucide-react";
import { schema } from "../editor";
import { Button } from "@/components/ui/button";
import { Label } from "@radix-ui/react-label";
import { useState } from "react";
import { useAtom } from "jotai";
import { formCustomizationAtom } from "@/lib/atoms";

export const NewPage = createReactBlockSpec(
  {
    type: "newPage",
    propSchema: {
      type: {
        default: "newPage",
        values: ["newPage"],
      },
      isThankYou: {
        default: false,
      },
      pageName: {
        default: "new page",
      },
      buttonText: {
        default: "Next",
      },
      hideButton: {
        default: false,
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { editor, block } = props;
      const { isThankYou, buttonText, pageName, hideButton } = block.props;
      const [customizations] = useAtom(formCustomizationAtom);

      return (
        <div className="flex w-full flex-col gap-2">
          {!hideButton && (
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
              }}
            >
              <Button
                className="w-fit px-3 font-semibold"
                type={editor.isEditable ? "button" : "submit"}
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
                <p>{buttonText}</p>
                <ArrowRight />
              </Button>
            </div>
          )}
          <div className="relative flex w-full items-center gap-2 py-8 text-primary/75">
            <hr
              className="h-0.5 w-full"
              style={{
                backgroundColor: customizations.color,
              }}
            />
            <span
              className="absolute left-[calc(50%_-_2rem)] top-7 z-10 w-fit px-4 text-center text-sm"
              style={{
                backgroundColor: customizations.backgroundColor,
                color: customizations.color,
              }}
            >
              {pageName}
            </span>
            <span
              className="w-max min-w-28 flex-1 text-center text-xs font-bold"
              style={{
                color: customizations.color,
              }}
            >
              'Thank you' page
            </span>
            <Switch
              checked={isThankYou}
              style={{
                backgroundColor: customizations.color,
                filter: "brightness(90%)",
              }}
              thumbStyles={{
                backgroundColor: customizations.backgroundColor,
              }}
              onCheckedChange={() => {
                editor.updateBlock(block, {
                  props: {
                    isThankYou: !isThankYou,
                  },
                });
                const currentPageIndex = editor.document.findIndex(
                  (b) => b.id === block.id,
                );
                const nextPage = editor.document.find(
                  (b, index) =>
                    b.type === "newPage" && index > currentPageIndex,
                );
                if (nextPage) {
                  editor.updateBlock(nextPage, {
                    props: {
                      hideButton: !isThankYou,
                    },
                  });
                }
              }}
            />
          </div>
        </div>
      );
    },
  },
);

export const getNewPageSlashCommand = (
  editor: typeof schema.BlockNoteEditor,
) => {
  return {
    title: "New Page",
    subtext: "",
    onItemClick: () => {
      const blocks = editor.insertBlocks(
        [
          {
            type: "newPage",
            props: {
              isThankYou: false,
            },
          },
        ],
        editor.getTextCursorPosition().block, // Insert after current block
        "after",
      );
      // @ts-ignore
      editor.removeBlocks([editor.getPrevBlock(blocks[0])]);
    },
    aliases: ["new page"],
    group: "Layout blocks",
    icon: <StickyNote size={18} />,
  };
};

export const NewPageDragHandleMenu = ({
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
    isThankYou: (block?.props as any)?.isThankYou,
    buttonText: (block?.props as any)?.buttonText,
    pageName: (block?.props as any)?.pageName,
  });
  const handleButtonTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    editor.updateBlock(block, {
      props: {
        buttonText: e.target.value,
      },
    });
    setConfig({ ...config, buttonText: e.target.value });
  };

  const handlePageNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    editor.updateBlock(block, {
      props: {
        pageName: e.target.value,
      },
    });
    setConfig({ ...config, pageName: e.target.value });
  };

  return (
    <div className="flex w-full flex-col gap-2 p-2 text-sm">
      <div className="flex w-full items-center gap-2">
        <Label className="w-2/4 text-primary/75">Button Text</Label>
        <Input
          className="h-8 w-full"
          value={config.buttonText}
          onChange={handleButtonTextChange}
        />
      </div>
      <div className="flex w-full items-center gap-2">
        <Label className="w-2/4 text-primary/75">Page Name</Label>
        <Input
          className="h-8 w-full"
          value={config.pageName}
          onChange={handlePageNameChange}
        />
      </div>
    </div>
  );
};
