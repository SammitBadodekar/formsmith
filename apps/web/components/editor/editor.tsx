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
  BlockColorsItem,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
} from "@blocknote/react";
import Image from "next/image";
import { getSlashMenuItems } from "./helpers";
import { Button } from "../ui/button";
import { ShortInput, Label } from "./blocks";
import { v4 as uuid } from "uuid";
import { MdOutlineDelete } from "react-icons/md";
import BlocksDragHandleMenu from "./components/drag-handle-menu";

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    shortInput: ShortInput,
    label: Label,
  },
});

export default function Editor() {
  if (typeof window === "undefined") return <div>Loading...</div>;

  const editor = useCreateBlockNote({
    initialContent: [
      {
        id: uuid(),
        type: "heading",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
          level: 1,
        },
        content: [
          {
            type: "text",
            text: "Heading",
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: uuid(),
        type: "shortInput",
        props: {
          type: "shortInput",
          placeholder: "Type placeholder text...",
        },
        children: [],
      },
      {
        id: uuid(),
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [],
        children: [],
      },
    ],
    // [
    //   {
    //     type: "heading",
    //     content: "Heading",
    //   },
    //   {
    //     type: "paragraph",
    //     content: "",
    //   },
    // ],
    schema: schema,
  });
  return (
    <div className="w-full h-full">
      <Image
        src={"https://tally.so/images/placeholders/form-cover.jpg"}
        height={200}
        width={400}
        alt="cover image"
        className="w-full max-h-60"
      />
      <div className="flex w-full h-full justify-center items-center">
        <form
          className="max-w-[600px] w-full flex flex-col gap-4"
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
            className="w-full p-0 -mx-[54px]"
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
            <SideMenuController
              sideMenu={(props) => (
                <SideMenu
                  {...props}
                  dragHandleMenu={(props) => (
                    <DragHandleMenu {...props}>
                      {/* <RemoveBlockItem {...props}>Delete</RemoveBlockItem>
                      <BlockColorsItem {...props}>Colors</BlockColorsItem> */}
                      <BlocksDragHandleMenu {...props} />
                    </DragHandleMenu>
                  )}
                ></SideMenu>
              )}
            />
          </BlockNoteView>
          <Button className="w-fit">Submit</Button>
        </form>
      </div>
    </div>
  );
}
