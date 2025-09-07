import { createReactBlockSpec } from "@blocknote/react";
import editor, { schema } from "../editor";
import cuid from "cuid";
import { cn } from "@/lib/utils";
import { getHighlightStyles } from "../helpers";
import { Textarea } from "@/components/ui/textarea";
import { multiChoiceSchema } from "../validator";
import { useAtom } from "jotai";
import { formCustomizationAtom } from "@/lib/atoms";
import { CircleCheckBig, GripVertical } from "lucide-react";
import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
  pointerWithin,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/editor-dialog";

type Row = Option[];
type Rows = Row[];
type Option = {
  text: string;
  selected?: boolean;
  image?: string;
  id: string;
  color: string;
};

const findRowIndexByItem = (rows: Rows, id: string) =>
  rows.findIndex((r) => r.some((o) => o.id === id));

const findItemIndexInRow = (row: Row, id: string) =>
  row.findIndex((o) => o.id === id);

const getItemIndexInRow = (row: Row, id: string) =>
  row.findIndex((o) => o.id === id);

const insertIntoRow = (row: Row, item: Option, index: number) => {
  const copy = [...row];
  copy.splice(index, 0, item);
  return copy;
};

const removeFromRow = (row: Row, id: string) => row.filter((x) => x.id !== id);

const SortableOption: React.FC<{
  option: Option;
  setOptionText: (text: string, option: Option) => void;
  index: number;
  editor: typeof schema.BlockNoteEditor;
  block: typeof schema.PartialBlock;
}> = ({ option, setOptionText, index, editor, block }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });
  const [customizations] = useAtom(formCustomizationAtom);
  const [open, setOpen] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    color: customizations?.color,
    userSelect: "none",
    width:
      customizations?.inputsWidthType === "full"
        ? "100%"
        : `${customizations.inputsWidth}px`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative"
    >
      <input
        type="text"
        value={option.text}
        placeholder={editor.isEditable ? `Type option` : ""}
        onChange={(e) => setOptionText(e.target.value, option)}
        className="w-full"
        style={{
          padding: `${customizations?.inputsHorizontalPadding}px`,
          background: customizations?.inputsBackgroundColor,
          borderRadius: `${customizations?.inputsRadius}px`,
          borderWidth: `${customizations?.inputsBorderWidth}px`,
          borderColor: customizations?.inputsBorderColor,
        }}
        disabled={!editor.isEditable}
      />
      <div className={`${!open ? "hidden" : ""} group-hover:flex`}>
        <div
          className="absolute right-2 top-[calc(50%_-_1rem)] z-10"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        ></div>
      </div>
      {/* <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="p-2"
          style={{
            background: customizations?.inputsBackgroundColor,
          }}
        >
          {editor.isEditable && <GripVertical size={18} />}
        </PopoverTrigger>
        <PopoverContent className="min-h-40">
          Place content for the popover here.
          <button>dfdsf</button>
          <button>dfdsf</button>
          <button>dfdsf</button>
          <button>dfdsf</button>
          <button>dfdsf</button>
          <button>dfdsf</button>
        </PopoverContent>
      </Popover> */}
    </div>
  );
};

const RowContainer: React.FC<{ row: Row; children: React.ReactNode }> = ({
  children,
}) => {
  const [customizations] = useAtom(formCustomizationAtom);
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        borderRadius: 8,
        alignItems: "flex-start",
        width: "100%",
      }}
    >
      {children}
    </div>
  );
};

const RowBreak: React.FC<{ id: string }> = ({ id }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [customizations] = useAtom(formCustomizationAtom);
  return (
    <div
      ref={setNodeRef}
      className="my-0.5"
      style={{
        width: "100%",
        height: "0.25rem",
        borderRadius: 6,
        background: isOver ? customizations?.color : "transparent",
      }}
    />
  );
};

