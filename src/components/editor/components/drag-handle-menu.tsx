import { Card, CardContent } from "@/components/ui/card";
import { DragHandleMenuProps, RemoveBlockItem } from "@blocknote/react";
import { useEffect, useRef } from "react";
import { schema } from "../editor";
import { Separator } from "@/components/ui/separator";
import DragHandleMenuTitle from "./drag-handle-menu-title";
import { Trash2 } from "lucide-react";
import DragHandleMenuContent from "./drag-handle-menu-content";
import { skipBlockTitleEditor } from "../helpers";

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
      const correspondentInput = editor.document.find(
        // @ts-ignore
        (b) => b?.props?.label === props.block?.id,
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

  function handleDelete() {
    // @ts-ignore
    if (props.block.type === "label") {
      const correspondentInput = editor.document.find(
        // @ts-ignore
        (b) => b?.props?.label === props.block?.id,
      );
      if (correspondentInput) {
        editor.removeBlocks([correspondentInput]);
      }
    }
  }

  return (
    <div ref={containerRef}>
      <Card className="w-full rounded-none border-none p-0 shadow-none">
        <CardContent className="flex flex-col gap-2 p-2">
          {!skipBlockTitleEditor.includes(props.block.type) && (
            <>
              <DragHandleMenuTitle props={props} editor={editor} />
              <Separator className="" />
            </>
          )}
          <DragHandleMenuContent props={props} editor={editor} />
          <Separator className="" />
          <li className="flex flex-col gap-2">
            <button onClick={handleDelete}>
              <RemoveBlockItem {...props}>
                <div className="-ml-2 flex items-center gap-2 px-1">
                  <Trash2 size={17} />
                  <p className="text-sm font-medium">Delete</p>
                </div>
              </RemoveBlockItem>
            </button>
          </li>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlocksDragHandleMenu;
