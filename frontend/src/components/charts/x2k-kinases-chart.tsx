import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import * as d3 from "d3";
import { X2KChartTypeEnum } from "@/types/chart";
import { transformKinasesData } from "@/lib/utils";
import {
  X2K_SIGNIFICANCE_THRESHOLD,
  X2K_KINASES_BAR_COLORS,
  X2K_LEGEND_BOX_SIZE,
  X2K_BARGRAPH_ITEMS_PER_PAGE,
  X2K_BAR_HEIGHT,
} from "@/lib/contants";
import { X2KTable } from "./x2k-table";
import { Spinner } from "@/components/ui/spinner";
import { Pagination } from "@/components/ui/pagination";
import {
  getChartDimensions,
  hasSignificantDimensionChange,
  createDebouncedResizeHandler,
} from "./chart-utils";

const formatTickValue = (domainValue: d3.NumberValue): string => {
  const value = domainValue.valueOf();

  if (value === 0) return "0";

  // Use exponential for very small values
  if (value < 0.01) {
    return value.toExponential(1);
  }

  // Use 2 decimal places for better precision in normal range
  if (value < 100) {
    return value.toFixed(2);
  }

  return value.toExponential(1);
};

// Tooltip component for kinases bar chart
interface TooltipKinasesChartProps {
  isVisible: boolean;
  position: { x: number; y: number };
  kinase: string;
  pValue: number;
  enrichedTargets: string;
}

const TooltipKinasesChart: React.FC<TooltipKinasesChartProps> = ({
  isVisible,
  position,
  kinase,
  pValue,
  enrichedTargets,
}) => {
  if (!isVisible) return null;

  // Calculate position with viewport boundary handling
  const tooltipStyle = {
    left: Math.min(position.x, window.innerWidth - 280), // 280px max width
    top: position.y + 10,
    transform:
      position.x > window.innerWidth - 280 ? "translateX(-100%)" : "none",
  };

  return (
    <div
      className="tooltip-kinases-chart border-border dynamic-bg-light fixed z-50 max-w-[280px] rounded-md border p-3 shadow-lg"
      style={{
        ...tooltipStyle,
        pointerEvents: "none", // Prevent tooltip from interfering with mouse events
      }}
    >
      <div className="">
        <div className="text-muted-foreground text-sm">
          <span className="">Kinase: </span>
          <span className="">{kinase}</span>
        </div>
        <div className="text-muted-foreground text-sm">
          <span className="">P value: </span>
          <span className="">{pValue.toExponential(2)}</span>
        </div>
        <div className="text-muted-foreground text-sm">
          <span className="">Enriched substrates: </span>
          <span className="">{enrichedTargets}</span>
        </div>
      </div>
    </div>
  );
};

interface X2KKinasesChartProps {
  data: any;
  chartType: X2KChartTypeEnum;
  refChart: React.RefObject<HTMLDivElement>;
  isLoading?: boolean;
  isZoomed?: boolean;
}

