"use client";

import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { VolcanoData, LegendVolcanoChartItem } from "@/types/chart";
import { Icon } from "@/components/icon";
import { formatNumber } from "@/lib/utils";

interface VolcanoPlotChartProps {
  data: string;
  legendItems: LegendVolcanoChartItem[];
  showLabel: boolean;
  updateShowLabel: (show: boolean) => void;
  updateLegendItemVisibility: (itemId: string, visible: boolean) => void;
}

export const VolcanoPlotChart: React.FC<VolcanoPlotChartProps> = ({
  data,
  legendItems,
  showLabel,
  updateLegendItemVisibility,
  updateShowLabel,
}) => {
  const dataParse = data ? (JSON.parse(data) as VolcanoData) : null;

  if (!dataParse)
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg">
        <p className="text-gray-500">No data available to display.</p>
      </div>
    );

  const [selectedGene, setSelectedGene] = useState<any | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomTransformRef = useRef<d3.ZoomTransform | null>(null);
  const defaultXScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const defaultYScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const drawChartRef = useRef<Function | null>(null);
  const xScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const yScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const pointsLookupRef = useRef<{ x: number; y: number; data: any[] }[]>([]);
  const showLabelsRef = useRef<boolean>(true);

  let fontFamily = "Raleway, sans-serif";

  useEffect(() => {
    showLabelsRef.current = showLabel;

    if (data && canvasRef.current && xScaleRef.current && yScaleRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const margin = { top: 40, right: 40, bottom: 50, left: 60 };

        context.save();

        context.resetTransform();
        context.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );

        context.scale(devicePixelRatio, devicePixelRatio);
        context.translate(margin.left, margin.top);

        if (drawChartRef.current) {
          drawChartRef.current(xScaleRef.current, yScaleRef.current);
        }

        context.restore();
      }
    }
  }, [showLabel, data]);

  const renderChart = () => {
    if (!data || !svgRef.current || !canvasRef.current || !containerRef.current)
      return;

    const containerWidth = containerRef.current.clientWidth;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const margin = { top: 40, right: 40, bottom: 50, left: 60 };
    const width = Math.max(containerWidth - margin.left - margin.right, 600);
    const height = 600 - margin.top - margin.bottom;

    const canvas = canvasRef.current;
    canvas.width = (width + margin.left + margin.right) * devicePixelRatio;
    canvas.height = (height + margin.top + margin.bottom) * devicePixelRatio;
    canvas.style.width = `${width + margin.left + margin.right}px`;
    canvas.style.height = `${height + margin.top + margin.bottom}px`;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(devicePixelRatio, devicePixelRatio);
    context.translate(margin.left, margin.top);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("position", "absolute");

    const lfcIndex = dataParse.headers.indexOf("lfcShrink");
    const padjIndex = dataParse.headers.indexOf("minus_log10_padj");
    const geneSymbolIndex = dataParse.headers.indexOf("gene_symbol");
    const groupIndex = dataParse.headers.indexOf("group");

    const visibleGroups = legendItems
      .filter((item) => item.visible)
      .map((item) => item.id);
    const filteredData = dataParse.data.filter((row) => {
      const lfc = row[lfcIndex];
      const padj = row[padjIndex];
      return (
        visibleGroups.includes(row[groupIndex]) &&
        typeof lfc === "number" &&
        !isNaN(lfc) &&
        typeof padj === "number" &&
        !isNaN(padj)
      );
    });

    const lfcValues = filteredData.map((row) => row[lfcIndex] || 0);
    const padjValues = filteredData.map((row) => row[padjIndex] || 0);

    const xExtent = d3.extent(lfcValues);
    const yExtent = d3.extent(padjValues);

    const defaultXScale = d3
      .scaleLinear()
      .domain([
        Math.min(xExtent[0] ?? 0, -Math.log2(dataParse.metadata.fc_threshold)) *
          1.1,
        Math.max(xExtent[1] ?? 0, Math.log2(dataParse.metadata.fc_threshold)) *
          1.1,
      ])
      .range([0, width]);

    const minY = Math.min(yExtent[0] ?? 0, 0);
    const maxY = Math.max(
      yExtent[1] ?? 0,
      -Math.log10(dataParse.metadata.padj_threshold)
    );
    const yPadding = (maxY - minY) * 0.05;

    const defaultYScale = d3
      .scaleLinear()
      .domain([minY - yPadding, maxY * 1.1])
      .range([height, 0]);

    defaultXScaleRef.current = defaultXScale;
    defaultYScaleRef.current = defaultYScale;

    let xScale = defaultXScale.copy();
    let yScale = defaultYScale.copy();

    xScaleRef.current = xScale;
    yScaleRef.current = yScale;

    const zoomed = (event: any) => {
      const transform = event.transform;
      zoomTransformRef.current = transform;
      xScale = transform.rescaleX(defaultXScale);
      yScale = transform.rescaleY(defaultYScale);

      xScaleRef.current = xScale;
      yScaleRef.current = yScale;

      drawChart(xScale, yScale);
    };

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, Infinity])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .extent([
        [0, 0],
        [width, height],
      ])
      .on("zoom", zoomed);

    svg.call(zoom as any);

    const drawChart = (
      x: d3.ScaleLinear<number, number>,
      y: d3.ScaleLinear<number, number>
    ) => {
      context.save();
      context.resetTransform();
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.scale(devicePixelRatio, devicePixelRatio);
      context.translate(margin.left, margin.top);

      context.fillStyle = "white";
      context.fillRect(0, 0, width, height);

      context.beginPath();
      context.strokeStyle = "rgba(200, 200, 200, 0.5)";
      context.lineWidth = 0.7;

      const xTicks = x.ticks();
      for (const tick of xTicks) {
        context.moveTo(x(tick), 0);
        context.lineTo(x(tick), height);
      }

      const yTicks = y.ticks();
      for (const tick of yTicks) {
        context.moveTo(0, y(tick));
        context.lineTo(width, y(tick));
      }

      context.stroke();

      const pointsLookup: { x: number; y: number; data: any[] }[] = [];

      Object.entries(
        filteredData.reduce((acc, d) => {
          const group = d[groupIndex];
          if (!acc[group]) acc[group] = [];
          acc[group].push(d);
          return acc;
        }, {} as Record<string, any[]>)
      ).forEach(([group, points]) => {
        const legendItem = legendItems.find((item) => item.id === group);
        if (!legendItem || !legendItem.visible) return;

        context.fillStyle = legendItem.color;
        context.globalAlpha = 0.7;

        points.forEach((d) => {
          const xVal = x(d[lfcIndex] || 0);
          const yVal = y(d[padjIndex] || 0);
          if (xVal < 0 || xVal > width || yVal < 0 || yVal > height) return;

          context.beginPath();
          context.arc(xVal, yVal, 3, 0, 2 * Math.PI);
          context.fill();

          pointsLookup.push({ x: xVal, y: yVal, data: d });
        });
      });

      pointsLookupRef.current = pointsLookup;

      context.globalAlpha = 1.0;

      context.beginPath();
      context.setLineDash([4, 4]);
      context.strokeStyle = "#333";
      context.lineWidth = 1;
      context.moveTo(x(-Math.log2(dataParse.metadata.fc_threshold)), 0);
      context.lineTo(x(-Math.log2(dataParse.metadata.fc_threshold)), height);
      context.moveTo(x(Math.log2(dataParse.metadata.fc_threshold)), 0);
      context.lineTo(x(Math.log2(dataParse.metadata.fc_threshold)), height);
      context.moveTo(0, y(-Math.log10(dataParse.metadata.padj_threshold)));
      context.lineTo(width, y(-Math.log10(dataParse.metadata.padj_threshold)));
      context.stroke();
      context.setLineDash([]);

      const g = svg.selectAll("g.axis-group").data([null]);
      const gEnter = g.enter().append("g").attr("class", "axis-group");
      // @ts-ignore
      const axisGroup = gEnter.merge(g);

      axisGroup.selectAll("*").remove();

      axisGroup
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top + height})`)
        .call(d3.axisBottom(x))
        .attr("stroke-width", "0")
        .selectAll(".tick text")
        .attr("class", "text-xs");

      axisGroup
        .append("text")
        .attr(
          "class",
          "x-axis-label font-medium font-raleway text-sm leading-4"
        )
        .attr("text-anchor", "middle")
        .attr("x", margin.left + width / 2 - 20)
        .attr("y", margin.top + height + 40)
        .attr("fill", "hsl(var(--foreground))")
        .text("Log₂ fold change");

      axisGroup
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .call(d3.axisLeft(y))
        .attr("stroke-width", "0")
        .selectAll(".tick text")
        .attr("class", "text-xs");

      axisGroup
        .append("text")
        .attr(
          "class",
          "y-axis-label font-medium font-raleway text-sm leading-4"
        )
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -(margin.top + height / 2))
        .attr("y", margin.left - 40)
        .attr("fill", "hsl(var(--foreground))")
        .text("-Log₁₀ adjusted P");

      if (showLabelsRef.current) {
        renderLabels(x, y, width, height, pointsLookup, context);
      }

      if (selectedGene) {
        const xVal = x(selectedGene[lfcIndex] || 0);
        const yVal = y(selectedGene[padjIndex] || 0);
        context.beginPath();
        context.arc(xVal, yVal, 6, 0, 2 * Math.PI);
        context.strokeStyle = "black";
        context.lineWidth = 1;
        context.stroke();
        context.font = `12px ${fontFamily}`;
        context.fillStyle = "black";
        context.textAlign = "center";
        context.fillText(selectedGene[geneSymbolIndex], xVal, yVal - 10);
      }

      axisGroup
        .selectAll("rect.zoom-overlay")
        .data([null])
        .enter()
        .append("rect")
        .attr("class", "zoom-overlay")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mousemove", function (event) {
          const [mouseX, mouseY] = d3.pointer(event);
          const radius = 5;
          let closest = null;
          let minDist = radius;

          for (const point of pointsLookup) {
            const dx = point.x - mouseX;
            const dy = point.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
              closest = point.data;
              minDist = dist;
            }
          }

          // Remove any existing volcano tooltip
          d3.select(".volcano-tooltip").remove();

          if (closest) {
            setSelectedGene(closest);

            // Calculate tooltip positioning with boundary checking
            const tooltipWidth = 320;
            const tooltipHeight = 160;
            const offset = 15;

            let tooltipX = event.pageX + offset;
            let tooltipY = event.pageY - offset;

            // Get current scroll position
            const scrollX =
              window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY =
              window.pageYOffset || document.documentElement.scrollTop;

            // Calculate viewport boundaries
            const viewportLeft = scrollX + 10;
            const viewportRight = scrollX + window.innerWidth - 10;
            const viewportTop = scrollY + 10;
            const viewportBottom = scrollY + window.innerHeight - 10;

            // Boundary checking - prevent tooltip from going off-screen
            // Horizontal boundary checking
            if (tooltipX + tooltipWidth > viewportRight) {
              tooltipX = event.pageX - tooltipWidth - offset;
            }

            // Vertical boundary checking
            if (tooltipY + tooltipHeight > viewportBottom) {
              tooltipY = event.pageY - tooltipHeight - offset;
            }

            // Ensure tooltip stays within viewport boundaries
            tooltipX = Math.max(
              viewportLeft,
              Math.min(viewportRight - tooltipWidth, tooltipX)
            );
            tooltipY = Math.max(
              viewportTop,
              Math.min(viewportBottom - tooltipHeight, tooltipY)
            );

            // Create dynamic tooltip using Heatmap pattern
            d3.select("body")
              .append("div")
              .attr("class", "volcano-tooltip")
              .style("position", "absolute")
              .style("visibility", "visible")
              .style("background-color", "white")
              .style("padding", "8px")
              .style("border", "1px solid #ccc")
              .style("border-radius", "6px")
              .style("font-size", "12px")
              .style("font-family", "Raleway, sans-serif")
              .style("pointer-events", "none")
              .style("z-index", "10000")
              .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
              .style("max-width", "320px")
              .style("white-space", "nowrap")
              .html(
                `
                <div style="color: black;">
                  <div><strong>Gene symbol:</strong> ${
                    closest[geneSymbolIndex]
                  }</div>
                  <div><strong>x-axis coordinate:</strong> ${formatNumber(
                    closest[lfcIndex]
                  )}</div>
                  <div><strong>y-axis coordinate:</strong> ${formatNumber(
                    closest[padjIndex]
                  )}</div>
                  <div><strong>Log2 Fold Change:</strong> ${formatNumber(
                    closest[dataParse.headers.indexOf("log2FoldChange")]
                  )}</div>
                  <div><strong>Adjusted p-value:</strong> ${formatNumber(
                    closest[dataParse.headers.indexOf("padj")]
                  )}</div>
                  <div><strong>Gene ID:</strong> ${
                    closest[dataParse.headers.indexOf("gene_id")]
                  }</div>
                  <div><strong>Gene biotype:</strong> ${
                    closest[dataParse.headers.indexOf("gene_biotype")]
                  }</div>
                </div>
              `
              )
              .style("top", `${tooltipY}px`)
              .style("left", `${tooltipX}px`);
          } else {
            if (selectedGene) setSelectedGene(null);
          }
        })
        .on("mouseleave", () => {
          // Remove tooltip when mouse leaves chart area
          d3.select(".volcano-tooltip").remove();
          setSelectedGene(null);
        });
    };

    drawChartRef.current = drawChart;

    const renderLabels = (
      x: any,
      y: any,
      width: any,
      height: any,
      pointsLookup: any,
      context: any
    ) => {
      const pointsWithPriority = pointsLookup
        .map((point: any) => ({
          ...point,
          priority: point.data[padjIndex] + Math.abs(point.data[lfcIndex]),
          geneName: point.data[geneSymbolIndex],
        }))
        .sort((a: any, b: any) => b.priority - a.priority);

      context.font = `12px ${fontFamily}`;
      context.fillStyle = "black";
      context.textAlign = "left";

      const zoomLevel = zoomTransformRef.current
        ? zoomTransformRef.current.k
        : 1;
      const spacing = 5;
      const viewportMargin = 50;
      const maxLabels = Math.min(5000, Math.floor(500 * zoomLevel));
      const gridSize = 20;
      const grid = {};

      const candidates = pointsWithPriority
        .filter(
          (point: any) =>
            point.x >= -viewportMargin &&
            point.x <= width + viewportMargin &&
            point.y >= -viewportMargin &&
            point.y <= height + viewportMargin
        )
        .slice(0, maxLabels);

      const textMetrics = {};
      candidates.forEach((point: any) => {
        const geneName = point.geneName;
        // @ts-ignore
        if (!textMetrics[geneName]) {
          const metrics = context.measureText(geneName);
          // @ts-ignore
          textMetrics[geneName] = {
            width: metrics.width,
            height: 12,
          };
        }
      });

      const getCellKeys = (rect: any) => {
        const startX = Math.floor((rect.x - spacing) / gridSize);
        const endX = Math.floor((rect.x + rect.width + spacing) / gridSize);
        const startY = Math.floor((rect.y - spacing) / gridSize);
        const endY = Math.floor((rect.y + rect.height + spacing) / gridSize);

        const keys = [];
        for (let x = startX; x <= endX; x++) {
          for (let y = startY; y <= endY; y++) {
            keys.push(`${x},${y}`);
          }
        }
        return keys;
      };

      const checkCollision = (rect: any) => {
        const cellKeys = getCellKeys(rect);
        for (const key of cellKeys) {
          // @ts-ignore
          if (grid[key]) {
            // @ts-ignore
            for (const existingRect of grid[key]) {
              if (
                !(
                  rect.x + rect.width + spacing < existingRect.x ||
                  rect.x > existingRect.x + existingRect.width + spacing ||
                  rect.y + rect.height + spacing < existingRect.y ||
                  rect.y > existingRect.y + existingRect.height + spacing
                )
              ) {
                return true;
              }
            }
          }
        }
        return false;
      };

      const addToGrid = (rect: any) => {
        const cellKeys = getCellKeys(rect);
        for (const key of cellKeys) {
          // @ts-ignore
          if (!grid[key]) grid[key] = [];
          // @ts-ignore
          grid[key].push(rect);
        }
      };

      for (const point of candidates) {
        const geneName = point.geneName;
        // @ts-ignore
        const { width: textWidth, height: textHeight } = textMetrics[geneName];

        const positions = [
          { x: point.x - textWidth / 2, y: point.y - textHeight - 5 },
          { x: point.x + 8, y: point.y - 5 },
          { x: point.x - textWidth - 8, y: point.y - 5 },
          { x: point.x - textWidth / 2, y: point.y + 10 },
        ].filter(
          (pos) =>
            pos.x >= 2 &&
            pos.x + textWidth <= width - 2 &&
            pos.y >= 2 &&
            pos.y + textHeight <= height - 2
        );

        // let placed = false;
        for (const pos of positions) {
          const labelRect = {
            x: pos.x,
            y: pos.y,
            width: textWidth,
            height: textHeight,
          };

          if (!checkCollision(labelRect)) {
            context.fillText(geneName, pos.x, pos.y + textHeight);
            addToGrid(labelRect);
            // placed = true;
            break;
          }
        }
      }
    };

    drawChart(xScale, yScale);
  };

  useEffect(() => {
    if (data) renderChart();
  }, [data, legendItems]);

  // Add resize handler to make the chart responsive
  useEffect(() => {
    const handleResize = () => {
      if (data) renderChart();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data, legendItems]);

  const toggleLegendItem = (id: string, checked: boolean) => {
    updateLegendItemVisibility(id, checked);
    if (svgRef.current) {
      const zoomBehavior = d3.zoom();

      d3.select(svgRef.current)
        .call(zoomBehavior as any)
        .call((zoomBehavior as any).transform, d3.zoomIdentity);

      zoomTransformRef.current = null;
    }
  };

  const toggleLabels = () => {
    updateShowLabel(!showLabel);
  };

  return (
    <div className="flex w-full flex-col items-start justify-start">
      <div className="flex w-full flex-row items-center justify-between rounded-md">
        <div ref={containerRef} className="border-input relative flex-grow">
          <div
            className="h-600 relative w-full"
            style={{ minWidth: "600px", height: "600px" }}
          >
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 1,
                width: "100%",
                height: "100%",
              }}
            />
            <svg
              ref={svgRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 2,
                width: "100%",
                height: "100%",
              }}
            />
          </div>
        </div>

        <div className="flex h-full w-64 flex-col justify-center gap-4">
          <div className="flex flex-col gap-1.5 rounded p-3">
            <div
              className="mb-2 flex cursor-pointer items-center gap-2"
              onClick={toggleLabels}
            >
              <div className="border-border flex size-4 items-center justify-center rounded border">
                {showLabel && (
                  <Icon name="checkedSolidGraySmallIcon" width={8} height={8} />
                )}
              </div>
              <span>Show Gene Labels</span>
            </div>
            {legendItems.map((item) => (
              <div
                key={item.id}
                className="flex cursor-pointer items-center gap-1.5"
                onClick={() => toggleLegendItem(item.id, !item.visible)}
              >
                <div className="border-border flex size-4 items-center justify-center rounded border">
                  {item.visible && (
                    <Icon
                      name="checkedSolidGraySmallIcon"
                      width={8}
                      height={8}
                    />
                  )}
                </div>
                <div
                  className="border-input size-6 rounded-md border"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
