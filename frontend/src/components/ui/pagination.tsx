"use client";
import { Button } from "./button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  handlePageChanges: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = (props) => {
  if (props.totalPages === 1) {
    return null;
  }

  const getPageNumbers = () => {
    const currentPage = props.currentPage;
    const totalPages = props.totalPages;

    // if totalPages <= 7, return all pages
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // fixed pattern: [1] [...] [current-1] [current] [current+1] [...] [totalPages]
    // always 7 elements (including dots)

    if (currentPage <= 4) {
      // at the beginning: [1] [2] [3] [4] [5] [...] [totalPages]
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      // at the end: [1] [...] [totalPages-4] [totalPages-3] [totalPages-2] [totalPages-1] [totalPages]
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    // in the middle: [1] [...] [currentPage-1] [currentPage] [currentPage+1] [...] [totalPages]
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  return (
    <div className="mt-1.5 flex w-max items-center justify-start">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          className="ml-r h-[38px] border-none px-2"
          icon="arrowLeftIcon"
          onClick={() => props.handlePageChanges(props.currentPage - 1)}
          disabled={props.currentPage === 1}
        >
          Previous
        </Button>
        <div className="flex items-center space-x-2">
          {getPageNumbers().map((pageNum, idx) => {
            if (pageNum === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                  {pageNum}
                </span>
              );
            }

            return (
              <Button
                key={`page-${pageNum}`}
                variant={props.currentPage === pageNum ? "outline" : "link"}
                className="text-control-content hover:bg-control-hover size-[38px] min-w-[0px] !no-underline"
                size="sm"
                onClick={() => props.handlePageChanges(pageNum as number)}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          className="ml-2 h-[38px] min-w-[0px] border-none px-2"
          icon="arrowRightIcon"
          iconPosition="right"
          onClick={() => props.handlePageChanges(props.currentPage + 1)}
          disabled={props.currentPage === props.totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