export const multiChoice = createReactBlockSpec(
  {
    type: "multiChoice",
    propSchema: {
      type: {
        default: "multiChoice",
        values: ["multiChoice"],
      },
      placeholder: {
        default: "Type placeholder text...",
      },
      name: {
        default: "untitled multiChoice",
      },
      highlight: {
        default: false,
      },
      value: {
        default: "",
      },
      required: {
        default: true,
      },
      options: {
        // @ts-ignore
        default: JSON.stringify([
          {
            text: "",
            id: cuid(),
            color: "",
            image: "",
            selected: false,
          },
        ]),
      },
      minSelected: {
        default: 0,
      },
      maxSelected: {
        default: Infinity,
      },
      customErrorMessage: {
        default: "",
      },
      isValid: {
        default: true,
      },
      errorMessage: {
        default: "",
      },
      isDirty: {
        default: false,
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { editor, block } = props;
      const {
        value,
        placeholder,
        required,
        isValid,
        errorMessage,
        isDirty,
        options: optionsRaw,
      } = block.props;
      const [customizations] = useAtom(formCustomizationAtom);
      console.log("here re-rendered", props);
      return (
        <>
          <RenderOptions {...props} />
          <Dialog>
            <DialogTrigger>
              {editor.isEditable && <GripVertical size={18} />}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete
                  your account and remove your data from our servers.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </>
      );
    },
  },
);

export const getMultiChoiceSlashCommand = (
  editor: typeof schema.BlockNoteEditor,
) => {
  return {
    title: "Multi Choice",
    subtext: "",
    onItemClick: () => {
      const labelId = cuid();
      const placeholder = "\u200B";
      const blocks = editor.insertBlocks(
        [
          {
            type: "label",
            id: labelId,
            props: {
              value: "Type a question",
            },
            content: [
              {
                type: "text",
                text: placeholder,
                styles: {
                  bold: true,
                },
              },
            ],
          },
          {
            type: "multiChoice",
            props: {
              options: JSON.stringify([
                [
                  {
                    text: "",
                    id: cuid(),
                    color: "",
                    image: "",
                    selected: false,
                  },
                ],
              ]),
            },
          },
        ],
        editor.getTextCursorPosition().block, // Insert after current block
        "after",
      );
      // @ts-ignore
      editor.removeBlocks([editor.getPrevBlock(blocks[0])]);
    },
    aliases: ["short input", "input", "text", "string"],
    group: "Questions",
    icon: <CircleCheckBig size={18} />,
  };
};

const RenderOptions = (props: any) => {
  console.log("props", props);
  const { editor, block } = props;
  const {
    value,
    placeholder,
    required,
    isValid,
    errorMessage,
    isDirty,
    options: optionsRaw,
  } = block.props;
  const [customizations] = useAtom(formCustomizationAtom);

  const highlight = props?.block?.props?.highlight;

  const validateAndCommit = (currentValue: string) => {
    const schema = multiChoiceSchema(block.props);
    const validationResult = schema.safeParse(currentValue);

    const newProps: Record<string, any> = {
      value: currentValue,
      isDirty: true,
    };

    if (!validationResult.success) {
      newProps.isValid = false;
      newProps.errorMessage =
        validationResult.error.errors[0]?.message || "Invalid input.";
    } else {
      newProps.isValid = true;
      newProps.errorMessage = "";
    }

    editor.updateBlock(block, {
      props: { ...block.props, ...newProps },
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (editor.isEditable) {
      editor.updateBlock(block, {
        props: { ...block.props, placeholder: newValue },
      });
    } else {
      editor.updateBlock(block, {
        props: { ...block.props, value: newValue, isDirty: true },
      });
      validateAndCommit(newValue);
    }
  };

  const handleBlur = () => {
    if (!editor.isEditable) {
      validateAndCommit(block.props.value);
    }
  };

  const options = JSON.parse(optionsRaw);

  // Start as one option per row
  const [rows, setRowsState] = useState<Rows>(options);
  const [activeId, setActiveId] = useState<string | null>(null);

  console.log("options", { options, rows });

  function setRows(next: Rows) {
    setRowsState(next);
    editor.updateBlock(block, {
      props: {
        options: JSON.stringify(next),
      },
    });
  }

  console.log("rows", rows);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const rowsEqual = (a: Rows, b: Rows) =>
    a.length === b.length &&
    a.every(
      (row, i) =>
        row.length === b[i].length && row.every((id, j) => id === b[i][j]),
    );

  const safeSetRows = (
    set: (next: Rows) => void,
    current: Rows,
    next: Rows,
  ) => {
    if (!rowsEqual(current, next)) set(next);
  };

  // We handle cross-row “hover” moves here so you can drag beside/into another row.
  const handleDragOver = (event: DragOverEvent) => {
    const activeId = String(event.active.id);
    const activeOption = rows.flatMap((r) => r).find((o) => o.id === activeId);
    if (!activeOption) return;
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) return;

    // --- Row-breaks: create new line ---
    if (overId.startsWith("row-break-")) {
      const breakIndex = parseInt(overId.replace("row-break-", ""), 10);
      const fromRowIndex = findRowIndexByItem(rows, activeId);
      if (fromRowIndex === -1) return;

      // If the item is already alone and would be inserted at the same spot, do nothing
      if (rows[fromRowIndex].length === 1) {
        const cleaned = rows.filter((r) => r.length > 0);
        const currentPos = cleaned.findIndex((r) => r[0] === activeOption);
        const clamped = Math.max(0, Math.min(breakIndex, cleaned.length));
        if (currentPos === clamped) return; // no-op
      }

      const next = [...rows];
      next[fromRowIndex] = removeFromRow(rows[fromRowIndex], activeId);
      const cleaned = next.filter((r) => r.length > 0);
      const insertAt = Math.max(0, Math.min(breakIndex, cleaned.length));

      const finalRows = [...cleaned];
      finalRows.splice(insertAt, 0, [activeOption]);

      safeSetRows(setRows, rows, finalRows);
      return;
    }

    // --- Item-over logic (within / across rows) ---
    const fromRowIndex = findRowIndexByItem(rows, activeId);
    const toRowIndex = findRowIndexByItem(rows, overId);
    if (fromRowIndex === -1 || toRowIndex === -1) return;

    const fromRow = rows[fromRowIndex];
    const toRow = rows[toRowIndex];

    // Use dnd-kit sortable metadata for stable indices
    const overSortable = event.over?.data?.current?.sortable;
    const activeSortable = event.active?.data?.current?.sortable;

    // Fallback to your earlier lookup if metadata missing
    const overIndexInToRow =
      (overSortable?.index as number | undefined) ??
      getItemIndexInRow(toRow, overId);
    const currentIndexInFromRow =
      (activeSortable?.index as number | undefined) ??
      getItemIndexInRow(fromRow, activeId);

    if (overIndexInToRow === -1 || currentIndexInFromRow === -1) return;

    if (fromRowIndex === toRowIndex) {
      if (currentIndexInFromRow === overIndexInToRow) return;
      const newRow = arrayMove(toRow, currentIndexInFromRow, overIndexInToRow);
      const next = [...rows];
      next[toRowIndex] = newRow;
      safeSetRows(setRows, rows, next);
    } else {
      // insert after/at overIndex; you can adjust +1 if you prefer "after"
      const insertedTo = insertIntoRow(toRow, activeOption, overIndexInToRow);
      const prunedFrom = removeFromRow(fromRow, activeId);

      const next = [...rows];
      next[fromRowIndex] = prunedFrom;
      next[toRowIndex] = insertedTo;

      // remove empty rows
      const cleaned = next.filter((r) => r.length > 0);
      safeSetRows(setRows, rows, cleaned);
    }
  };

  // On drop, if the user releases in the “gutter” below all rows,
  // we’ll append a new row with the item. (We simulate this by checking
  // whether the active item ended up with no container; for brevity,
  // we’ll assume all drops happen over items/rows in this example.)
  const handleDragEnd = (_event: DragEndEvent) => {
    setActiveId(null);
  };

  // Utility to move an item to a brand new row (you can call this from a context menu)
  //   const moveToNewRow = (id: string) => {
  //     const rowIdx = findRowIndexByItem(rows, id);
  //     if (rowIdx === -1) return;
  //     const from = rows[rowIdx];
  //     const nextRows = [...rows];
  //     nextRows[rowIdx] = removeFromRow(from, id);
  //     const cleaned = nextRows.filter((r) => r.length > 0);
  //     setRows([...cleaned, [id]]);
  //   };

  const setOptionText = (text: string, option: Option) => {
    const rowIdx = findRowIndexByItem(rows, option.id!);
    console.log("here in setOptionText", { text, option, rowIdx });
    if (rowIdx === -1) return;
    const from = rows[rowIdx];
    const nextRows = [...rows];
    nextRows[rowIdx] = removeFromRow(from, option.id!);
    const cleaned = nextRows.filter((r) => r.length > 0);
    //maintain the same order and index
    rows[rowIdx][findItemIndexInRow(rows[rowIdx], option.id!)] = {
      ...option,
      text,
    };
    setRows([...rows]);
  };

  return (
    <div className="w-full">
      <DndContext
        sensors={editor.isEditable ? sensors : []}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Render each row as its own horizontal SortableContext */}
        {rows.map((row, idx) => (
          <React.Fragment key={`frag-${idx}`}>
            <RowBreak id={`row-break-${idx}`} />

            <SortableContext
              key={`row-${idx}`}
              items={row.map((o) => o.id)} // dnd-kit needs ids, not objects
              strategy={horizontalListSortingStrategy}
            >
              <RowContainer row={row}>
                {row.map((opt, index) => (
                  <SortableOption
                    key={opt.id}
                    option={opt}
                    setOptionText={setOptionText}
                    index={index}
                    editor={editor as any}
                    block={block as any}
                  />
                ))}
              </RowContainer>
            </SortableContext>
          </React.Fragment>
        ))}
        <RowBreak id={`row-break-${rows.length}`} />

        {editor?.isEditable && (
          <div className="mt-2">
            <button
              className="w-full p-2 opacity-50 transition-opacity duration-300 hover:opacity-100"
              onClick={() => {
                const newOption = {
                  text: "",
                  id: cuid(),
                  color: "",
                  image: "",
                  selected: false,
                };
                setRows([...rows, [newOption]]);
              }}
              style={{
                background: customizations?.inputsBackgroundColor,
                borderRadius: `${customizations?.inputsRadius}px`,
                borderWidth: `${customizations?.inputsBorderWidth}px`,
                borderColor: customizations?.inputsBorderColor,
                width: "max-content",
              }}
            >
              Add option
            </button>
          </div>
        )}

        {/* Drag preview */}
        <DragOverlay
          style={{
            zIndex: 999,
          }}
        >
          {activeId ? (
            <SortableOption
              option={
                rows?.[findRowIndexByItem(rows, activeId)]?.[
                  findItemIndexInRow(
                    rows?.[findRowIndexByItem(rows, activeId)]!,
                    activeId,
                  )
                ]!
              }
              setOptionText={setOptionText}
              index={0}
              editor={editor as any}
              block={block as any}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
