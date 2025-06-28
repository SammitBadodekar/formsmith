"use client";
import React, { useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useGetSubmissionsQuery } from "@/hooks/use-queries";
import { Submission } from "@/app/[...domain]/show-published-form";
import { FormSubmission } from "@formsmith/database";
import { format, isThisYear } from "date-fns";

type NormalizedRow = Record<string, string>;

const ShowSubmissions = ({ formId }: { formId: string }) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const { data, isLoading, isError } = useGetSubmissionsQuery({ formId });

  function formatCustomDate(date: Date) {
    const baseFormat = isThisYear(date)
      ? "MMM d, hh:mm a"
      : "MMM d, yyyy, hh:mm a";
    return format(date, baseFormat);
  }

  // Extract and normalize data
  const formattedData: Submission[][] =
    data?.map((submission: FormSubmission) => [
      { label: "Submitted at", value: formatCustomDate(submission.createdAt!) },
      ...(submission.data as Submission[]),
    ]) ?? [];

  const allLabels = Array.from(
    new Set(formattedData.flatMap((row) => row.map((item) => item.label))),
  );

  const normalizedRows: NormalizedRow[] = formattedData.map((row) => {
    const rowObj: NormalizedRow = {};
    allLabels.forEach((label) => {
      const item = row.find((i) => i.label === label);
      rowObj[label] = item?.value || "";
    });
    return rowObj;
  });

  // Dynamic column definitions
  const columns: ColumnDef<NormalizedRow>[] = allLabels.map((label) => ({
    accessorKey: label,
    header: label,
    cell: ({ row }) => (
      <div className="w-max min-w-20 truncate text-nowrap">
        {row.getValue(label) ?? "-"}
      </div>
    ),
  }));

  const table = useReactTable({
    data: normalizedRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      table.setGlobalFilter(searchTerm);
    }, 300); // debounce delay
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading submissions.</div>;

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Search..."
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  className="capitalize"
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table className="mb-2">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="w-full text-nowrap">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={allLabels.length} className="text-center">
                  No data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default ShowSubmissions;
