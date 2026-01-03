"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Icon } from "@/components/icon";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatGeneCountValue } from "@/lib/utils";

// Utility functions for text mapping based on table type
const getColumnHeaderText = (tableType?: X2KTableType): string => {
  switch (tableType) {
    case "kinases":
      return "Enriched Substrates";
    case "transcription_factors":
    default:
      return "Enriched Targets";
  }
};

const getItemTypeText = (tableType?: X2KTableType): string => {
  switch (tableType) {
    case "kinases":
      return "substrates";
    case "transcription_factors":
    default:
      return "targets";
  }
};

const getRegulatorTypeText = (tableType?: X2KTableType): string => {
  switch (tableType) {
    case "kinases":
      return "Kinase";
    case "transcription_factors":
    default:
      return "Transcription Factor";
  }
};

interface TooltipGenesProps {
  isVisible: boolean;
  content: string;
  position: { x: number; y: number };
  transcriptionFactor: string;
  geneCount: number;
  tableType?: X2KTableType;
  onClose: () => void;
}

const TooltipGenes: React.FC<TooltipGenesProps> = ({
  isVisible,
  content,
  position,
  transcriptionFactor,
  geneCount,
  tableType = "transcription_factors",
  onClose,
}) => {
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".tooltip-genes")) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("click", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  // Format genes list for display
  const genesList = content
    .split(",")
    .map((gene) => gene.trim())
    .filter((gene) => gene.length > 0);

  // Calculate position with viewport boundary handling
  const tooltipStyle = {
    left: Math.min(position.x, window.innerWidth - 320), // 320px max width
    top: position.y + 10,
    transform:
      position.x > window.innerWidth - 320 ? "translateX(-100%)" : "none",
  };

  return (
    <div
      className="tooltip-genes border-border dynamic-bg-light fixed z-50 max-w-[320px] rounded-md border p-3 shadow-lg"
      style={tooltipStyle}
    >
      <div className="text-muted-foreground mb-1 text-sm font-semibold">
        {transcriptionFactor}{" "}
        {getItemTypeText(tableType).charAt(0).toUpperCase() +
          getItemTypeText(tableType).slice(1)}{" "}
        {geneCount} Genes:
      </div>
      <div className="text-muted-foreground scrollbar max-h-[215px] overflow-y-auto text-xs">
        {genesList.length > 0 ? (
          <span>{genesList.join(", ")}</span>
        ) : (
          <span>No genes available</span>
        )}
      </div>
    </div>
  );
};

interface X2KTableData {
  transcriptionFactor: string; // Generic regulator name (transcription factor or kinase)
  pValue: number;
  enrichedTargets: number; // Generic count (targets or substrates)
  targetsString: string; // Generic genes string (targets or substrates)
  [key: string]: any; // For additional fields
}

// Valid table types for X2K analysis
type X2KTableType =
  | "transcription_factors"
  | "kinases"
  | "protein_network"
  | "x2k_network";

interface X2KTableProps {
  refTable: React.RefObject<HTMLDivElement>;
  data?: any; // Raw X2K data from API
  isLoading?: boolean;
  tableType?: X2KTableType; // For different X2K table types
}

/**
 * Transform X2K API data into generic table format
 * Supports both transcription factors (targets) and kinases (substrates)
 */
