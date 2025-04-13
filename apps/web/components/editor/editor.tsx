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
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import Image from "next/image";
import { getSlashMenuItems } from "./helpers";
import { ShortInput } from "./blocks/short-input";

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    shortInput: ShortInput,
  },
});

export default function Editor() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "heading",
        content: "Heading",
      },
    ],
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
        <div className=" max-w-[600px] w-full">
          <BlockNoteView editor={editor} theme={"light"} className="w-full">
            <SuggestionMenuController
              triggerCharacter={"/"}
              getItems={async (query) =>
                // @ts-ignore
                filterSuggestionItems(getSlashMenuItems(editor), query)
              }
            />
          </BlockNoteView>
        </div>
      </div>
    </div>
  );
}
