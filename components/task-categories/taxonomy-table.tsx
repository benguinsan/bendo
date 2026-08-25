import { FolderIcon, SquarePenIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TaxonomyRow = {
  id: string;
  label: string;
};

type TaxonomyTableProps = {
  labelledBy: string;
  nameColumn: string;
  rows: readonly TaxonomyRow[];
  emptyTitle: string;
  emptyDescription: string;
  onEdit: (row: TaxonomyRow) => void;
};

export function TaxonomyTable({
  labelledBy,
  nameColumn,
  rows,
  emptyTitle,
  emptyDescription,
  onEdit,
}: TaxonomyTableProps) {
  if (rows.length === 0) {
    return (
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderIcon />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table aria-labelledby={labelledBy}>
        <TableHeader className="bg-muted">
          <TableRow className="hover:bg-muted">
            <TableHead className="w-16 text-center">SN</TableHead>
            <TableHead className="text-center">{nameColumn}</TableHead>
            <TableHead className="text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell className="text-center">{index + 1}</TableCell>
              <TableCell className="text-center">{row.label}</TableCell>
              <TableCell className="text-center whitespace-normal">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    aria-label={`Edit ${row.label}`}
                    onClick={() => onEdit(row)}
                  >
                    <SquarePenIcon data-icon="inline-start" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    aria-label={`Delete ${row.label}`}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
