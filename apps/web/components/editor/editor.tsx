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
import { getSlashMenuItems } from "./helpers";
import { Button } from "../ui/button";
import { shortAnswer, Label, longAnswer } from "./blocks";
import BlocksDragHandleMenu from "./components/drag-handle-menu";

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
};

export default function Editor(props: EditorProps) {
  const { image, logo } = props;
  const editor = useCreateBlockNote({
    initialContent: [
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
            const formData = new FormData(e.target as HTMLFormElement);
            const labeledData: Record<string, FormDataEntryValue> = {};

            for (const [key, value] of formData.entries()) {
              console.log(`${key}: ${value}`);
              // Here, 'key' will be 'username', 'email', etc. (from the 'name' attributes)
              // 'value' will be the user's input
            }
            console.log(labeledData, formData.entries());
          }}
        >
          <BlockNoteView
            editor={editor}
            theme={"light"}
            className="-mx-[54px] w-full p-0"
            onChange={() => {
              console.log(editor.document);
            }}
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
          <Button className="w-fit">Submit</Button>
        </form>
      </div>
    </div>
  );
}
