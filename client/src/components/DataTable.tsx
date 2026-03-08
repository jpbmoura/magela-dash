import { Card } from "@/components/ui/card";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number);
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  title,
  onRowClick,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (header: string) => {
    if (sortColumn === header) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(header);
      setSortDirection("asc");
    }
  };

  const getCellValue = (row: T, column: Column<T>): any => {
    if (typeof column.accessor === "function") {
      return column.accessor(row);
    }
    return (row as any)[column.accessor];
  };

  return (
    <Card className="overflow-hidden">
      {title && <div className="px-6 py-4 border-b border-border"><h3 className="font-semibold">{title}</h3></div>}
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.header)}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    column.sortable ? "select-none" : ""
                  )}
                  onClick={() => column.sortable && handleSort(column.header)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortColumn === column.header && (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {columns.map((column) => (
                  <td key={String(column.header)}>
                    {getCellValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
