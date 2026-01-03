"use client";

import { useState, useMemo, useEffect, Ref } from "react";
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
import { formatGeneCountValue, convertToTitleCase, cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { L1000TabEnum } from "@/types/chart";
import {
  ALLOWED_HEADER_MOST_TABLE,
  TABLE_MOST_COLOR_VALUE,
} from "@/lib/contants";

interface DrugSigtureTableProps {
  refTable: Ref<HTMLDivElement>;
  headItems?: string[];
  data?: any[];
  isLoadingMostData: boolean;
  classColorBox: string;
  tableType: L1000TabEnum;
}

export const getBarColorClass = (
  row: any[],
  qValueIndex: number,
  classColorBox: string,
  TABLE_MOST_COLOR_VALUE: number
): string => {
  if (qValueIndex === -1 || row[qValueIndex] == null) {
    return classColorBox;
  }

  const qValue = Number(row[qValueIndex]);

  if (isNaN(qValue)) {
    return classColorBox;
  }

  return qValue >= TABLE_MOST_COLOR_VALUE
    ? "bg-token-background2"
    : classColorBox;
};

export const DrugSigtureTable: React.FC<DrugSigtureTableProps> = ({
  headItems = [],
  data = [],
  isLoadingMostData,
  refTable,
  classColorBox,
  tableType,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);

  const itemsPerPage = 10;
  const classTableCell = "!px-4 !py-2 !text-base !font-medium !leading-[18px]";
  const isEmpty = !data || data.length === 0;

  const { filteredHeaders, columnMapping } = useMemo(() => {
    const mapping: number[] = [];
    const filtered = ALLOWED_HEADER_MOST_TABLE.filter((allowedHeader) => {
      const originalIndex = headItems.findIndex(
        (item) => item.toLowerCase() === allowedHeader.toLowerCase()
      );
      if (originalIndex !== -1) {
        mapping.push(originalIndex);
        return true;
      }
      return false;
    });

    return {
      filteredHeaders: filtered,
      columnMapping: mapping,
    };
  }, [headItems]);

  const filteredData = useMemo(() => {
    if (isEmpty || columnMapping.length === 0) return [];

    return data.map((row) => columnMapping.map((colIndex) => row[colIndex]));
  }, [data, columnMapping, isEmpty]);

  const handlePageChange = (newPage: number) => setCurrentPage(newPage);

  const isSimilarityColumnMostOppositeTable = (
    index: number,
    similarityScoreIndex: number
  ) => {
    return (
      index === similarityScoreIndex && tableType === L1000TabEnum.MOST_OPPOSITE
    );
  };

  const similarityScoreIndex = useMemo(() => {
    return filteredHeaders.findIndex((item) =>
      item.toLowerCase().includes("similarity_score")
    );
  }, [filteredHeaders]);

  const qValueIndex = useMemo(() => {
    return filteredHeaders.findIndex((item) =>
      item.toLowerCase().includes("q_value")
    );
  }, [filteredHeaders]);

  const getMaxSimilarityScore = (
    data: any[],
    columnIndex: number,
    tableType: L1000TabEnum
  ): number => {
    const values = data
      .map((row) => Number(row[columnIndex]))
      .filter((num) => !isNaN(num));

    if (values.length === 0) return 0;

    const allNegative = values.every((num) => num < 0);

    if (tableType === L1000TabEnum.MOST_OPPOSITE || allNegative) {
      return Math.min(...values);
    }

    return Math.max(...values);
  };

  const maxSimilarityScore = useMemo(() => {
    if (isEmpty || similarityScoreIndex === -1) return 0;
    return getMaxSimilarityScore(filteredData, similarityScoreIndex, tableType);
  }, [filteredData, similarityScoreIndex, tableType, isEmpty]);

  const generateScaleValues = (
    maxScore: number,
    tableType: L1000TabEnum
  ): string[] => {
    if (maxScore === 0) return ["0.00"];
    const numSteps = 4;
    const absMax = Math.abs(maxScore);
    const values = [];

    const allNegative = filteredData
      .map((row) => Number(row[similarityScoreIndex]))
      .every((num) => num < 0 && !isNaN(num));

    for (let i = 0; i <= numSteps; i++) {
      let value;
      if (tableType === L1000TabEnum.MOST_OPPOSITE || allNegative) {
        value = (-absMax * i) / numSteps;
      } else {
        value = (absMax * i) / numSteps;
      }
      values.push(value.toFixed(2));
    }

    return values;
  };

  const scaleValues = generateScaleValues(maxSimilarityScore, tableType);

  const [sortedData, setSortedData] = useState<any[]>([]);
  const [activeSortColumn, setActiveSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<
    "ascending" | "descending"
  >("ascending");

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (filteredHeaders.length > 0) {
      if (similarityScoreIndex !== -1) {
        setActiveSortColumn(similarityScoreIndex);
        setSortDirection("descending");
      } else {
        setActiveSortColumn(0);
        setSortDirection("ascending");
      }
    }
  }, [similarityScoreIndex, filteredHeaders.length]);

  useEffect(() => {
    if (isEmpty || filteredData.length === 0) {
      setSortedData([]);
      return;
    }

    if (activeSortColumn === null) {
      setSortedData([...filteredData]);
      return;
    }

    const columnData = filteredData.map((row) => row[activeSortColumn]);
    const isNumericColumn = columnData.some((value) => {
      if (value !== null && value !== undefined && value !== "") {
        return !isNaN(Number(value));
      }
      return false;
    });

    const sorted = [...filteredData].sort((a, b) => {
      const valueA = a[activeSortColumn];
      const valueB = b[activeSortColumn];

      if (valueA === null || valueA === undefined || valueA === "") {
        return sortDirection === "ascending" ? 1 : -1;
      }
      if (valueB === null || valueB === undefined || valueB === "") {
        return sortDirection === "ascending" ? -1 : 1;
      }

      if (isNumericColumn) {
        const numA = Number(valueA);
        const numB = Number(valueB);
        return sortDirection === "ascending" ? numA - numB : numB - numA;
      } else {
        return sortDirection === "ascending"
          ? String(valueA).localeCompare(String(valueB))
          : String(valueB).localeCompare(String(valueA));
      }
    });

    setSortedData(sorted);
  }, [filteredData, activeSortColumn, sortDirection, isEmpty]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredData]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const currentPageData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const startItem =
    sortedData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, sortedData.length);
  const totalItems = sortedData.length;

  if (isLoadingMostData) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Spinner center className="flex flex-col" label="Loading data..." />
      </div>
    );
  }

  if (isEmpty || filteredHeaders.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg">
        <p className="text-gray-500">No data available.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end gap-4">
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "border-input size-6 rounded-md border",
              classColorBox
            )}
          ></div>
          <div className="text-xs">
            Statistically Significant (Q-Value &lt; {TABLE_MOST_COLOR_VALUE})
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="border-input bg-token-background2 size-6 rounded-md border"></div>
          <div className="text-xs">Not Statistically Significant</div>
        </div>
      </div>
      <div>
        <div>
          <Table classNameBox="h-[500px] scrollbar mt-2" className="table-auto">
            <TableHeader className="border-input bg-background sticky top-0 z-10 border-b">
              <TableRow>
                {filteredHeaders?.map((label, index) => (
                  <TableHead
                    key={index}
                    className={cn(
                      "cursor-pointer whitespace-nowrap px-4 py-2",
                      {
                        "w-[300px]": index === similarityScoreIndex,
                      }
                    )}
                    onClick={() => handleHeaderClick(index)}
                  >
                    <div className="flex items-center gap-1.5">
                      {convertToTitleCase(label)}{" "}
                      {isSimilarityColumnMostOppositeTable(
                        index,
                        similarityScoreIndex
                      ) && (
                        <span className="!text-sm !font-normal">
                          (longer bar - more dissimilar)
                        </span>
                      )}
                      {renderSortIndicators(index)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {currentPageData.map((row, rowIndex) => {
                const barColorClass = getBarColorClass(
                  row,
                  qValueIndex,
                  classColorBox,
                  TABLE_MOST_COLOR_VALUE
                );

                return (
                  <TableRow
                    className="border-chart-go even:bg-chart-go box-border h-10 border-b"
                    key={rowIndex}
                  >
                    {row.map((value: any, colIndex: number) => {
                      const numericValue = Number(value);
                      return (
                        <TableCell
                          className={cn(
                            classTableCell,
                            colIndex === similarityScoreIndex
                              ? "w-[500px]"
                              : "max-w-[150px]"
                          )}
                          key={colIndex}
                        >
                          {colIndex === similarityScoreIndex ? (
                            <div className="flex items-center justify-start gap-1">
                              <div className="w-full max-w-14 flex-shrink-0">
                                {formatGeneCountValue(value)}
                              </div>
                              <div className="bg-control-token relative h-4 w-[420px] overflow-hidden rounded-lg">
                                <div
                                  className={cn(
                                    "absolute left-0 top-0 h-full rounded-lg",
                                    "rounded-r-none",
                                    barColorClass
                                  )}
                                  style={{
                                    width: `${
                                      maxSimilarityScore !== 0
                                        ? (Math.abs(numericValue) /
                                            Math.abs(maxSimilarityScore)) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <div className="truncate">
                              {formatGeneCountValue(value)}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}

              <TableRow className="h-10 border-b">
                {filteredHeaders?.map((_, index) => (
                  <TableHead
                    key={`scale-${index}`}
                    className={cn(
                      "px-4 py-1 text-xs",
                      index === similarityScoreIndex ? "w-[300px]" : ""
                    )}
                  >
                    {index === similarityScoreIndex ? (
                      <div className="flex items-center justify-start gap-1">
                        <div className="w-full max-w-14 flex-shrink-0"></div>
                        <div className="text-hint-foreground flex w-[420px] items-center justify-between">
                          {scaleValues.map((value, idx) => (
                            <span key={idx} className="text-xs">
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="truncate"></div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Pagination
            currentPage={currentPage}
            handlePageChanges={handlePageChange}
            totalPages={totalPages || 1}
          />
          <div className="text-sm text-gray-500">
            {startItem} to {endItem} of {totalItems} items
          </div>
        </div>
      </div>
    </div>
  );
};
