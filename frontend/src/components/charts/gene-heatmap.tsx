"use client";

import * as d3 from "d3";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { GeneHeatmapProps } from "@/types/chart";
import {
  getFilteredSamples,
  getFilteredGenes,
  getVisibleSamples,
} from "./heatmap-filters";
import {
  createColorLegend,
  createAttributeLegend,
  createAnnotationBars,
  generateColorMap,
  createXAxis,
  createYAxis,
  createSegmentedColorScale,
} from "./heatmap-components";

const GeneHeatmap: React.FC<GeneHeatmapProps> = (props) => {
  const { dataHeatMap, setting, handleHeatMap } = props;

  const LIMIT_TOTAL_GENES_SHOW_LABEL = 50;
  const LIMIT_TOTAL_GENES_SHOW_BORDER_DRAWCELLS = 50;

  // Check if there are no genes to display
  if (
    !dataHeatMap ||
    !dataHeatMap.genes ||
    dataHeatMap.genes.length === 0 ||
    !setting
  ) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg">
        <p className="text-gray-500">No data available to display.</p>
      </div>
    );
  }

  const heatmapRef = useRef<SVGSVGElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const colorLegendRef = useRef<SVGSVGElement>(null);
  const attributeLegendRef = useRef<SVGSVGElement>(null);
  const xAxisRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [canvasPosition, setCanvasPosition] = useState({ left: 0, top: 0 });
  const [redrawTrigger, setRedrawTrigger] = useState(0);
  const [visibilityState, setVisibilityState] = useState<Map<string, boolean>>(
    new Map()
  );

  const [, setColorRangeValues] = useState<{
    min: number;
    max: number;
  } | null>(null);

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create optimized dependency key for annotations to avoid unnecessary re-renders
  const annotationsKey = useMemo(() => {
    if (
      !setting.additionalAnnotations ||
      setting.additionalAnnotations.length === 0
    ) {
      return "no-annotations";
    }
    return setting.additionalAnnotations
      .map(
        (annotation) =>
          `${annotation.name}-${annotation.index}-${annotation.type}`
      )
      .join("|");
  }, [setting.additionalAnnotations]);

  useEffect(() => {
    if (setting && (setting?.minValue || setting?.maxValue)) {
      setColorRangeValues({
        min: setting?.minValue ?? 0,
        max: setting?.maxValue ?? 0,
      });
    }
  }, [setting]);

  const debouncedHandleHeatMap = useCallback(
    (min: number, max: number) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        handleHeatMap(min, max);
      }, 100);
    },
    [handleHeatMap]
  );

  const handleSliderChange = (min: number, max: number) => {
    setColorRangeValues({ min, max });

    debouncedHandleHeatMap(min, max);

    // Calculate scaleBound consistently with createHeatmap logic
    const scaleBound = Math.max(Math.abs(max), Math.abs(min));

    const updatedColorScale = createSegmentedColorScale(
      max,
      min,
      scaleBound,
      setting.highColor,
      setting.lowColor
    );

    heatmapData.current.colorScale = updatedColorScale;

    drawCells();
  };

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Store heatmap data and settings for event handlers
  const heatmapData = useRef({
    visibleSamples: [] as typeof dataHeatMap.samples,
    colorScale: null as ((value: number) => string) | null,
    samples: [] as typeof dataHeatMap.samples,
    genes: [] as typeof dataHeatMap.genes,
    cellWidth: 0,
    cellHeight: 0,
    highlightedCell: { geneIndex: -1, sampleIndex: -1 },
  });

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect;
          const viewportHeight = window.innerHeight;
          const availableHeight = viewportHeight - 240;

          // Use full width of container
          const calculatedWidth = width - 90;

          setDimensions({
            width: calculatedWidth,
            height: availableHeight,
          });
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [containerRef]);

  useEffect(() => {
    if (dataHeatMap && dimensions.width > 0) {
      createHeatmap();
    }
  }, [dataHeatMap, dimensions]);

  // Add a new effect that triggers createHeatmap when visibilityState changes
  useEffect(() => {
    if (dataHeatMap && dimensions.width > 0) {
      createHeatmap();
    }
  }, [visibilityState]);

  // Add a new effect that triggers createHeatmap when setting colors change
  useEffect(() => {
    if (dataHeatMap && dimensions.width > 0) {
      createHeatmap();
    }
  }, [
    setting.highColor,
    setting.lowColor,
    setting.genes,
    setting.samples,
    dimensions.width,
  ]);

  // Add a new effect that triggers createHeatmap when setting annotations change
  useEffect(() => {
    if (dataHeatMap && dimensions.width > 0) {
      createHeatmap();
    }
  }, [annotationsKey, dimensions.width]);

  // Draw the heatmap cells on canvas
  const drawCells = () => {
    if (!canvasRef.current || !dataHeatMap) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const filteredGenes = getFilteredGenes(dataHeatMap, setting);

    // Use the visibleSamples saved in heatmapData
    const visibleSamples = heatmapData.current.visibleSamples;

    if (!visibleSamples || visibleSamples.length === 0) {
      console.warn("No visible samples to draw");
      return;
    }

    const { cellWidth, cellHeight, colorScale } = heatmapData.current;

    if (!colorScale || cellWidth === 0 || cellHeight === 0) {
      console.warn("Cannot draw cells - missing colorScale or cell dimensions");
      return;
    }

    // Clear canvas completely
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (filteredGenes.length > LIMIT_TOTAL_GENES_SHOW_BORDER_DRAWCELLS) {
      ctx.imageSmoothingEnabled = false;
    }

    // Create map to find the original index of each sample
    const sampleIndexMap = new Map();
    dataHeatMap.samples.forEach((sample, index) => {
      sampleIndexMap.set(sample.id, index);
    });

    // Draw cells in the order of visibleSamples
    filteredGenes.forEach((gene: any, geneIndex: number) => {
      visibleSamples.forEach((sample, visibleIndex) => {
        const originalSampleIndex = sampleIndexMap.get(sample.id);
        const value = gene.expressions[originalSampleIndex];

        ctx.fillStyle = typeof value === "number" ? colorScale(value) : "#eee";

        if (filteredGenes.length > LIMIT_TOTAL_GENES_SHOW_BORDER_DRAWCELLS) {
          const x = Math.round(visibleIndex * cellWidth);
          const y = Math.round(geneIndex * cellHeight);
          const width = Math.round((visibleIndex + 1) * cellWidth) - x;
          const height = Math.round((geneIndex + 1) * cellHeight) - y;
          ctx.fillRect(x, y, width, height);
        } else {
          ctx.fillRect(
            visibleIndex * cellWidth,
            geneIndex * cellHeight,
            cellWidth,
            cellHeight
          );
        }
      });
    });
  };

  // Effect to redraw cells when triggered
  useEffect(() => {
    if (canvasRef.current && heatmapData.current.colorScale) {
      drawCells();
    }
  }, [redrawTrigger, visibilityState]);

  // Effect to add canvas event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (event: MouseEvent) => {
      const { colorScale } = heatmapData.current;
      const visibleSamples = heatmapData.current.visibleSamples;
      const filteredGenes = getFilteredGenes(dataHeatMap, setting);

      // If no visible samples or color scale, return
      if (!visibleSamples || !colorScale) return;

      const { cellWidth, cellHeight } = heatmapData.current;

      if (!cellWidth || !cellHeight) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Calculate gene and sample indices
      const geneIndex = Math.floor(mouseY / cellHeight);
      const sampleIndex = Math.floor(mouseX / cellWidth);

      // Check if indices are valid
      if (
        geneIndex >= 0 &&
        geneIndex < filteredGenes.length &&
        sampleIndex >= 0 &&
        sampleIndex < visibleSamples.length
      ) {
        const gene = filteredGenes[geneIndex];
        if (!gene) return;

        const sample = visibleSamples[sampleIndex];
        if (!sample) return;

        // Find the original sample index in the data array
        const originalSampleIndex = dataHeatMap.samples.findIndex(
          (s) => s.id === sample.id
        );
        const value = gene.expressions[originalSampleIndex];

        // Update tooltip content and position
        if (tooltipRef.current) {
          tooltipRef.current.style.display = "block";

          let tooltipContent = `
            <div><strong>Gene:</strong> ${gene.displayName || gene.name}</div>
            <div><strong>Sample:</strong> ${sample.id}</div>
          `;

          // Add all annotations from setting
          if (
            setting.additionalAnnotations &&
            setting.additionalAnnotations.length > 0
          ) {
            setting.additionalAnnotations.forEach((annotation) => {
              const attributeName = annotation.name.toLowerCase();
              tooltipContent += `<div><strong>${annotation.name}:</strong> ${
                sample.attributes[attributeName] || "N/A"
              }</div>`;
            });
          }

          tooltipContent += `<div><strong>Value:</strong> ${
            typeof value === "number" ? value.toFixed(4) : "N/A"
          }</div>`;

          tooltipRef.current.innerHTML = tooltipContent;

          // Fix tooltip positioning to be relative to viewport
          const tooltipWidth = tooltipRef.current.offsetWidth;
          const tooltipHeight = tooltipRef.current.offsetHeight;
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          // Calculate position to ensure tooltip stays within viewport
          let left = event.clientX + 10;
          let top = event.clientY - 10;

          // Adjust if tooltip would go off right edge
          if (left + tooltipWidth > viewportWidth - 20) {
            left = event.clientX - tooltipWidth - 10;
          }

          // Adjust if tooltip would go off bottom edge
          if (top + tooltipHeight > viewportHeight - 20) {
            top = event.clientY - tooltipHeight - 10;
          }

          tooltipRef.current.style.left = `${left}px`;
          tooltipRef.current.style.top = `${top}px`;
          tooltipRef.current.style.zIndex = "10000";
        }

        // Redraw cells and highlight the current cell
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Only redraw if the highlighted cell has changed
          if (
            heatmapData.current.highlightedCell.geneIndex !== geneIndex ||
            heatmapData.current.highlightedCell.sampleIndex !== sampleIndex
          ) {
            // Redraw all cells
            drawCells();

            // Draw highlight
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.strokeRect(
              sampleIndex * cellWidth,
              geneIndex * cellHeight,
              cellWidth,
              cellHeight
            );

            // Update highlighted cell
            heatmapData.current.highlightedCell = { geneIndex, sampleIndex };
          }
        }
      } else {
        // Hide tooltip and reset highlight if outside valid cells
        if (tooltipRef.current) {
          tooltipRef.current.style.display = "none";
        }

        // Clear highlight if needed
        if (
          heatmapData.current.highlightedCell.geneIndex !== -1 ||
          heatmapData.current.highlightedCell.sampleIndex !== -1
        ) {
          drawCells();
          heatmapData.current.highlightedCell = {
            geneIndex: -1,
            sampleIndex: -1,
          };
        }
      }
    };

    const handleMouseLeave = () => {
      // Hide tooltip
      if (tooltipRef.current) {
        tooltipRef.current.style.display = "none";
      }

      // Clear highlight
      if (
        heatmapData.current.highlightedCell.geneIndex !== -1 ||
        heatmapData.current.highlightedCell.sampleIndex !== -1
      ) {
        drawCells();
        heatmapData.current.highlightedCell = {
          geneIndex: -1,
          sampleIndex: -1,
        };
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [dataHeatMap, redrawTrigger, visibilityState]);

  const createHeatmap = () => {
    if (
      !heatmapRef.current ||
      !controlRef.current ||
      !colorLegendRef.current ||
      !attributeLegendRef.current ||
      !xAxisRef.current ||
      !canvasRef.current ||
      !dataHeatMap
    )
      return;

    // Sort annotations by index
    const annotations = [...setting.additionalAnnotations].sort(
      (a, b) => a.index - b.index
    );

    // Filter samples and genes based on setting
    const filteredSamples = getFilteredSamples(dataHeatMap, setting);
    const filteredGenes = getFilteredGenes(dataHeatMap, setting);

    // Filter samples based on visibility state
    const visibleSamples = getVisibleSamples(
      filteredSamples,
      setting,
      visibilityState
    );

    // Save the list of visibleSamples to use in drawCells
    heatmapData.current.visibleSamples = visibleSamples;

    // Sort visibleSamples by the order of annotations based on index
    let sortedVisibleSamples = [...visibleSamples];
    if (annotations.length > 0) {
      sortedVisibleSamples = sortedVisibleSamples.sort((a, b) => {
        // Iterate through each annotation in priority order (from low to high index)
        for (const annotation of annotations) {
          const attributeName = annotation.name.toLowerCase();
          const valueA = String(a.attributes[attributeName] || "");
          const valueB = String(b.attributes[attributeName] || "");

          // If values are different, return the comparison result
          if (valueA !== valueB) {
            return valueA.localeCompare(valueB);
          }
        }
        // If all values are the same, keep the original order
        return 0;
      });

      // Update the sorted visibleSamples in heatmapData
      heatmapData.current.visibleSamples = sortedVisibleSamples;
    }

    const { samples, metadata, genes } = dataHeatMap;

    d3.select(heatmapRef.current).selectAll("*").remove();
    d3.select(colorLegendRef.current).selectAll("*").remove();
    d3.select(attributeLegendRef.current).selectAll("*").remove();
    d3.select(xAxisRef.current).selectAll("*").remove();

    // Process simple gene names
    const processedGenes = genes
      .filter((gene) => {
        if (setting.genes?.excluded?.length) {
          return !setting.genes.excluded.includes(gene.name);
        }

        if (setting.genes?.included?.length) {
          return setting.genes.included.includes(gene.name);
        }

        return true;
      })
      .map((gene) => ({
        ...gene,
        displayName: gene.name,
      }));

    // Set up dimensions and margins
    const isSmallGeneSet =
      processedGenes.length <= LIMIT_TOTAL_GENES_SHOW_LABEL;
    // When there are no gene names to display (not a small gene set), set left margin to 0
    const margin = {
      top: 20,
      right: 20,
      bottom: 20,
      left: isSmallGeneSet ? 160 : 25,
    };

    // Calculate available height from viewport
    const availableHeight = dimensions.height - margin.top - margin.bottom;

    // Dynamically calculate cell height to fit all genes in the available height
    // No minimum cell height - will scale to fit all genes
    const height = availableHeight;
    const width = dimensions.width - margin.left - margin.right - 78;

    // Adjust cell height and width based on visible samples and genes
    const cellHeight = height / filteredGenes.length;
    // Only use visible samples for calculating cell width to ensure proper display
    const cellWidth = width / sortedVisibleSamples.length;

    // Set canvas size and position
    canvasRef.current.width = width;
    canvasRef.current.height = height;

    // Calculate the center position accounting for the legend width
    const centerOffset = 25; // Reduced from 50 to 25

    // Set canvas position with adjusted left position to center the entire visualization
    setCanvasPosition({
      left: margin.left - centerOffset,
      top: margin.top,
    });

    // Store cell dimensions in heatmapData ref for event handlers
    heatmapData.current.cellWidth = cellWidth;
    heatmapData.current.cellHeight = cellHeight;
    heatmapData.current.samples = samples;
    heatmapData.current.genes = processedGenes;

    const svg = d3
      .select(heatmapRef.current)
      .attr(
        "width",
        isSmallGeneSet
          ? width + margin.left - centerOffset
          : width + margin.left - centerOffset
      )
      .attr("height", height + margin.top + margin.bottom)
      .style("overflow", "visible");

    const container = svg
      .append("g")
      .attr("class", "container")
      .attr("transform", `translate(${margin.left - centerOffset},0)`);

    let minValue = Infinity;
    let maxValue = -Infinity;

    // Iterate through gene expressions to find min/max values
    for (const gene of processedGenes) {
      for (const value of gene.expressions) {
        if (typeof value === "number") {
          if (value < minValue) minValue = value;
          if (value > maxValue) maxValue = value;
        }
      }
    }

    if (minValue === Infinity) minValue = 0;
    if (maxValue === -Infinity) maxValue = 1;

    const absMin = Math.abs(minValue);
    const absMax = Math.abs(maxValue);
    const smallerAbsValue = Math.min(absMin, absMax);
    const scaleBound = smallerAbsValue * 0.75;

    setColorRangeValues({ min: -scaleBound, max: scaleBound });

    // Use consistent segmented color scale for both initial and slider updates
    // This ensures color consistency when sliders are moved and returned to original position
    const colorScale = createSegmentedColorScale(
      scaleBound,
      -scaleBound,
      scaleBound,
      setting.highColor,
      setting.lowColor
    );

    // Store colorScale in heatmapData ref for event handlers
    heatmapData.current.colorScale = colorScale;

    // Create colors array for legend display (legend still needs this for layout calculation)
    const numColors = 50;
    const colorsForLegend = d3
      .range(numColors)
      .map((i) =>
        d3.interpolateRgb(
          setting.lowColor,
          setting.highColor
        )(i / (numColors - 1))
      );

    // Generate color map for annotations
    const colorMapTemp = generateColorMap(
      annotations,
      filteredSamples,
      metadata
    );

    // Create annotation bars
    const { totalAnnotationHeight, spacingBarAndChart } = createAnnotationBars(
      container,
      annotations,
      sortedVisibleSamples,
      colorMapTemp,
      cellWidth
    );

    // Create Y-axis (gene labels)
    createYAxis(
      container,
      filteredGenes,
      totalAnnotationHeight,
      cellHeight,
      spacingBarAndChart
    );

    // Ensure main heatmap is pushed down below annotation bars
    const mainHeatmapYOffset = totalAnnotationHeight + spacingBarAndChart;

    // Update canvas position for main heatmap
    setCanvasPosition({
      left: margin.left - centerOffset,
      top: mainHeatmapYOffset,
    });

    // Create X-axis (sample labels)
    createXAxis(
      xAxisRef.current,
      sortedVisibleSamples,
      cellWidth,
      width,
      totalAnnotationHeight
    );

    // Legend height and update style
    const legendHeight = 200;
    const legendWidth = 16;
    const legendGap = 32;

    controlRef.current.style.marginTop = `${
      totalAnnotationHeight + spacingBarAndChart
    }px`;
    controlRef.current.style.height = `${height}px`;

    // Create color legend
    createColorLegend(
      colorLegendRef.current,
      colorsForLegend,
      scaleBound,
      setting.highColor,
      setting.lowColor,
      legendHeight,
      legendWidth,
      handleSliderChange
    );

    // Create attribute legend
    const updateHeatmapVisibility = (key: string, newValue: boolean) => {
      setVisibilityState((prevState) => {
        const updatedState = new Map(prevState);
        updatedState.set(key, newValue);
        return updatedState;
      });
    };

    const { legendHeight: attributeLegendHeight } = createAttributeLegend(
      attributeLegendRef.current,
      annotations,
      filteredSamples,
      colorMapTemp,
      visibilityState,
      updateHeatmapVisibility
    ) || { legendHeight: 0, legendEntriesByAnnotation: new Map() };

    // Calculate available height for attribute legend
    const availableHeightAttributeLegend =
      availableHeight - legendHeight - legendGap;
    const needsScrolling =
      attributeLegendHeight > availableHeightAttributeLegend;

    // Update scrollbar container
    const attributeLegendContainer = controlRef.current.querySelector(
      ".scrollbar"
    ) as HTMLElement;

    if (attributeLegendContainer) {
      attributeLegendContainer.style.maxHeight = `${
        needsScrolling ? availableHeightAttributeLegend : attributeLegendHeight
      }px`;
      attributeLegendContainer.style.overflowY = needsScrolling
        ? "auto"
        : "visible";
    }

    // Trigger initial drawing of cells on canvas
    setRedrawTrigger((prev) => prev + 1);
  };

  return (
    <div className="h-auto w-full rounded-lg" ref={containerRef}>
      <div className="flex flex-col items-center justify-center md:flex-row md:items-start">
        <div className="relative flex flex-col">
          <div className="relative" style={{ maxWidth: "fit-content" }}>
            <svg ref={heatmapRef}></svg>
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                left: `${canvasPosition.left}px`,
                top: `${canvasPosition.top}px`,
              }}
            />
          </div>
          <svg
            ref={xAxisRef}
            style={{ marginTop: "0", marginLeft: `${canvasPosition.left}px` }}
          />
        </div>
        <div
          ref={controlRef}
          className="ml-0 flex flex-col items-start justify-center gap-2"
          style={{ marginLeft: 0 }}
        >
          <div className="relative -left-6">
            <svg ref={colorLegendRef} className="ml-0" />
          </div>

          <div className="scrollbar overflow-auto overflow-x-hidden">
            <svg ref={attributeLegendRef} className="ml-0" />
          </div>
        </div>
      </div>

      {/* Custom tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: "fixed",
          display: "none",
          backgroundColor: "hsl(var(--popover))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "4px",
          padding: "8px",
          fontSize: "12px",
          pointerEvents: "none",
          zIndex: 10000,
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          maxWidth: "250px",
        }}
      />
    </div>
  );
};

export default GeneHeatmap;
