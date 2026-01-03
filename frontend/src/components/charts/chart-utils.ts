/**
 * Shared utility functions for X2K chart resize handling
 */

export interface ChartDimensions {
  width: number;
  height: number;
}

/**
 * Chart type for height calculation
 */
export type ChartType = "bargraph" | "network";

/**
 * Calculate chart dimensions based on zoom state and container
 * @param isZoomed Whether the chart is in zoom dialog
 * @param refChart Reference to chart container
 * @param chartHeight Base chart height (used only in normal mode)
 * @param chartType Type of chart for proper height calculation in zoom mode
 * @returns Chart dimensions
 */
export function getChartDimensions(
  isZoomed: boolean,
  refChart: React.RefObject<HTMLDivElement>,
  chartHeight: number,
  chartType: ChartType = "network"
): ChartDimensions {
  if (!refChart.current) {
    // Fallback dimensions when container not available
    return {
      width: isZoomed ? 1000 : 600,
      height: isZoomed ? getContainerBasedHeight(400, chartType) : chartHeight,
    };
  }

  const rect = refChart.current.getBoundingClientRect();
  let width, height;

  if (isZoomed) {
    // In zoom dialog, use actual container dimensions for responsive sizing
    width = Math.max(800, window.innerWidth * 0.9);
    height = getContainerBasedHeight(rect.height, chartType);
  } else {
    // Normal mode, use container dimensions and provided chartHeight
    width = rect.width || 600;
    height = chartHeight;
  }

  return { width, height };
}

/**
 * Get chart SVG height based on actual container height
 * Uses container dimensions instead of window.innerHeight for better browser zoom compatibility
 * @param containerHeight Actual height of the chart container
 * @param chartType Type of chart (bargraph or network)
 * @returns SVG height for the chart
 */
function getContainerBasedHeight(
  containerHeight: number,
  chartType: ChartType
): number {
  // Calculate overhead based on chart type and legend layout
  const overhead = getChartOverhead(chartType);

  // Ensure minimum height for usability
  const minHeight = chartType === "bargraph" ? 300 : 400;

  // Chart SVG height = container height - overhead, with minimum constraint
  return Math.max(minHeight, containerHeight - overhead);
}

/**
 * Get overhead (non-chart elements) height for different chart types
 * @param chartType Type of chart
 * @returns Overhead height in pixels
 */
function getChartOverhead(chartType: ChartType): number {
  if (chartType === "bargraph") {
    // Bar charts: top legend (20px) + margin (8px) + pagination (40px) = 68px
    return 68;
  } else {
    // Network charts: bottom legend & controls (20px) + margin (16px) = 36px
    return 36;
  }
}

/**
 * Check if dimensions change is significant enough to warrant update
 * @param prev Previous dimensions
 * @param next New dimensions
 * @param threshold Minimum change threshold (default: 10px)
 * @returns Whether dimensions changed significantly
 */
export function hasSignificantDimensionChange(
  prev: ChartDimensions,
  next: ChartDimensions,
  threshold: number = 10
): boolean {
  return (
    Math.abs(prev.width - next.width) > threshold ||
    Math.abs(prev.height - next.height) > threshold
  );
}

/**
 * Create debounced resize handler
 * @param handler Resize handler function
 * @param delay Debounce delay in ms (default: 150)
 * @returns Cleanup function
 */
export function createDebouncedResizeHandler(
  handler: () => void,
  delay: number = 150
): () => void {
  let timeoutId: number;

  const debouncedHandler = () => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(handler, delay);
  };

  // Initial call
  debouncedHandler();
  window.addEventListener("resize", debouncedHandler);

  // Return cleanup function
  return () => {
    clearTimeout(timeoutId);
    window.removeEventListener("resize", debouncedHandler);
  };
}
