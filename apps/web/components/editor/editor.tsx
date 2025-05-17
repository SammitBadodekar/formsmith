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
import { getSlashMenuItems, getSubmissionData } from "./helpers";
import { Button } from "../ui/button";
import { shortAnswer, Label, longAnswer } from "./blocks";
import BlocksDragHandleMenu from "./components/drag-handle-menu";
import { ArrowRight, Loader } from "lucide-react";
import { Form } from "@formsmith/database";

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
  onSave?: (data: unknown) => void;
  formData: Form | null;
  editable?: boolean;
};

export default function Editor(props: EditorProps) {
  const { image, logo, formData, editable = true } = props;
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
            console.log("submitted", getSubmissionData(editor));
          }}
        >
          <BlockNoteView
            editor={editor}
            theme={"light"}
            className="-mx-[54px] w-full p-0"
            onChange={() => {
              props?.onSave?.(editor.document);
            }}
            editable={editable}
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
          <Button className="w-fit px-3 font-black" type="submit">
            <p>Submit</p>
            <ArrowRight />
          </Button>
        </form>
      </div>
    </div>
  );
}
