"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as d3 from "d3";

interface DotplotData {
  Category: string;
  Description: string;
  GeneRatio: number;
  Count: number;
  "p.adjust"?: number;
}

interface BarplotData {
  log2FC_sign: string;
  Category: string;
  Description: string;
  perc: number;
}

interface EnrichmentApiResponse {
  dotplot: {
    headers: string[];
    data: DotplotData[];
  };
  barplot: {
    headers: string[];
    data: BarplotData[];
  };
  metadata: {
    categories: string[];
    enrichmentType: "GO" | "KEGG";
  };
}

interface GroupedData {
  [category: string]: {
    dotplot: DotplotData[];
    barplot: BarplotData[];
  };
}

interface GridRow {
  charts: string[];
  isLastRow: boolean;
}

interface ResponsiveLayoutConfig {
  isWideScreen: boolean;
  chartsPerRow: number;
}

interface EnrichmentChartProps {
  width?: number;
  height?: number;
  data?: string | null;
}

interface useEnrichmentDataProps {
  apiData: EnrichmentApiResponse | null;
}

// Color for p.adjust when min = max
const PADJUST_SINGLE_COLOR = "#7BA552";

export const useEnrichmentData = ({ apiData }: useEnrichmentDataProps) => {
  const groupedData = useMemo(() => {
    if (!apiData) return null;

    try {
      const categories = apiData.metadata.categories;
      const grouped: GroupedData = {};

      categories.forEach((category) => {
        grouped[category] = {
          dotplot: apiData.dotplot.data.filter(
            (item) => item.Category === category
          ),
          barplot: apiData.barplot.data.filter(
            (item) => item.Category === category
          ),
        };
      });

      return grouped;
    } catch (err) {
      console.error("Error processing data:", err);
      return null;
    }
  }, [apiData]);

  const createPAdjustLegendFromData = (
    minPAdjust: number,
    maxPAdjust: number
  ) => {
    if (minPAdjust === maxPAdjust) {
      return [
        {
          value: minPAdjust,
          label: minPAdjust.toExponential(2),
        },
      ];
    }

    const items = [];
    const logMin = Math.log10(minPAdjust);
    const logMax = Math.log10(maxPAdjust);
    const step = (logMax - logMin) / 4;

    for (let i = 0; i <= 4; i++) {
      const logValue = logMax - i * step;
      const value = Math.pow(10, logValue);
      items.push({
        value: value,
        label: value.toExponential(2),
      });
    }

    return items;
  };

  const scaleData = useMemo(() => {
    if (!apiData) return null;

    try {
      const allDotplotData = apiData.dotplot.data;

      const minGeneRatio = d3.min(allDotplotData, (d) => d.GeneRatio) || 0;
      const maxGeneRatio = d3.max(allDotplotData, (d) => d.GeneRatio) || 1;

      const buffer = (maxGeneRatio - minGeneRatio) * 0.05;
      const geneRatioAxisStart = Math.max(0, minGeneRatio - buffer);
      const geneRatioAxisEnd = maxGeneRatio + buffer;

      let minPAdjust = d3.min(allDotplotData, (d) => d["p.adjust"]) || 0;
      const maxPAdjust = Math.min(
        0.1,
        d3.max(allDotplotData, (d) => d["p.adjust"]) || 0.1
      );

      minPAdjust = Math.max(0.000001, minPAdjust);

      const minCount = d3.min(allDotplotData, (d) => d.Count) || 0;
      const maxCount = d3.max(allDotplotData, (d) => d.Count) || 1;

      const colorScale =
        minPAdjust === maxPAdjust
          ? () => PADJUST_SINGLE_COLOR
          : d3
              .scaleLinear<string>()
              .domain([minPAdjust, maxPAdjust])
              .range(["#F9F905", "#0431F9"])
              .clamp(true);

      const sizeScale = d3
        .scaleSqrt()
        .domain([minCount, maxCount])
        .range([4, 12]);

      const sizeLegendItems = [];
      const range = maxCount - minCount;
      if (minCount === maxCount) {
        sizeLegendItems.push(minCount);
      } else if (range <= 4) {
        for (let i = minCount; i <= maxCount; i++) {
          sizeLegendItems.push(i);
        }
      } else {
        const step = range / 4;
        for (let i = 0; i < 5; i++) {
          sizeLegendItems.push(Math.round(minCount + i * step));
        }
      }

      const pValueLegendItems = createPAdjustLegendFromData(
        maxPAdjust,
        minPAdjust
      );

      return {
        minGeneRatio,
        maxGeneRatio,
        geneRatioAxisStart,
        geneRatioAxisEnd,
        minPAdjust,
        maxPAdjust,
        minCount,
        maxCount,
        colorScale,
        sizeScale,
        sizeLegendItems,
        pValueLegendItems,
        barColors: {
          up: "#22C55E",
          down: "#F97316",
        },
      };
    } catch (err) {
      console.error("Error calculating scale data:", err);
      return null;
    }
  }, [apiData]);

  useEffect(() => {
    const titleElement = document.querySelector(".chart-title");
    const legendElement = document.querySelector(".legend-container");

    if (titleElement && legendElement) {
      const titleRect = titleElement.getBoundingClientRect();
      // @ts-ignore
      legendElement.style.top = `${titleRect.top}px`;
    }
  }, []);

  return { groupedData, scaleData };
};

