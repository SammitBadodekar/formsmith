import { Card, CardContent } from "@/components/ui/card";
import { DragHandleMenuProps } from "@blocknote/react";
import React, { useEffect, useRef } from "react";
import { schema } from "../editor";
import { Separator } from "@/components/ui/separator";
import DragHandleMenuTitle from "./drag-handle-menu-title";

const BlocksDragHandleMenu = ({
  props,
  editor,
}: {
  props: DragHandleMenuProps;
  editor: typeof schema.BlockNoteEditor;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    updateHighlight(true);
    function handleClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        updateHighlight(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  function updateHighlight(value: boolean) {
    editor.updateBlock(props.block, {
      props: {
        highlight: value,
      },
    });
    // @ts-ignore
    if (props.block.type === "label") {
      const correspondentInput = editor.document?.find(
        // @ts-ignore
        (block) => block.id === props.block?.props?.for,
      );
      if (correspondentInput) {
        editor.updateBlock(correspondentInput, {
          props: {
            highlight: value,
          },
        });
      }
    }
  }

  return (
    <div ref={containerRef}>
      <Card className="w-full rounded-none border-none p-0 shadow-none">
        <CardContent className="flex flex-col gap-2 p-2">
          <DragHandleMenuTitle props={props} editor={editor} />
          <Separator className="" />
          <Separator className="" />
          <li className="flex flex-col gap-2">
            <button>Delete</button>
          </li>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlocksDragHandleMenu;
