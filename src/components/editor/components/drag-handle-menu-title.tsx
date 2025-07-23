"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DragHandleMenuProps } from "@blocknote/react";
import { schema } from "../editor";
import { getPlainText, inputTypes } from "../helpers";
import { Check } from "lucide-react";

const DragHandleMenuTitle = ({
  props,
  editor,
}: {
  props: DragHandleMenuProps;
  editor: typeof schema.BlockNoteEditor;
}) => {
  //@ts-ignore
  let blockName = props.block?.props?.name;
  let blockText = getPlainText(props.block);
  let block = props.block;

  if ((block as any).type === "label") {
    const correspondentInput = editor.document.find(
      // @ts-ignore
      (b) => b?.props?.label === props.block?.id,
    );
    if (correspondentInput) {
      blockName = (correspondentInput as any).props.name;
      block = correspondentInput as any;
    }
  } else if (inputTypes.includes(block.type)) {
    const correspondentLabel = editor.document.find(
      // @ts-ignore
      (b) => b?.id === props.block?.props?.label,
    );
    if (correspondentLabel) {
      blockText = getPlainText(correspondentLabel as any);
    }
  }

  if (blockText && blockName === `untitled ${block.type}`) {
    blockName = null;
  }

  const [title, setTitle] = useState(blockName ? blockName : blockText);
  const [buttonLoading, setButtonLoading] = useState(false);

  const handleTitleChange = () => {
    editor.updateBlock(block, {
      props: {
        name: title,
      },
    });
  };
  return (
    <div className="flex w-full gap-2 px-2">
      <Input
        className="w-full"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
        }}
      />
      <Button
        variant="secondary"
        type="button"
        className="min-w-16"
        onClick={() => {
          handleTitleChange();
          setButtonLoading(true);
          setTimeout(() => {
            setButtonLoading(false);
          }, 1000);
        }}
      >
        {buttonLoading ? <Check /> : "Save"}
      </Button>
    </div>
  );
};

export default DragHandleMenuTitle;