const useResponsiveLayout = (): ResponsiveLayoutConfig => {
  const [isWideScreen, setIsWideScreen] = useState<boolean>(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsWideScreen(window.innerWidth >= 1280);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return {
    isWideScreen,
    chartsPerRow: isWideScreen ? 2 : 1,
  };
};

const calculateGridLayout = (
  ontologyKeys: string[],
  chartsPerRow: number
): GridRow[] => {
  const rows: GridRow[] = [];

  for (let i = 0; i < ontologyKeys.length; i += chartsPerRow) {
    const charts = ontologyKeys.slice(i, i + chartsPerRow);
    const isLastRow = i + chartsPerRow >= ontologyKeys.length;

    rows.push({
      charts,
      isLastRow,
    });
  }

  return rows;
};

const Tooltip = React.forwardRef<HTMLDivElement>((props, ref) => (
  <div
    ref={ref}
    className="border-border bg-popover text-foreground pointer-events-none fixed z-30 rounded border p-2 text-sm opacity-0 shadow-lg transition-opacity duration-150"
    style={{ maxWidth: "300px" }}
  />
));

Tooltip.displayName = "Tooltip";
interface OntologyChartProps {
  data: any;
  ontologyName: any;
  width: any;
  height: any;
  colorScale: any;
  sizeScale: any;
  barColors: any;
  geneRatioAxisStart: any;
  geneRatioAxisEnd: any;
  leftMargin: number;
  chartWidth?: number;
  isInGrid?: boolean;
}

const OntologyChart: React.FC<OntologyChartProps> = ({
  data,
  ontologyName,
  width,
  height,
  colorScale,
  sizeScale,
  barColors,
  geneRatioAxisStart,
  geneRatioAxisEnd,
  leftMargin,
  chartWidth,
  isInGrid = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartTooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !data || !chartTooltipRef.current) return;

    const dotplotData = data.dotplot;
    const barplotData = data.barplot;

    if (!dotplotData.length) return;

    // Helper function to remove trailing zeros
    const formatNumberWithoutTrailingZeros = (value: number): string => {
      return parseFloat(value.toFixed(3)).toString();
    };

    const descriptions = [
      ...new Set(dotplotData.map((d: any) => d.Description)),
    ];

    // setup height for each row
    const rowHeight = 40;
    const totalRowsHeight = descriptions.length * rowHeight;

    const margin = { top: 20, right: 20, bottom: 80, left: leftMargin };
    const calculatedHeight = totalRowsHeight + margin.top + margin.bottom;
    const chartHeight = height || calculatedHeight;

    const effectiveWidth = chartWidth || width;
    const barplotWidth = Math.max(115, effectiveWidth * 0.2);
    const dotplotWidth = effectiveWidth - barplotWidth;

    d3.select(chartRef.current).selectAll("svg").remove();

    const svgDotplot = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", dotplotWidth)
      .attr("height", chartHeight);

    const svgBarplot = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", barplotWidth)
      .attr("height", chartHeight);

    // adjust yScale to use fixed height
    const yScale = d3
      .scaleBand()
      .domain(descriptions as any)
      .range([margin.top, margin.top + totalRowsHeight])
      .padding(0.1); // reduce padding to have more space for each row

    const xScaleDot = d3
      .scaleLinear()
      .domain([geneRatioAxisStart, geneRatioAxisEnd])
      .range([margin.left, dotplotWidth - margin.right]);

    const minOffset = 8;
    const xScaleBar = d3
      .scaleLinear()
      .domain([0, 1])
      .range([minOffset, barplotWidth - margin.right]);

    const tooltip = d3.select(chartTooltipRef.current);
    tooltip.style("position", "fixed").style("z-index", "1000");

    // add background layer for even and odd rows
    const backgroundLayer = svgDotplot
      .append("g")
      .attr("class", "background-layer");

    // create backgrounds for even and odd rows with fixed height
    descriptions.forEach((description, index) => {
      if (index % 2 === 1) {
        // even row (index starts from 0)
        const y = yScale(description as string) as number;
        // use fixed height instead of yScale.bandwidth()

        // Background rectangle for dotplot
        backgroundLayer
          .append("rect")
          .attr("x", 0)
          .attr("y", y) // no need to subtract height/2
          .attr("width", dotplotWidth)
          .attr("height", rowHeight)
          .attr("fill", "hsl(var(--token-background))")
          .attr("rx", 4) // add light border radius
          .attr("ry", 4);

        // Background rectangle for barplot (created on SVG barplot)
        svgBarplot
          .append("rect")
          .attr("x", 0)
          .attr("y", y) // no need to subtract height/2
          .attr("width", barplotWidth)
          .attr("height", rowHeight)
          .attr("fill", "hsl(var(--token-background))")
          .attr("rx", 4)
          .attr("ry", 4);
      }
    });

    const gridLayer = svgDotplot.append("g").attr("class", "grid-layer");
    const axisLayer = svgDotplot.append("g").attr("class", "axis-layer");
    const dataLayer = svgDotplot.append("g").attr("class", "data-layer");

    const ticks = xScaleDot.ticks(5);
    gridLayer
      .append("g")
      .attr("class", "grid-lines")
      .selectAll("line")
      .data(ticks)
      .enter()
      .append("line")
      .attr("x1", (d) => xScaleDot(d))
      .attr("x2", (d) => xScaleDot(d))
      .attr("y1", margin.top)
      .attr("y2", chartHeight - margin.bottom)
      .attr("stroke", "hsl(var(--border))")
      .attr("stroke-width", 1);

    const xAxis = axisLayer
      .append("g")
      .attr("transform", `translate(0,${chartHeight - margin.bottom})`)
      .call(
        d3
          .axisBottom(xScaleDot)
          .ticks(5)
          .tickFormat((d) => formatNumberWithoutTrailingZeros(d as number))
      )
      .attr("stroke-width", 0);

    xAxis
      .selectAll(".tick text")
      .attr("class", "font-normal text-xs font-raleway text-hint");

    xAxis
      .append("text")
      .attr("class", "axis-label font-medium")
      .attr("x", (margin.left + (dotplotWidth - margin.right)) / 2)
      .attr("y", 60)
      .attr("text-anchor", "middle")
      .text("Gene Ratio");

    const yAxis = axisLayer
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).tickSizeOuter(0));

    yAxis.select(".domain").attr("stroke-width", "0").attr("stroke", "red");

    yAxis
      .selectAll(".tick line")
      .attr("stroke-width", "1")
      .style("display", "none");

    // hide default text of axis
    yAxis.selectAll(".tick text").style("display", "none");

    // create custom labels with foreignObject
    const customYAxisLabels = axisLayer
      .append("g")
      .attr("class", "custom-y-axis-labels");

    // Helper function to wrap text for SVG with improved text handling
    const wrapText = (
      text: string,
      maxWidth: number,
      fontSize: number = 11
    ) => {
      const words = text.split(/\s+/);
      const lines = [];
      let currentLine = "";

      // Approximate character width for font-size 11px (more accurate)
      const charWidth = fontSize * 0.6;
      const maxCharsPerLine = Math.floor(maxWidth / charWidth);

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length <= maxCharsPerLine) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            // Word is too long, break it intelligently
            if (word.length > maxCharsPerLine) {
              // Break long words at reasonable points
              const chunks = [];
              for (let i = 0; i < word.length; i += maxCharsPerLine - 1) {
                chunks.push(
                  word.slice(i, i + maxCharsPerLine - 1) +
                    (i + maxCharsPerLine - 1 < word.length ? "-" : "")
                );
              }
              lines.push(...chunks);
            } else {
              lines.push(word);
            }
          }
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }

      // Limit to 3 lines max to fit better in 40px row height
      return lines.slice(0, 3);
    };

    descriptions.forEach((description) => {
      const y = yScale(description as string) as number;

      // Wrap text with consistent font size and safer width
      const wrappedLines = wrapText(description as string, 190, 11); // Use 170px width and 11px font size
      const lineHeight = 13; // Increase line height for better readability
      const totalTextHeight = wrappedLines.length * lineHeight;

      // Improved startY calculation to center text properly within row
      const rowCenterY = y + rowHeight / 2;
      const startY = rowCenterY - totalTextHeight / 2 + lineHeight / 2;

      wrappedLines.forEach((line, lineIndex) => {
        customYAxisLabels
          .append("text")
          .attr("x", 185) // Move slightly left to prevent clipping
          .attr("y", startY + lineIndex * lineHeight)
          .attr("text-anchor", "end")
          .attr("dominant-baseline", "central") // Use central for better alignment
          .style(
            "font-family",
            "var(--font-raleway), Raleway, -apple-system, BlinkMacSystemFont, sans-serif"
          )
          .style("font-size", "11px")
          .style("font-weight", "normal")
          .style("fill", "currentColor")
          .text(line);
      });
    });

    dataLayer
      .selectAll("circle")
      .data(dotplotData)
      .enter()
      .append("circle")
      .attr("cx", (d: any) => xScaleDot(d.GeneRatio))
      .attr("cy", (d: any) => {
        // get exact y position from yScale and add rowHeight/2 to center circle
        return (yScale(d.Description) as number) + rowHeight / 2;
      })
      .attr("r", (d: any) => sizeScale(d.Count))
      .attr("fill", (d: any) => {
        const pAdjustValue = d["p.adjust"];
        return colorScale(pAdjustValue as number);
      })
      .attr("stroke", "none")
      .on("mouseover", function (event, d: any) {
        d3.select(this).attr("stroke", "#333").attr("stroke-width", 2);

        const pAdjustValue = d["p.adjust"];

        const position = getTooltipPosition(event);

        tooltip
          .html(
            `
            <div class="font-raleway text-xs">
              <div><strong>Count:</strong> ${d.Count}</div>
              <div><strong>Gene Ratio:</strong> ${formatNumberWithoutTrailingZeros(
                d.GeneRatio
              )}</div>
              <div><strong>pAdjust:</strong> ${(
                pAdjustValue as number
              ).toExponential(2)}</div>
            </div>
          `
          )
          .style("left", `${position.x}px`)
          .style("top", `${position.y}px`)
          .style("display", "block")
          .style("opacity", "1")
          .style("pointer-events", "none")
          .style("z-index", "9999");
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "none");

        tooltip.style("display", "none").style("opacity", "0");
      });

    const barData: { [key: string]: { up: number; down: number } } = {};
    barplotData.forEach((d: any) => {
      if (!barData[d.Description]) {
        barData[d.Description] = { up: 0, down: 0 };
      }
      // @ts-ignore
      barData[d.Description][d.log2FC_sign as "up" | "down"] = d.perc;
    });

    const customPercentFormat = (value: any) => {
      return `${(value * 100).toFixed(0)}%`;
    };

    const percentageTicks = [0, 0.25, 0.5, 0.75, 1];

    svgBarplot
      .append("g")
      .attr("transform", `translate(0,${chartHeight - margin.bottom})`)
      .attr("stroke-width", 0)
      .call(
        d3
          .axisBottom(xScaleBar)
          .tickValues(percentageTicks)
          .tickFormat(customPercentFormat)
      )
      .append("text")
      .attr(
        "class",
        "axis-label font-sm font-raleway leading-6 text-hint font-medium"
      )
      .attr("x", barplotWidth / 2)
      .attr("y", 60)
      .attr("text-anchor", "middle")
      .text("Gene Percentage");

    svgBarplot
      .selectAll(".bar-up")
      .data(descriptions)
      .enter()
      .append("path")
      .attr("class", "bar-up")
      .attr("d", (d: any) => {
        const barValue = barData[d]?.up || 0;
        if (barValue === 0) return "";

        const x = minOffset;
        const y = yScale(d) as number;
        const width = xScaleBar(barValue) - minOffset;
        // const height = yScale.bandwidth();
        const height = 28;
        const radius = 6;

        // calculate y position to center chart with row
        const rowCenter = y + rowHeight / 2;
        const barY = rowCenter - height / 2;

        if (width <= 0) return "";

        // Check if this is a full-width bar (100%)
        const isFullWidth = barValue === 1 && !barData[d]?.down;

        return `
          M ${x + radius} ${barY}
          L ${x + width - (isFullWidth ? radius : 0)} ${barY}
          ${
            isFullWidth
              ? `Q ${x + width} ${barY} ${x + width} ${barY + radius}`
              : ""
          }
          L ${x + width} ${barY + (isFullWidth ? radius : 0)}
          L ${x + width} ${barY + height - (isFullWidth ? radius : 0)}
          ${
            isFullWidth
              ? `Q ${x + width} ${barY + height} ${x + width - radius} ${
                  barY + height
                }`
              : ""
          }
          L ${x + radius} ${barY + height}
          Q ${x} ${barY + height} ${x} ${barY + height - radius}
          L ${x} ${barY + radius}
          Q ${x} ${barY} ${x + radius} ${barY}
          Z
        `;
      })
      .attr("fill", barColors.up)
      .on("mouseover", function (event, d: any) {
        d3.select(this).attr("stroke", "#333").attr("stroke-width", 1);

        const position = getTooltipPosition(event);

        tooltip
          .html(
            `
            <div class="font-raleway text-xs">
              <div><strong>Up:</strong> ${((barData[d]?.up || 0) * 100).toFixed(
                1
              )}%</div>
            </div>
          `
          )
          .style("left", `${position.x}px`)
          .style("top", `${position.y}px`)
          .style("opacity", "0.95")
          .style("display", "block");
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "none");

        tooltip.style("opacity", "0").style("display", "none");
      });

    svgBarplot
      .selectAll(".bar-down")
      .data(descriptions)
      .enter()
      .append("path")
      .attr("class", "bar-down")
      .attr("d", (d: any) => {
        const upValue = barData[d]?.up || 0;
        const downValue = barData[d]?.down || 0;

        if (downValue === 0) return "";

        const x = upValue === 0 ? minOffset : xScaleBar(upValue);
        const y = yScale(d) as number;
        const width = downValue === 0 ? 0 : xScaleBar(upValue + downValue) - x;
        // const height = yScale.bandwidth();
        const height = 28;
        const radius = 6;

        // calculate y position to center chart with row
        const rowCenter = y + rowHeight / 2;
        const barY = rowCenter - height / 2;

        if (width <= 0) return "";

        // Check if this is a full-width bar (100% down, 0% up)
        const isFullWidth = downValue === 1 && upValue === 0;

        return `
          M ${x + (isFullWidth ? radius : 0)} ${barY}
          ${isFullWidth ? "" : `L ${x + width - radius} ${barY}`}
          ${isFullWidth ? `L ${x + width - radius} ${barY}` : ""}
          Q ${x + width} ${barY} ${x + width} ${barY + radius}
          L ${x + width} ${barY + height - radius}
          Q ${x + width} ${barY + height} ${x + width - radius} ${barY + height}
          L ${x + (isFullWidth ? radius : 0)} ${barY + height}
          ${
            isFullWidth
              ? `Q ${x} ${barY + height} ${x} ${barY + height - radius}`
              : ""
          }
          L ${x} ${barY + (isFullWidth ? height - radius : height)}
          L ${x} ${barY + (isFullWidth ? radius : 0)}
          ${isFullWidth ? `Q ${x} ${barY} ${x + radius} ${barY}` : ""}
          Z
        `;
      })
      .attr("fill", barColors.down)
      .on("mouseover", function (event, d: any) {
        d3.select(this).attr("stroke", "#333").attr("stroke-width", 1);

        const position = getTooltipPosition(event);

        tooltip
          .html(
            `
            <div class="font-raleway text-xs">
              <div><strong>Down:</strong> ${(
                (barData[d]?.down || 0) * 100
              ).toFixed(1)}%</div>
            </div>
          `
          )
          .style("left", `${position.x}px`)
          .style("top", `${position.y}px`)
          .style("opacity", "0.95")
          .style("display", "block");
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "none");

        tooltip.style("opacity", "0").style("display", "none");
      });

    return () => {};
  }, [
    data,
    width,
    height,
    colorScale,
    sizeScale,
    barColors,
    geneRatioAxisStart,
    geneRatioAxisEnd,
    chartWidth,
    isInGrid,
  ]);

  const ontologyLabels: Record<string, any> = {
    BP: "Biological Processes",
    CC: "Cellular Components",
    MF: "Molecular Functions",
  };

  return (
    <div className="relative mb-10">
      <h4 className="mr-1.5">{ontologyLabels[ontologyName] || ontologyName}</h4>

      <div className="transition-all duration-300">
        <div className="flex" ref={chartRef}></div>
        <div
          ref={chartTooltipRef}
          className="border-border bg-popover text-foreground pointer-events-none fixed z-30 rounded border p-2 text-sm shadow-lg transition-opacity duration-150"
          style={{
            maxWidth: "300px",
            display: "none",
            opacity: 0,
          }}
        ></div>
      </div>
    </div>
  );
};

