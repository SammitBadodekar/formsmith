"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DragHandleMenuProps } from "@blocknote/react";
import { schema } from "../editor";
import { getPlainText } from "../helpers";
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
    const correspondentInput = editor.document?.find(
      (block) => block.id === (props.block as any)?.props?.for
    );
    if (correspondentInput) {
      blockName = (correspondentInput as any).props.name;
      block = correspondentInput as any;
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
    <div className="flex gap-2 w-full">
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
