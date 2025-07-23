import { DragHandleMenuProps } from "@blocknote/react";
import { schema } from "../editor";
import { NewPageDragHandleMenu, ShortAnswerDragHandleMenu } from "../blocks";

const DragHandleMenuContent = ({
  props,
  editor,
}: {
  props: DragHandleMenuProps;
  editor: typeof schema.BlockNoteEditor;
}) => {
  let block = props.block;

  if ((block as any).type === "label") {
    const correspondentInput = editor.document.find(
      // @ts-ignore
      (b) => b?.props?.label === props.block?.id,
    );
    if (correspondentInput) {
      block = correspondentInput as any;
    }
  }

  switch (block.type as string) {
    case "shortAnswer":
      return (
        <ShortAnswerDragHandleMenu
          props={props}
          editor={editor}
          block={block}
        />
      );
    case "longAnswer":
      return (
        <ShortAnswerDragHandleMenu
          props={props}
          editor={editor}
          block={block}
        />
      );
    case "newPage":
      return (
        <NewPageDragHandleMenu props={props} editor={editor} block={block} />
      );
    default:
      return <></>;
  }
};

export default DragHandleMenuContent;
