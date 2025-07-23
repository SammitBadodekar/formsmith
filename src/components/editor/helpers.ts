import { getDefaultReactSlashMenuItems } from "@blocknote/react";
import { schema } from "./editor";
import {
  getLongAnswerSlashCommand,
  getNewPageSlashCommand,
  getshortAnswerSlashCommand,
} from "./blocks";
import { Form, PublishedForm } from "@formsmith/database";

export const getSlashMenuItems = (editor: typeof schema.BlockNoteEditor) => {
  const itemsToExclude = ["table", "check_list"];
  const items = getDefaultReactSlashMenuItems(editor);
  const filteredItems = items.filter((item: any) => {
    return !itemsToExclude.includes(item.key);
  });
  return [
    getshortAnswerSlashCommand(editor),
    getLongAnswerSlashCommand(editor),
    getNewPageSlashCommand(editor),
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
export const customBlockTypes = ["label", "newPage", ...inputTypes];
export const skipBlockTitleEditor = ["newPage"];

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
      submissions.push({
        label: labelValue,
        value,
        input_id: block.id,
        label_id: label,
      });
    }
  });
  return submissions;
};

export const divideFormIntoPages = (formData: Form | PublishedForm) => {
  const pages: any[] = [];
  const blocks = (formData?.data as any[]) ?? [];
  let currentPage: any[] = [];
  let isThankYou = false;
  blocks?.forEach((block) => {
    if (block.type === "newPage") {
      pages.push({
        blocks: currentPage,
        buttonText: block?.props?.buttonText,
        isThankYou: pages.length !== 0 ? isThankYou : false,
      });
      currentPage = [];
      isThankYou = block?.props?.isThankYou;
    } else {
      currentPage.push(block);
    }
  });
  pages.push({
    blocks: currentPage,
    buttonText: "Submit",
    isThankYou,
  });
  pages.push({
    blocks: [
      {
        type: "thankYouPage",
        props: {},
      },
    ],
    isThankYou: true,
  });
  return pages;
};