export const transformX2KData = (rawData: any): X2KTableData[] => {
  if (!rawData) return [];

  try {
    // Parse JSON string if needed
    const parsedData =
      typeof rawData === "string" ? JSON.parse(rawData) : rawData;

    // Handle X2K API format: {headers: [...], data: [...]}
    if (
      parsedData.headers &&
      Array.isArray(parsedData.headers) &&
      parsedData.data &&
      Array.isArray(parsedData.data)
    ) {
      const headers = parsedData.headers;

      // Find column indexes for transcription factor, p value, and targets
      const tfIndex = headers.findIndex(
        (h: string) =>
          h.toLowerCase() === "regulator" ||
          h.toLowerCase().includes("transcription") ||
          h.toLowerCase().includes("factor")
      );

      const pValueIndex = headers.findIndex(
        (h: string) =>
          h.toLowerCase() === "pvalue" ||
          (h.toLowerCase().includes("p") && h.toLowerCase().includes("value"))
      );

      const targetsIndex = headers.findIndex(
        (h: string) =>
          h.toLowerCase() === "targets" ||
          h.toLowerCase().includes("target") ||
          h.toLowerCase().includes("enriched")
      );

      return parsedData.data.map((row: any[]) => {
        // For targets column, count comma-separated items
        const targetsValue = row[targetsIndex] || "";
        const targetCount =
          typeof targetsValue === "string" && targetsValue.trim()
            ? targetsValue.split(",").length
            : 0;

        return {
          transcriptionFactor: row[tfIndex] || "N/A",
          pValue: parseFloat(row[pValueIndex]) || 0,
          enrichedTargets: targetCount,
          targetsString: targetsValue,
        };
      });
    }

    // Fallback: Handle direct array format
    if (Array.isArray(parsedData)) {
      return parsedData.map((item: any) => ({
        transcriptionFactor: item.transcriptionFactor || item.name || "N/A",
        pValue: parseFloat(item.pValue || item.p_value) || 0,
        enrichedTargets: parseInt(item.enrichedTargets || item.targets) || 0,
        targetsString: item.targetsString || item.targets || "",
      }));
    }

    return [];
  } catch (error) {
    console.error("Error transforming X2K data:", error);
    return [];
  }
};

