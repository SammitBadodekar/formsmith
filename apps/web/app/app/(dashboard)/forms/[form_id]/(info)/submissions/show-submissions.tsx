"use client";
import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetSubmissionsQuery } from "@/hooks/use-queries";
import { Submission } from "@/app/[...domain]/show-published-form";
import { FormSubmission } from "@formsmith/database";
import { format, isThisYear } from "date-fns";
import Loader from "@/components/ui/loader";

type NormalizedRow = Record<string, string>;

const ITEMS_PER_PAGE = 10;

const ShowSubmissions = ({ formId }: { formId: string }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  const { data, isLoading, isError } = useGetSubmissionsQuery({ formId });

  function formatCustomDate(date: Date) {
    const baseFormat = isThisYear(date)
      ? "MMM d, hh:mm a"
      : "MMM d, yyyy, hh:mm a";
    return format(date, baseFormat);
  }

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

  // Filtering
  const filteredRows = useMemo(() => {
    if (!searchTerm) return normalizedRows;
    return normalizedRows.filter((row) =>
      Object.values(row).some((val) =>
        val.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [searchTerm, normalizedRows]);

  // Pagination
  const paginatedRows = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return filteredRows.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, filteredRows]);

  const totalPages = Math.ceil(filteredRows.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(0);
    }
  }, [totalPages, currentPage]);

  if (isLoading) return <Loader />;
  if (isError) return <div>Error loading submissions.</div>;

  return (
    <div className="w-full space-y-4">
      {/* Search */}
      <Input
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {allLabels.map((label) => (
                <TableHead key={label} className="text-nowrap">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {allLabels.map((label) => (
                    <TableCell key={label} className="whitespace-nowrap">
                      {row[label] || "-"}
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

      {/* Pagination */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
          disabled={currentPage === 0}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setCurrentPage((prev) => (prev + 1 < totalPages ? prev + 1 : prev))
          }
          disabled={currentPage + 1 >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default ShowSubmissions;
