import { getDefaultReactSlashMenuItems } from "@blocknote/react";
import { schema } from "./editor";
import { getShortInputSlashCommand } from "./blocks";

export const getSlashMenuItems = (editor: typeof schema.BlockNoteEditor) => {
  const itemsToExclude = ["table", "check_list"];
  const items = getDefaultReactSlashMenuItems(editor);
  const filteredItems = items.filter((item: any) => {
    return !itemsToExclude.includes(item.key);
  });
  return [getShortInputSlashCommand(editor), ...filteredItems];
};