export const X2KTable: React.FC<X2KTableProps> = ({
  refTable,
  data,
  isLoading = false,
  tableType = "transcription_factors",
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeSortColumn, setActiveSortColumn] = useState<number | null>(1); // Default to pValue column (index 1)
  const [sortDirection, setSortDirection] = useState<
    "ascending" | "descending"
  >("ascending");
  const [tooltip, setTooltip] = useState<{
    isVisible: boolean;
    content: string;
    position: { x: number; y: number };
    transcriptionFactor: string;
    geneCount: number;
    tableType: X2KTableType;
  }>({
    isVisible: false,
    content: "",
    position: { x: 0, y: 0 },
    transcriptionFactor: "",
    geneCount: 0,
    tableType: "transcription_factors",
  });

  const itemsPerPage = 10;
  const classTableCell = "!px-4 !py-2 !text-base !font-medium !leading-[18px]";

  // Transform raw data into table format
  const tableData = useMemo(() => transformX2KData(data), [data]);
  const isEmpty = tableData.length === 0;

  // Handle sorting
  const sortedData = useMemo(() => {
    if (activeSortColumn === null || isEmpty) return tableData;

    return [...tableData].sort((a, b) => {
      let aValue, bValue;

      // Map column index to data field
      switch (activeSortColumn) {
        case 0:
          aValue = a.transcriptionFactor;
          bValue = b.transcriptionFactor;
          break;
        case 1:
          aValue = a.pValue;
          bValue = b.pValue;
          break;
        case 2:
          aValue = a.enrichedTargets;
          bValue = b.enrichedTargets;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "ascending"
          ? aValue - bValue
          : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (sortDirection === "ascending") {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [tableData, activeSortColumn, sortDirection, isEmpty]);

  // Handle pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const currentPageData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startItem =
    sortedData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, sortedData.length);
  const totalItems = sortedData.length;

  const handlePageChange = (newPage: number) => setCurrentPage(newPage);

  const handleHeaderClick = (columnIndex: number) => {
    if (activeSortColumn === columnIndex) {
      setSortDirection((prev) =>
        prev === "ascending" ? "descending" : "ascending"
      );
    } else {
      setActiveSortColumn(columnIndex);
      setSortDirection("ascending");
    }
  };

  const renderSortIndicators = (columnIndex: number) => {
    const isActive = activeSortColumn === columnIndex;
    const isAscending = isActive && sortDirection === "ascending";

    return (
      <div
        className={`flex size-6 cursor-pointer items-center transition-transform ${
          isActive ? "text-foreground" : "text-gray-400 opacity-0"
        }`}
      >
        <Icon
          name="arrowDownIcon"
          className={`${isAscending ? "rotate-180" : ""}`}
        />
      </div>
    );
  };

  // Handle click on enriched items (targets/substrates) button
  const handleEnrichedItemsClick = (
    count: number,
    regulatorName: string,
    itemsString: string,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    // Handle edge case: no items data
    if (!itemsString || itemsString.trim() === "") {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom,
    };

    setTooltip({
      isVisible: true,
      content: itemsString,
      position,
      transcriptionFactor: regulatorName,
      geneCount: count,
      tableType: tableType || "transcription_factors",
    });
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCurrentPage(1);
  }, [tableData]);

  // Initialize default sort
  useEffect(() => {
    if (!isEmpty && activeSortColumn === null) {
      setActiveSortColumn(1); // Default to P value column
      setSortDirection("ascending");
    }
  }, [isEmpty, activeSortColumn]);

  if (isLoading) {
    return (
      <div ref={refTable} className="border-input rounded-md border">
        <div className="flex h-[400px] items-center justify-center">
          <Spinner
            center
            className="flex flex-col"
            label="Loading table data..."
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={refTable} className="">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="border-input bg-background sticky top-0 z-10 border-b">
            <TableRow>
              <TableHead
                className={cn("cursor-pointer whitespace-nowrap px-4 py-2")}
                onClick={() => handleHeaderClick(0)}
              >
                <div className="flex items-center gap-1.5">
                  {getRegulatorTypeText(tableType)}
                  {renderSortIndicators(0)}
                </div>
              </TableHead>
              <TableHead
                className={cn("cursor-pointer whitespace-nowrap px-4 py-2")}
                onClick={() => handleHeaderClick(1)}
              >
                <div className="flex items-center gap-1.5">
                  P value
                  {renderSortIndicators(1)}
                </div>
              </TableHead>
              <TableHead className={cn("whitespace-nowrap px-4 py-2")}>
                {getColumnHeaderText(tableType)}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEmpty ? (
              <TableRow>
                <TableCell colSpan={3} className="h-[200px] text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-muted-foreground">
                      No table data available
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              currentPageData.map((row, index) => (
                <TableRow
                  key={`${row.transcriptionFactor}-${index}`}
                  className={cn(
                    "border-border border-b",
                    index % 2 === 0 ? "bg-background" : "bg-muted-table"
                  )}
                >
                  <TableCell className={cn(classTableCell, "font-mono")}>
                    {row.transcriptionFactor}
                  </TableCell>
                  <TableCell className={cn(classTableCell, "font-mono")}>
                    {formatGeneCountValue(row.pValue)}
                  </TableCell>
                  <TableCell className={classTableCell}>
                    <button
                      onClick={(event) =>
                        handleEnrichedItemsClick(
                          row.enrichedTargets,
                          row.transcriptionFactor,
                          row.targetsString,
                          event
                        )
                      }
                      className={cn(
                        "text-primary hover:text-primary/80 underline transition-colors",
                        (!row.targetsString ||
                          row.targetsString.trim() === "") &&
                          "cursor-not-allowed opacity-50"
                      )}
                      disabled={
                        !row.targetsString || row.targetsString.trim() === ""
                      }
                    >
                      {row.enrichedTargets} {getItemTypeText(tableType)}
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isEmpty && (
        <div className="border-input flex items-center justify-between border-t pt-11">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChanges={handlePageChange}
          />
          <div className="text-muted-foreground text-sm">
            {startItem} to {endItem} of {totalItems} items
          </div>
        </div>
      )}

      <TooltipGenes
        isVisible={tooltip.isVisible}
        content={tooltip.content}
        position={tooltip.position}
        transcriptionFactor={tooltip.transcriptionFactor}
        geneCount={tooltip.geneCount}
        tableType={tooltip.tableType}
        onClose={() =>
          setTooltip({
            isVisible: false,
            content: "",
            position: { x: 0, y: 0 },
            transcriptionFactor: "",
            geneCount: 0,
            tableType: "transcription_factors",
          })
        }
      />
    </div>
  );
};
