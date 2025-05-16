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

export const inputTypes = ["shortAnswer", "longAnswer"];

export const getSubmissionData = (editor: typeof schema.BlockNoteEditor) => {
  const document = editor.document;

  const submissions: Record<string, string | number>[] = [];

  document.forEach((block) => {
    if (inputTypes.includes(block.type)) {
      // @ts-ignore
      const { value, label } = block.props;
      const labelBlock = document.find((b) => b.id === label);
      let labelValue = `untitled ${block.type}`;
      if (labelBlock) {
        labelValue = getPlainText(labelBlock);
      }
      submissions.push({ label: labelValue, value });
    }
  });
  return submissions;
};