const getTooltipPosition = (event: any) => {
  const tooltipWidth = 200;
  const tooltipHeight = 80;

  const x = event.clientX;
  const y = event.clientY;

  let tooltipX = x + 15;
  let tooltipY = y - 15;

  if (tooltipX + tooltipWidth > window.innerWidth) {
    tooltipX = x - tooltipWidth - 15;
  }

  if (tooltipY < 10) {
    tooltipY = 10;
  } else if (tooltipY + tooltipHeight > window.innerHeight - 10) {
    tooltipY = window.innerHeight - tooltipHeight - 10;
  }

  return { x: tooltipX, y: tooltipY };
};

export const EnrichmentChart = forwardRef<HTMLDivElement, EnrichmentChartProps>(
  ({ width = 1000, height, data }, ref) => {
    const dataParse = data ? (JSON.parse(data) as EnrichmentApiResponse) : null;
    const [globalLeftMargin] = useState<number>(200); // Fixed 200px margin
    const responsiveLayout = useResponsiveLayout();

    if (!dataParse)
      return (
        <div className="flex h-[200px] items-center justify-center rounded-lg">
          <p className="text-gray-500">No data available to display.</p>
        </div>
      );

    // Check if dotplot and barplot data are empty
    const hasData =
      dataParse.dotplot.data.length > 0 || dataParse.barplot.data.length > 0;

    if (!hasData) {
      return (
        <div className="flex h-[200px] items-center justify-center rounded-lg">
          <p className="text-gray-500">No data available to display.</p>
        </div>
      );
    }

    const { groupedData, scaleData } = useEnrichmentData({
      apiData: dataParse,
    });

    const containerRef = useRef<HTMLDivElement>(null);

    // Expose containerRef to parent via forwarded ref
    useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

    const [containerWidth, setContainerWidth] = useState<number>(width);

    useEffect(() => {
      const handleResize = () => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.offsetWidth);
        }
      };

      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    if (!groupedData || !scaleData) {
      return null;
    }

    // Width chart = padding + margin left + width Legend
    const widthPadding = 5 * 2 * 4 + 4 * 4 + 150;

    // Calculate grid layout
    const ontologyKeys = Object.keys(groupedData);
    const gridRows = calculateGridLayout(
      ontologyKeys,
      responsiveLayout.chartsPerRow
    );

    // Calculate chart width for grid
    const baseChartWidth = containerWidth - widthPadding;

    return (
      <div
        className="bg-background relative m-0 flex items-start justify-between p-5 font-sans"
        ref={containerRef}
      >
        <div className="flex flex-1">
          <div className="flex-grow">
            <div className="flex flex-col gap-4">
              {gridRows.map((row, rowIndex) => (
                <div
                  key={`row-${rowIndex}`}
                  className={`flex gap-5 ${
                    responsiveLayout.isWideScreen ? "flex-row" : "flex-col"
                  }`}
                >
                  {row.charts.map((ontology) => {
                    // Calculate width for this specific chart based on how many charts in this row
                    const chartWidth =
                      responsiveLayout.isWideScreen && row.charts.length === 2
                        ? (baseChartWidth - 20) / 2 // 20px gap between charts
                        : baseChartWidth;

                    return (
                      <div
                        key={ontology}
                        className={
                          responsiveLayout.isWideScreen &&
                          row.charts.length === 2
                            ? "flex-1"
                            : "w-full"
                        }
                      >
                        <OntologyChart
                          key={ontology}
                          data={groupedData[ontology]}
                          ontologyName={ontology}
                          width={baseChartWidth}
                          height={height}
                          colorScale={scaleData.colorScale}
                          sizeScale={scaleData.sizeScale}
                          barColors={scaleData.barColors}
                          geneRatioAxisStart={scaleData.geneRatioAxisStart}
                          geneRatioAxisEnd={scaleData.geneRatioAxisEnd}
                          leftMargin={globalLeftMargin}
                          chartWidth={chartWidth}
                          isInGrid={responsiveLayout.isWideScreen}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div
            className="sticky ml-4 w-36 self-start rounded-md p-3 text-sm"
            style={{ top: "100px" }}
          >
            <div className="mb-2">
              <div className="font-raleway mb-1.5 text-sm font-medium leading-4">
                pAdjust
              </div>
              <div className="ml-1 flex w-24 items-center">
                {scaleData.pValueLegendItems.length === 1 ? (
                  <div className="flex items-center">
                    <div
                      className="mr-2 h-4 w-4 rounded-sm border border-gray-300"
                      style={{ backgroundColor: PADJUST_SINGLE_COLOR }}
                    />
                    <span className="font-raleway text-foreground text-sm font-medium">
                      {scaleData.pValueLegendItems[0]?.label}
                    </span>
                  </div>
                ) : (
                  <>
                    <svg width="16" height="113">
                      <defs>
                        <linearGradient
                          id="pAdjustGradient"
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#F9F905" />
                          <stop offset="100%" stopColor="#0431F9" />
                        </linearGradient>
                      </defs>
                      <rect
                        width="16"
                        height="113"
                        fill="url(#pAdjustGradient)"
                      />
                    </svg>
                    <div className="font-raleway text-foreground flex h-32 flex-col justify-between pl-2 text-sm font-medium">
                      {scaleData.pValueLegendItems.map((item, i) => (
                        <span key={i}>{item.label}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mb-2">
              <div className="font-raleway mb-1.5 text-sm font-medium leading-4">
                Count
              </div>
              {scaleData.sizeLegendItems.map((size, index) => (
                <div
                  className="mb-2 flex items-center"
                  key={`size-${size}-${index}`}
                >
                  <svg width={80} height={30}>
                    <circle
                      cx={15}
                      cy={15}
                      r={Math.max(0, scaleData.sizeScale(size))}
                      fill="#4A67A1"
                    />
                    <text
                      x={32}
                      y={15}
                      dominantBaseline="central"
                      textAnchor="start"
                      fontSize="14"
                      fontFamily="var(--font-raleway), Raleway, -apple-system, BlinkMacSystemFont, sans-serif"
                      fill="currentColor"
                    >
                      {size}
                    </text>
                  </svg>
                </div>
              ))}
            </div>

            <div>
              <div className="font-raleway mb-3 mt-4 text-sm font-medium leading-4">
                Expression
              </div>
              <div className="mb-2 flex items-center">
                <svg width="80" height="24">
                  <rect
                    x="0"
                    y="0"
                    width="24"
                    height="24"
                    rx="4"
                    fill={scaleData.barColors.down}
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                  />
                  <text
                    x={28}
                    y={12}
                    dominantBaseline="central"
                    textAnchor="start"
                    fontSize="14"
                    fontFamily="var(--font-raleway), Raleway, -apple-system, BlinkMacSystemFont, sans-serif"
                    fill="currentColor"
                  >
                    Down
                  </text>
                </svg>
              </div>
              <div className="flex items-center">
                <svg width="80" height="24">
                  <rect
                    x="0"
                    y="0"
                    width="24"
                    height="24"
                    rx="4"
                    fill={scaleData.barColors.up}
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                  />
                  <text
                    x={28}
                    y={12}
                    dominantBaseline="central"
                    textAnchor="start"
                    fontSize="14"
                    fontFamily="var(--font-raleway), Raleway, -apple-system, BlinkMacSystemFont, sans-serif"
                    fill="currentColor"
                  >
                    Up
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          .axis-label {
            font-size: 14px;
            fill: #666;
          }
        `}</style>
      </div>
    );
  }
);

EnrichmentChart.displayName = "EnrichmentChart";