export const X2KKinasesChart: React.FC<X2KKinasesChartProps> = ({
  data,
  chartType,
  refChart,
  isLoading = false,
  isZoomed = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
    kinase: string;
    pValue: number;
    enrichedTargets: string;
  }>({
    isVisible: false,
    position: { x: 0, y: 0 },
    kinase: "",
    pValue: 0,
    enrichedTargets: "",
  });
  // Calculate height based on number of bars (20px each + padding) for normal mode
  // In zoom mode, unified responsive height will be used via getChartDimensions
  const baseChartHeight =
    X2K_BARGRAPH_ITEMS_PER_PAGE * (X2K_BAR_HEIGHT + 10) + 100; // +100 for margins and axis
  const chartHeight = baseChartHeight; // Remove zoom multiplier, let getChartDimensions handle zoom mode
  const [dimensions, setDimensions] = useState({
    width: isZoomed ? 1200 : 800, // Increase width when zoomed
    height: chartHeight,
  });

  // Transform data based on chart type
  const { bargraphData, tableData } = transformKinasesData(data);

  // For testing pagination - generate dummy data if no real data exists
  const testBargraphData = useMemo(() => {
    if (bargraphData.length > 0) return bargraphData;

    // Generate dummy data for testing pagination
    return Array.from({ length: 15 }, (_, index) => ({
      kinase: `Kinase_${index + 1}`,
      proteinKinase: `Protein_Kinase_${index + 1}`,
      pValue: Math.random() * 0.1,
      minusLog10PValue: Math.random() * 8 + 1,
      targetCount: Math.floor(Math.random() * 40) + 1,
      enrichedTargets: `Target genes for Kinase_${index + 1}`,
    }));
  }, [bargraphData]);

  // Pagination logic for bargraph
  const { currentPageData, totalPages } = useMemo(() => {
    const startIndex = (currentPage - 1) * X2K_BARGRAPH_ITEMS_PER_PAGE;
    const endIndex = startIndex + X2K_BARGRAPH_ITEMS_PER_PAGE;
    const pageData = testBargraphData.slice(startIndex, endIndex);
    const pages = Math.ceil(
      testBargraphData.length / X2K_BARGRAPH_ITEMS_PER_PAGE
    );

    return {
      currentPageData: pageData,
      totalPages: pages,
    };
  }, [testBargraphData, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleResize = useCallback(() => {
    const newDimensions = getChartDimensions(
      isZoomed,
      refChart,
      chartHeight,
      "bargraph"
    );

    setDimensions((prev) => {
      if (hasSignificantDimensionChange(prev, newDimensions)) {
        return newDimensions;
      }
      return prev;
    });
  }, [refChart, chartHeight, isZoomed, isLoading]);

  useEffect(() => {
    const cleanup = createDebouncedResizeHandler(handleResize);
    return cleanup;
  }, [handleResize]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        window.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Create horizontal bar chart with D3
  useEffect(() => {
    if (
      !svgRef.current ||
      chartType !== X2KChartTypeEnum.BARGRAPH ||
      !currentPageData.length
    ) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Setup SVG with responsive attributes
    svg
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .attr("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .on("mouseleave", function () {
        // Hide tooltip when mouse leaves the entire chart area
        setTooltip({
          isVisible: false,
          position: { x: 0, y: 0 },
          kinase: "",
          pValue: 0,
          enrichedTargets: "",
        });
      });

    // Chart margins and dimensions
    const margin = { top: 20, right: 80, bottom: 50, left: 120 };
    const width = dimensions.width - margin.left - margin.right;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const maxValue =
      d3.max(currentPageData, (d) => d.minusLog10PValue || 0) || 1;
    const xScale = d3.scaleLinear().domain([0, maxValue]).range([0, width]);

    // Use fixed bar height instead of scaleBand
    const barSpacing = 16; // 10px spacing between bars
    const totalBarHeight = X2K_BAR_HEIGHT + barSpacing;

    // Add alternating background stripes (white 10% opacity)
    g.selectAll(".bg-stripe")
      .data(currentPageData)
      .enter()
      .append("rect")
      .attr("class", "bg-stripe")
      .attr("x", -margin.left)
      .attr("y", (d, i) => i * totalBarHeight)
      .attr("width", width + margin.left + margin.right)
      .attr("height", totalBarHeight)
      .attr("fill", (d, i) =>
        i % 2 === 0 ? "hsl(var(--muted-table))" : "transparent"
      )
      .on("mouseover", function () {
        // Hide tooltip when hovering over background stripe (not on actual bars)
        if (tooltipTimeoutRef.current) {
          window.clearTimeout(tooltipTimeoutRef.current);
        }
        setTooltip({
          isVisible: false,
          position: { x: 0, y: 0 },
          kinase: "",
          pValue: 0,
          enrichedTargets: "",
        });
      });

    // Create horizontal bars
    g.selectAll(".bar")
      .data(currentPageData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", (d, i) => i * totalBarHeight + barSpacing / 2)
      .attr("width", (d) => xScale(d.minusLog10PValue || 0))
      .attr("height", X2K_BAR_HEIGHT)
      .attr("rx", 6) // Rounded corners to match design
      .attr("ry", 6)
      .attr("fill", (d) => {
        const pValue = d.pValue || 0;
        return pValue < X2K_SIGNIFICANCE_THRESHOLD
          ? X2K_KINASES_BAR_COLORS.SIGNIFICANT
          : X2K_KINASES_BAR_COLORS.NOT_SIGNIFICANT;
      })
      .attr("stroke", "none")
      .style("cursor", "pointer")
      .on("mouseover", function (event: any, d: any) {
        // Clear any existing timeout
        if (tooltipTimeoutRef.current) {
          window.clearTimeout(tooltipTimeoutRef.current);
          tooltipTimeoutRef.current = null;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const position = {
          x: rect.left + rect.width + 5,
          y: rect.top - 10,
        };

        setTooltip({
          isVisible: true,
          position,
          kinase: d.kinase || d.proteinKinase || "Unknown",
          pValue: d.pValue || 0,
          enrichedTargets: d.targets || "",
        });
      })
      .on("mouseleave", function () {
        // Delay hiding tooltip to prevent flickering when moving between bars
        tooltipTimeoutRef.current = window.setTimeout(() => {
          setTooltip({
            isVisible: false,
            position: { x: 0, y: 0 },
            kinase: "",
            pValue: 0,
            enrichedTargets: "",
          });
        }, 100); // 100ms delay
      })
      .on("mousemove", function (event: any) {
        const rect = event.currentTarget.getBoundingClientRect();
        const position = {
          x: rect.left + rect.width + 5,
          y: rect.top - 10,
        };

        setTooltip((prev) => ({
          ...prev,
          position,
        }));
      });

    // Add P-value labels with dynamic positioning (inside/outside based on bar width)
    const minBarWidthForInsideLabel = 60; // Minimum bar width to fit label inside

    g.selectAll(".bar-label")
      .data(currentPageData)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", (d) => {
        const barWidth = xScale(d.minusLog10PValue || 0);
        // If bar is wide enough, position inside; otherwise position outside
        return barWidth >= minBarWidthForInsideLabel
          ? barWidth - 8 // Inside bar, 8px from right edge
          : barWidth + 8; // Outside bar, 8px from right edge
      })
      .attr(
        "y",
        (d, i) => i * totalBarHeight + barSpacing / 2 + X2K_BAR_HEIGHT / 2
      )
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", (d) => {
        const barWidth = xScale(d.minusLog10PValue || 0);
        // White text for inside labels, dark text for outside labels
        return barWidth >= minBarWidthForInsideLabel ? "white" : "currentColor";
      })
      .style("text-anchor", (d) => {
        const barWidth = xScale(d.minusLog10PValue || 0);
        // Right-aligned for inside labels, left-aligned for outside labels
        return barWidth >= minBarWidthForInsideLabel ? "end" : "start";
      })
      .text((d) => (d.minusLog10PValue || 0).toExponential(1))
      .on("mouseover", function (event: any, d: any) {
        // Show tooltip when hovering over p-value labels (part of bar visualization)
        if (tooltipTimeoutRef.current) {
          window.clearTimeout(tooltipTimeoutRef.current);
          tooltipTimeoutRef.current = null;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const position = {
          x: rect.left + rect.width + 12,
          y: rect.top - 13,
        };

        setTooltip({
          isVisible: true,
          position,
          kinase: d.kinase || d.proteinKinase || "Unknown",
          pValue: d.pValue || 0,
          enrichedTargets: d.targets || "",
        });
      })
      .on("mouseleave", function () {
        // Delay hiding tooltip to prevent flickering
        tooltipTimeoutRef.current = window.setTimeout(() => {
          setTooltip({
            isVisible: false,
            position: { x: 0, y: 0 },
            kinase: "",
            pValue: 0,
            enrichedTargets: "",
          });
        }, 100); // 100ms delay
      });

    // Add kinase labels on the left
    g.selectAll(".kinase-label")
      .data(currentPageData)
      .enter()
      .append("text")
      .attr("class", "kinase-label")
      .attr("x", -10)
      .attr(
        "y",
        (d, i) => i * totalBarHeight + barSpacing / 2 + X2K_BAR_HEIGHT / 2
      )
      .attr("dy", "0.35em")
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("fill", "currentColor")
      .style("text-anchor", "end")
      .text((d) => d.kinase || d.proteinKinase || "Unknown")
      .on("mouseover", function () {
        // Hide tooltip when hovering over kinase labels
        if (tooltipTimeoutRef.current) {
          window.clearTimeout(tooltipTimeoutRef.current);
        }
        setTooltip({
          isVisible: false,
          position: { x: 0, y: 0 },
          kinase: "",
          pValue: 0,
          enrichedTargets: "",
        });
      });

    // Calculate actual height based on data
    const actualHeight = currentPageData.length * totalBarHeight;

    // Add X-axis
    const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(formatTickValue);
    const xAxisGroup = g
      .append("g")
      .attr("transform", `translate(0,${actualHeight})`)
      .call(xAxis);

    // Style axis - hide domain line, keep only tick text
    xAxisGroup.select(".domain").style("display", "none"); // Hide domain line
    xAxisGroup.selectAll(".tick line").style("display", "none"); // Hide tick lines
    xAxisGroup
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "currentColor");
  }, [currentPageData, chartType, dimensions]);

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Spinner
          center
          className="flex flex-col"
          label="Loading kinases data..."
        />
      </div>
    );
  }

  if (!data || (!bargraphData.length && !tableData.length)) {
    return (
      <div className="flex h-[384px] items-center justify-center">
        <p className="text-gray-500">No kinases data available to display.</p>
      </div>
    );
  }

  return (
    <div ref={refChart} className="bg-background w-full">
      {chartType === X2KChartTypeEnum.BARGRAPH ? (
        <div className="">
          {/* Legend */}
          <div className="flex justify-end gap-6">
            <div className="flex items-center">
              <svg width="240" height="20">
                <rect
                  x="0"
                  y="2"
                  width={X2K_LEGEND_BOX_SIZE}
                  height={X2K_LEGEND_BOX_SIZE}
                  rx="2"
                  fill={X2K_KINASES_BAR_COLORS.SIGNIFICANT}
                />
                <text
                  x={X2K_LEGEND_BOX_SIZE + 8}
                  y="10"
                  dominantBaseline="central"
                  textAnchor="start"
                  fontSize="12"
                  fontFamily="Raleway, sans-serif"
                  fill="currentColor"
                >
                  Statistically Significant (P value &lt;{" "}
                  {X2K_SIGNIFICANCE_THRESHOLD})
                </text>
              </svg>
            </div>
            <div className="flex items-center">
              <svg width="180" height="20">
                <rect
                  x="0"
                  y="2"
                  width={X2K_LEGEND_BOX_SIZE}
                  height={X2K_LEGEND_BOX_SIZE}
                  rx="2"
                  fill={X2K_KINASES_BAR_COLORS.NOT_SIGNIFICANT}
                />
                <text
                  x={X2K_LEGEND_BOX_SIZE + 8}
                  y="10"
                  dominantBaseline="central"
                  textAnchor="start"
                  fontSize="12"
                  fontFamily="Raleway, sans-serif"
                  fill="currentColor"
                >
                  Not Statistically Significant
                </text>
              </svg>
            </div>
          </div>

          {/* D3 Bar Chart */}
          <div className="mb-4">
            <svg
              ref={svgRef}
              width={dimensions.width}
              height={dimensions.height}
              className="w-full"
              style={{ background: "transparent" }}
            />
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                handlePageChanges={handlePageChange}
              />
              <div className="">-log₁₀(P value)</div>
            </div>
          )}
        </div>
      ) : (
        <X2KTable
          refTable={refChart}
          data={data}
          isLoading={isLoading}
          tableType="kinases"
        />
      )}

      {/* Tooltip */}
      <TooltipKinasesChart
        isVisible={tooltip.isVisible}
        position={tooltip.position}
        kinase={tooltip.kinase}
        pValue={tooltip.pValue}
        enrichedTargets={tooltip.enrichedTargets}
      />
    </div>
  );
};
