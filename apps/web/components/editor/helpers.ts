import { getDefaultReactSlashMenuItems } from "@blocknote/react";
import { schema } from "./editor";
import {
  getLongAnswerSlashCommand,
  getshortAnswerSlashCommand,
} from "./blocks";

export const getSlashMenuItems = (editor: typeof schema.BlockNoteEditor) => {
  const itemsToExclude = ["table", "check_list"];
  const items = getDefaultReactSlashMenuItems(editor);
  const filteredItems = items.filter((item: any) => {
    return !itemsToExclude.includes(item.key);
  });
  return [
    getshortAnswerSlashCommand(editor),
    getLongAnswerSlashCommand(editor),
    ...filteredItems,
  ];
};

export const getHighlightStyles = () => {
  return "bg-[#C6DDF5] rounded-none";
};

export const getPlainText = (block: any) => {
  const c = block.content as any[];
  if (!c) return "";
  if (typeof c === "string") return c;

  return c
    .map((inline) => {
      if (inline.type === "text") {
        return inline.text;
      } else if (inline.type === "link") {
        return inline.content.map((st: any) => st.text).join("");
      }
      return "";
    })
    .join("")
    .replace(/\u200B/g, "")
    .trim();
};
