"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import useTooltip from "./use-tooltip";
import { Spinner } from "../ui/spinner";
import { PCAData, PCAPlotItemTypeEnum } from "@/types/chart";

// Utility function to handle NA values
const formatDisplayValue = (value: unknown): string => {
  if (value === undefined || value === null || value === "" || value === "NA") {
    return "NA";
  }
  return String(value);
};

// Shape size constants for consistency
const CHART_SHAPE_SIZE = 64;
const CHART_SHAPE_SIZE_HOVER = 100;
const LEGEND_SHAPE_SIZE = 350;

interface PCAPlotProps {
  data: PCAData | null;
  loading: boolean;
  error: string | null;
  isZoomed?: boolean;
  attribute: string;
  type: PCAPlotItemTypeEnum;
  attributeDisplayValues?: string;
  secondAttribute?: string;
  secondAttributeDisplayValues?: string;
  onZoom?: () => void;
  fullWidth?: boolean;
  controlsPosition?: "separate" | "inline";
}

const PCAPlot: React.FC<PCAPlotProps> = ({
  data,
  loading,
  error,
  attribute,
  type,
  attributeDisplayValues = "color",
  secondAttribute,
  secondAttributeDisplayValues,
  isZoomed = false,
  onZoom,
  fullWidth = false,
  controlsPosition = "separate",
}: PCAPlotProps) => {
  const pcaRef = useRef<SVGSVGElement>(null);
  const controlsRef = useRef<SVGSVGElement>(null);
  const clipPathIdRef = useRef<string>(
    `legend-clip-${Math.random().toString(36).substring(2, 9)}`
  );
  const { showTooltip, moveTooltip, hideTooltip } = useTooltip();

  // Move createPlot function definition inside the component but outside of any hooks
  const createPlot = useCallback(() => {
    if (!pcaRef.current || !controlsRef.current || !data) return;

    const { headers, data: pcaData, metadata } = data;

    const pc1Index = headers.indexOf("PC1");
    const pc2Index = headers.indexOf("PC2");
    const conditionType =
      type === PCAPlotItemTypeEnum.GROUP ? type : attribute ?? "";
    const conditionIndex = headers.indexOf(conditionType);
    const sampleIndex = headers.indexOf("sample_label_original");

    // Add support for second attribute
    const secondConditionIndex = secondAttribute
      ? headers.indexOf(secondAttribute)
      : -1;

    // Validate that required columns exist
    if (pc1Index === -1 || pc2Index === -1 || conditionIndex === -1) {
      console.error(
        "Required columns (PC1, PC2, condition) not found in PCA data"
      );
      return;
    }

    // Clear previous SVG content
    d3.select(pcaRef.current).selectAll("*").remove();
    d3.select(controlsRef.current).selectAll("*").remove();

    // Adjust dimensions based on zoom state and container width
    const margin = { top: 10, right: 10, bottom: 60, left: 60 };

    // Get the container width to make the chart responsive
    const containerWidth = pcaRef.current.parentElement?.clientWidth || 600;

    // Use different width calculations based on zoom state, fullWidth prop, and controlsPosition
    let width;
    if (isZoomed) {
      if (fullWidth) {
        // For full width in zoom dialog
        width =
          controlsPosition === "inline"
            ? Math.max(800, containerWidth - margin.left - margin.right - 20) // Less space reserved for controls when inline
            : Math.max(600, containerWidth - margin.left - margin.right - 170);
      } else {
        width = Math.max(
          600,
          Math.min(900, containerWidth - margin.left - margin.right - 150)
        );
      }
    } else {
      width = Math.max(
        370,
        Math.min(600, containerWidth - margin.left - margin.right - 20)
      );
    }

    // Adjust height based on zoom state
    const height = isZoomed
      ? fullWidth
        ? Math.max(600, window.innerHeight * 0.7)
        : 600
      : 400 - margin.top - margin.bottom;

    const svg = d3
      .select(pcaRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("class", "max-w-full");

    // Adjust controlsSvg width and position based on controlsPosition
    const controlsSvg = d3
      .select(controlsRef.current)
      .attr("width", controlsPosition === "inline" ? 150 : 150)
      .attr("height", height)
      .attr(
        "viewBox",
        `0 0 ${controlsPosition === "inline" ? 150 : 150} ${height}`
      )
      .attr("preserveAspectRatio", "xMidYMid meet");

    const zoomContainerG = svg
      .append("g")
      .attr("class", "zoom-container")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add white background to zoom container
    zoomContainerG
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .style("fill", "#ffffff");

    // Safely get extents with fallbacks
    const xExtent = d3.extent(pcaData, (d) => d[pc1Index] as number) || [-1, 1];
    const yExtent = d3.extent(pcaData, (d) => d[pc2Index] as number) || [-1, 1];

    const xScale = d3
      .scaleLinear()
      .domain(xExtent as [number, number])
      .nice()
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain(yExtent as [number, number])
      .nice()
      .range([height, 0]);

    const conditions = [
      ...new Set(pcaData.map((d) => formatDisplayValue(d[conditionIndex]))),
    ] as string[];
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(conditions)
      .range(d3.schemeCategory10);

    // Add second attribute conditions if available
    const secondConditions =
      secondAttribute && secondConditionIndex !== -1
        ? ([
            ...new Set(
              pcaData.map((d) => formatDisplayValue(d[secondConditionIndex]))
            ),
          ] as string[])
        : [];

    // Use a consistent color palette for both attributes
    const secondColorScale = d3
      .scaleOrdinal<string>()
      .domain(secondConditions)
      .range(d3.schemeCategory10);

    // Define shapeScale to ensure consistent shape ordering
    const shapeTypes = [
      "circle",
      "triangle",
      "diamond",
      "cross",
      "star",
      "wye",
      "hexagon",
      "pentagon",
      "square",
      "triangle-down",
      "trapezoid",
      "rhombus",
      "plus",
      "octagon",
    ];

    // Instead of sorting alphabetically, use the original order from the data
    // This ensures we maintain a consistent mapping between conditions and shapes
    const shapeScale = d3
      .scaleOrdinal<string>()
      .domain(conditions)
      .range(shapeTypes);

    // For second attribute, create a separate scale to ensure proper shape ordering
    const secondShapeScale = d3
      .scaleOrdinal<string>()
      .domain(secondConditions)
      .range(shapeTypes);

    // Define shape generator function based on shape type with adjusted sizes
    const getShape = (shapeType: string, size: number = CHART_SHAPE_SIZE) => {
      let path;
      let radius;
      let angle;
      let x;
      let y;
      let width;
      let height;

      switch (shapeType) {
        case "circle":
          return d3
            .symbol()
            .type(d3.symbolCircle)
            .size(size * 0.5)();
        case "square":
          return d3
            .symbol()
            .type(d3.symbolSquare)
            .size(size * 0.5)();
        case "triangle":
          // Reduce triangle size to make it visually balanced with other shapes
          return d3
            .symbol()
            .type(d3.symbolTriangle)
            .size(size * 0.4)();
        case "cross":
          return d3
            .symbol()
            .type(d3.symbolCross)
            .size(size * 0.4)();
        case "diamond":
          return d3
            .symbol()
            .type(d3.symbolDiamond)
            .size(size * 0.4)();
        case "star":
          return d3
            .symbol()
            .type(d3.symbolStar)
            .size(size * 0.3)();
        case "wye":
          return d3
            .symbol()
            .type(d3.symbolWye)
            .size(size * 0.3)();
        case "hexagon":
          // Custom hexagon shape
          path = d3.path();
          radius = Math.sqrt(size / 5);
          for (let i = 0; i < 6; i++) {
            angle = (i * Math.PI) / 3;
            x = radius * Math.sin(angle);
            y = radius * Math.cos(angle);
            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          }
          path.closePath();
          return path.toString();
        case "pentagon":
          // Custom pentagon shape
          path = d3.path();
          radius = Math.sqrt(size / 5);
          for (let i = 0; i < 5; i++) {
            angle = (i * 2 * Math.PI) / 5 - Math.PI / 2; // Start at top
            x = radius * Math.cos(angle);
            y = radius * Math.sin(angle);
            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          }
          path.closePath();
          return path.toString();
        case "octagon":
          // Custom octagon shape
          path = d3.path();
          radius = Math.sqrt(size / 4);
          for (let i = 0; i < 8; i++) {
            angle = (i * Math.PI) / 4;
            x = radius * Math.cos(angle);
            y = radius * Math.sin(angle);
            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          }
          path.closePath();
          return path.toString();
        case "triangle-down":
          // Custom triangle pointing down
          path = d3.path();
          radius = Math.sqrt(size / 4);
          path.moveTo(0, radius);
          path.lineTo(-radius * 0.866, -radius * 0.5);
          path.lineTo(radius * 0.866, -radius * 0.5);
          path.closePath();
          return path.toString();
        case "trapezoid":
          // Custom trapezoid shape
          path = d3.path();
          width = Math.sqrt(size / 2);
          height = width * 0.8;
          path.moveTo(-width * 0.6, -height / 2);
          path.lineTo(width * 0.6, -height / 2);
          path.lineTo(width / 2, height / 2);
          path.lineTo(-width / 2, height / 2);
          path.closePath();
          return path.toString();
        case "rhombus":
          // Custom rhombus (diamond rotated 45 degrees)
          path = d3.path();
          radius = Math.sqrt(size / 3.5);
          path.moveTo(0, -radius);
          path.lineTo(radius * 0.7, 0);
          path.lineTo(0, radius);
          path.lineTo(-radius * 0.7, 0);
          path.closePath();
          return path.toString();
        case "plus": {
          // Custom plus shape
          path = d3.path();
          radius = Math.sqrt(size / 3);
          const arm = radius * 0.33;
          // Horizontal line
          path.moveTo(-radius, -arm);
          path.lineTo(-arm, -arm);
          path.lineTo(-arm, -radius);
          path.lineTo(arm, -radius);
          path.lineTo(arm, -arm);
          path.lineTo(radius, -arm);
          path.lineTo(radius, arm);
          path.lineTo(arm, arm);
          path.lineTo(arm, radius);
          path.lineTo(-arm, radius);
          path.lineTo(-arm, arm);
          path.lineTo(-radius, arm);
          path.closePath();
          return path.toString();
        }
        default:
          return d3.symbol().type(d3.symbolCircle).size(size)();
      }
    };

    // Add grid lines
    zoomContainerG
      .append("g")
      .attr("stroke", "#ebebeb")
      .call((g) =>
        g
          .append("g")
          .selectAll("line")
          .data(xScale.ticks())
          .join("line")
          .attr("x1", (d) => 0.5 + xScale(d))
          .attr("x2", (d) => 0.5 + xScale(d))
          .attr("y1", 0)
          .attr("y2", height)
      )
      .call((g) =>
        g
          .append("g")
          .selectAll("line")
          .data(yScale.ticks())
          .join("line")
          .attr("y1", (d) => 0.5 + yScale(d))
          .attr("y2", (d) => 0.5 + yScale(d))
          .attr("x1", 0)
          .attr("x2", width)
      );

    // Add axes
    zoomContainerG
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .call((g) => g.select(".domain").remove());

    zoomContainerG
      .append("g")
      .call(d3.axisLeft(yScale))
      .call((g) => g.select(".domain").remove());

    // Add axis labels
    zoomContainerG
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .style("fill", "currentColor")
      .text(`PC1: ${metadata.PC1_variance}% variance`);

    zoomContainerG
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -40)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .style("fill", "currentColor")
      .text(`PC2: ${metadata.PC2_variance}% variance`);

    // Add title
    zoomContainerG
      .append("text")
      .attr("x", width / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "currentColor");
    // .text(`ntop = ${metadata.ntop}`);

    // Define handleToggleVisibility outside the conditional blocks
    let handleToggleVisibility: (condition: string, isVisible: boolean) => void;

    // Add data points - modify to support both shape and color when both attributes are provided
    if (
      secondAttribute &&
      secondConditionIndex !== -1 &&
      secondAttributeDisplayValues &&
      attributeDisplayValues !== secondAttributeDisplayValues
    ) {
      // Combined display - one attribute for shape, one for color
      const useShapeForFirst = attributeDisplayValues === "shape";
      const useColorForFirst = attributeDisplayValues === "color";

      const pointsSelection = zoomContainerG
        .selectAll("path.data-point")
        .data(pcaData)
        .enter()
        .append("path")
        .attr("class", "data-point")
        .attr("d", (d) => {
          // Use useShapeForFirst here
          const shapeAttribute = useShapeForFirst
            ? d[conditionIndex]
            : d[secondConditionIndex];
          const shapeType = useShapeForFirst
            ? shapeScale(shapeAttribute as string)
            : secondShapeScale(shapeAttribute as string);
          return getShape(shapeType);
        })
        .attr(
          "transform",
          (d) =>
            `translate(${xScale(d[pc1Index] as number)}, ${yScale(
              d[pc2Index] as number
            )})`
        )
        .style("fill", (d) => {
          // Ensure useColorForFirst is used here
          if (!useColorForFirst && secondAttributeDisplayValues === "shape") {
            return "#111827";
          }

          const colorAttribute = useColorForFirst
            ? formatDisplayValue(d[conditionIndex])
            : formatDisplayValue(d[secondConditionIndex]);
          return useColorForFirst
            ? colorScale(colorAttribute as string)
            : secondColorScale(colorAttribute as string);
        })
        .style("stroke", "white")
        .style("stroke-width", 0.5)
        .on("mouseover", function (event, d) {
          showTooltip(
            event,
            `
            <strong>Sample:</strong> ${
              sampleIndex >= 0 ? formatDisplayValue(d[sampleIndex]) : "NA"
            }<br/>
            <strong>${attribute}:</strong> ${formatDisplayValue(
              d[conditionIndex]
            )}<br/>
            <strong>${secondAttribute}:</strong> ${formatDisplayValue(
              d[secondConditionIndex]
            )}<br/>
            <strong>PC1:</strong> ${
              typeof d[pc1Index] === "number"
                ? d[pc1Index].toFixed(3)
                : formatDisplayValue(d[pc1Index])
            }<br/>
            <strong>PC2:</strong> ${
              typeof d[pc2Index] === "number"
                ? d[pc2Index].toFixed(3)
                : formatDisplayValue(d[pc2Index])
            }
          `
          );
          // Determine shape type for this data point
          const shapeAttribute = useShapeForFirst
            ? formatDisplayValue(d[conditionIndex])
            : formatDisplayValue(d[secondConditionIndex]);
          const shapeType = useShapeForFirst
            ? shapeScale(shapeAttribute as string)
            : secondShapeScale(shapeAttribute as string);
          // Make the same shape larger
          d3.select(this)
            .attr("d", getShape(shapeType, CHART_SHAPE_SIZE_HOVER))
            .style("stroke-width", 1);
        })
        .on("mousemove", moveTooltip)
        .on("mouseout", function (event, d) {
          hideTooltip();
          // Get the original shape type again
          const shapeAttribute = useShapeForFirst
            ? formatDisplayValue(d[conditionIndex])
            : formatDisplayValue(d[secondConditionIndex]);
          const shapeType = useShapeForFirst
            ? shapeScale(shapeAttribute as string)
            : secondShapeScale(shapeAttribute as string);
          // Return to original size
          d3.select(this)
            .attr("d", getShape(shapeType, CHART_SHAPE_SIZE))
            .style("stroke-width", 0.5);
        });

      // Define the toggle visibility function for combined display
      handleToggleVisibility = (condition: string, isVisible: boolean) => {
        // We need to check both attributes to determine visibility
        pointsSelection
          .filter((d) => {
            if (useShapeForFirst) {
              return (
                formatDisplayValue(d[conditionIndex]) === condition ||
                formatDisplayValue(d[secondConditionIndex]) === condition
              );
            } else {
              return (
                formatDisplayValue(d[conditionIndex]) === condition ||
                formatDisplayValue(d[secondConditionIndex]) === condition
              );
            }
          })
          .style("opacity", isVisible ? 1 : 0)
          .style("pointer-events", isVisible ? "all" : "none");
      };
    } else if (attributeDisplayValues === "shape") {
      // Use shapes instead of circles
      const pointsSelection = zoomContainerG
        .selectAll("path.data-point")
        .data(pcaData)
        .enter()
        .append("path")
        .attr("class", "data-point")
        .attr("d", (d) =>
          getShape(shapeScale(formatDisplayValue(d[conditionIndex]) as string))
        )
        .attr(
          "transform",
          (d) =>
            `translate(${xScale(d[pc1Index] as number)}, ${yScale(
              d[pc2Index] as number
            )})`
        )
        .style("fill", "#111827")
        .style("stroke", "white")
        .style("stroke-width", 0.5)
        .on("mouseover", function (event, d) {
          showTooltip(
            event,
            `
            <strong>Sample:</strong> ${
              sampleIndex >= 0 ? formatDisplayValue(d[sampleIndex]) : "NA"
            }<br/>
            <strong>Condition:</strong> ${formatDisplayValue(
              d[conditionIndex]
            )}<br/>
            <strong>PC1:</strong> ${
              typeof d[pc1Index] === "number"
                ? d[pc1Index].toFixed(3)
                : formatDisplayValue(d[pc1Index])
            }<br/>
            <strong>PC2:</strong> ${
              typeof d[pc2Index] === "number"
                ? d[pc2Index].toFixed(3)
                : formatDisplayValue(d[pc2Index])
            }
          `
          );
          // Store the original shape type for this data point
          const shapeType = shapeScale(
            formatDisplayValue(d[conditionIndex]) as string
          );
          // Make the same shape larger
          d3.select(this)
            .attr("d", getShape(shapeType, CHART_SHAPE_SIZE_HOVER))
            .style("stroke-width", 1);
        })
        .on("mousemove", moveTooltip)
        .on("mouseout", function (event, d) {
          hideTooltip();
          // Get the original shape type again
          const shapeType = shapeScale(
            formatDisplayValue(d[conditionIndex]) as string
          );
          // Return to original size
          d3.select(this)
            .attr("d", getShape(shapeType, CHART_SHAPE_SIZE))
            .style("stroke-width", 0.5);
        });

      // Define the toggle visibility function for shapes
      handleToggleVisibility = (condition: string, isVisible: boolean) => {
        pointsSelection
          .filter((d) => formatDisplayValue(d[conditionIndex]) === condition)
          .style("opacity", isVisible ? 1 : 0)
          .style("pointer-events", isVisible ? "all" : "none");
      };
    } else {
      // Original circle implementation
      const pointsSelection = zoomContainerG
        .selectAll("circle")
        .data(pcaData)
        .enter()
        .append("circle")
        .attr("cx", (d) => xScale(d[pc1Index] as number))
        .attr("cy", (d) => yScale(d[pc2Index] as number))
        .attr("r", 4)
        .style("fill", (d) =>
          colorScale(formatDisplayValue(d[conditionIndex]) as string)
        )
        .style("stroke", "white")
        .style("stroke-width", 0.5)
        .on("mouseover", function (event, d) {
          showTooltip(
            event,
            `
            <strong>Sample:</strong> ${
              sampleIndex >= 0 ? formatDisplayValue(d[sampleIndex]) : "NA"
            }<br/>
            <strong>Condition:</strong> ${formatDisplayValue(
              d[conditionIndex]
            )}<br/>
            <strong>PC1:</strong> ${
              typeof d[pc1Index] === "number"
                ? d[pc1Index].toFixed(3)
                : formatDisplayValue(d[pc1Index])
            }<br/>
            <strong>PC2:</strong> ${
              typeof d[pc2Index] === "number"
                ? d[pc2Index].toFixed(3)
                : formatDisplayValue(d[pc2Index])
            }
          `
          );
          d3.select(this).attr("r", 6).style("stroke-width", 1);
        })
        .on("mousemove", moveTooltip)
        .on("mouseout", function () {
          hideTooltip();
          d3.select(this).attr("r", 4).style("stroke-width", 0.5);
        });

      // Define the toggle visibility function for circles
      handleToggleVisibility = (condition: string, isVisible: boolean) => {
        pointsSelection
          .filter((d) => formatDisplayValue(d[conditionIndex]) === condition)
          .style("opacity", isVisible ? 1 : 0)
          .style("pointer-events", isVisible ? "all" : "none");
      };
    }

    // Calculate total legend height with adjusted spacing
    const legendItemHeight = 25;
    const legendGap = 55;
    const titleHeight = 20;

    const totalLegendHeight =
      conditions.length * legendItemHeight +
      (secondConditions.length > 0
        ? secondConditions.length * legendItemHeight + legendGap + titleHeight
        : 0);

    // adjust yOffset depending on whether there is one or two attributes
    let yOffset = 0;
    if (secondConditions.length > 0) {
      // both attributes
      yOffset = (height - totalLegendHeight) / 2 > 0 ? 0 : 10;
    } else {
      // only one attribute
      yOffset = -10;
    }

    // Set up controls container with adjusted positioning
    const controlsContainer = controlsSvg
      .append("g")
      .attr(
        "transform",
        `translate(40, ${Math.max(
          10,
          (height - totalLegendHeight) / 2 + yOffset
        )})`
      );

    // Create a clip path for scrolling when legend is too tall
    const maxLegendHeight = isZoomed ? Math.min(800, height - 50) : 350;
    const clipHeight = Math.min(totalLegendHeight, maxLegendHeight);
    const legendPaddingTop = 15;

    // Add clip path definition to control scrolling area
    controlsSvg
      .append("defs")
      .append("clipPath")
      .attr("id", clipPathIdRef.current)
      .append("rect")
      .attr("x", -50)
      .attr("y", -legendPaddingTop)
      .attr("width", 200)
      .attr("height", clipHeight + legendPaddingTop * 2);
    // Create container for legend with clip path applied
    const scrollContainer = controlsContainer
      .append("g")
      .attr("clip-path", `url(#${clipPathIdRef.current})`);

    // Since we can't directly render React components in D3, we'll manually render
    // similar logic to what the Legend component would do
    const legendGroup = scrollContainer
      .append("g")
      .attr("class", "conditions-legend")
      .attr("transform", `translate(0, ${legendPaddingTop})`); // always add padding top

    // Add scroll functionality when legend is taller than max height (bất kể zoom hay không)
    if (totalLegendHeight > maxLegendHeight) {
      // Create scroll background
      controlsContainer
        .append("rect")
        .attr("x", -14)
        .attr("y", -10)
        .attr("width", 125)
        .attr("height", maxLegendHeight + 20)
        .attr("fill", "transparent")
        .attr("rx", 4);

      // Variable to track scroll position
      let scrollPos = 0;
      const maxScroll = totalLegendHeight - maxLegendHeight;

      // Add scroll interaction using mouse wheel
      controlsSvg.on("wheel", function (event) {
        event.preventDefault();
        // Calculate new scroll position with limits
        scrollPos = Math.min(Math.max(0, scrollPos + event.deltaY), maxScroll);
        // Apply transform to the legend group for scrolling
        legendGroup.attr(
          "transform",
          `translate(0, ${legendPaddingTop - scrollPos})`
        );
      });
    }

    // Always show attribute name for all cases
    legendGroup
      .append("text")
      .attr("x", -35)
      .attr("y", -10)
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "currentColor")
      .text(attribute);

    const visibilityState: Record<string, boolean> = {};
    conditions.forEach((condition) => {
      visibilityState[condition] = true;
    });

    // Add second conditions to visibility state
    secondConditions.forEach((condition) => {
      visibilityState[condition] = true;
    });

    // Modify legend to show both attributes when both are available
    if (
      secondAttribute &&
      secondConditionIndex !== -1 &&
      secondAttributeDisplayValues &&
      attributeDisplayValues !== secondAttributeDisplayValues
    ) {
      const useShapeForFirst = attributeDisplayValues === "shape";

      conditions.forEach((condition, i) => {
        const legendRow = legendGroup
          .append("g")
          .attr("transform", `translate(0, ${i * 25 + 10})`);

        // Add checkbox for toggling visibility
        legendRow
          .append("rect")
          .attr("x", -35)
          .attr("y", -7)
          .attr("width", 16)
          .attr("height", 16)
          .attr("rx", 2)
          .attr("ry", 2)
          .style("fill", "hsl(var(--background))")
          .style("stroke", "hsl(var(--border))")
          .style("stroke-width", 1)
          .style("cursor", "pointer")
          .on("click", function () {
            // Toggle visibility state
            visibilityState[condition] = !visibilityState[condition];

            // Call the toggle function cho data points
            handleToggleVisibility(condition, visibilityState[condition]);

            legendRow
              .select("g.checkmark svg path")
              .style(
                "visibility",
                visibilityState[condition] ? "visible" : "hidden"
              );
          });

        // Create checkmark group
        const checkmarkGroup = legendRow
          .append("g")
          .attr("class", "checkmark")
          .attr("transform", "translate(-27, 0)")
          .style("pointer-events", "none");

        // Add SVG checkmark
        checkmarkGroup
          .append("svg")
          .attr("width", 8)
          .attr("height", 8)
          .attr("viewBox", "0 0 8 9")
          .attr("x", -3)
          .attr("y", -3)
          .attr("fill", "none")
          .attr("pointer-events", "none")
          .append("path")
          .attr("fill-rule", "evenodd")
          .attr("clip-rule", "evenodd")
          .attr(
            "d",
            "M6.90237 2.26413C7.03254 2.39431 7.03254 2.60536 6.90237 2.73554L3.2357 6.40221C3.10553 6.53238 2.89447 6.53238 2.7643 6.40221L1.09763 4.73554C0.967456 4.60536 0.967456 4.39431 1.09763 4.26414C1.22781 4.13396 1.43886 4.13396 1.56904 4.26414L3 5.6951L6.43096 2.26413C6.56114 2.13396 6.77219 2.13396 6.90237 2.26413Z"
          )
          .style("fill", "currentColor")
          .style("visibility", "visible");

        if (useShapeForFirst) {
          // Add shape for first attribute
          legendRow
            .append("path")
            .attr("class", "shape-icon")
            .attr("d", getShape(shapeScale(condition), LEGEND_SHAPE_SIZE))
            .attr("transform", "translate(0, 0)")
            .style("fill", "transparent")
            .style("stroke", "currentColor")
            .style("stroke-width", 1)
            .style("cursor", "default");
        } else {
          // Add rounded square for color display instead of circle
          legendRow
            .append("rect")
            .attr("x", -8)
            .attr("y", -8)
            .attr("width", 20)
            .attr("height", 20)
            .attr("rx", 3) // rounded corners
            .attr("ry", 3) // rounded corners
            .style("fill", colorScale(condition))
            .style("stroke", "hsl(var(--border))")
            .style("stroke-width", 0.5)
            .style("cursor", "default");
        }

        legendRow
          .append("text")
          .attr("x", 20)
          .attr("y", 4)
          .style("dominant-baseline", "middle")
          .style("font-size", "12px")
          .style("fill", "hsl(var(--foreground))")
          .text(truncateText(formatDisplayValue(condition), 15));
      });

      // Second attribute legend
      legendGroup
        .append("text")
        .attr("x", -35)
        .attr("y", conditions.length * 25 + 12)
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "currentColor")
        .text(secondAttribute);

      secondConditions.forEach((condition, i) => {
        const legendRow = legendGroup
          .append("g")
          .attr(
            "transform",
            `translate(0, ${conditions.length * 25 + 30 + i * 25})`
          );

        // Add checkbox for toggling visibility
        legendRow
          .append("rect")
          .attr("x", -35)
          .attr("y", -7)
          .attr("width", 16)
          .attr("height", 16)
          .attr("rx", 2)
          .attr("ry", 2)
          .style("fill", "hsl(var(--background))")
          .style("stroke", "hsl(var(--border))")
          .style("stroke-width", 1)
          .style("cursor", "pointer")
          .on("click", function () {
            // Toggle visibility state
            visibilityState[condition] = !visibilityState[condition];

            // Call the toggle function cho data points
            handleToggleVisibility(condition, visibilityState[condition]);

            legendRow
              .select("g.checkmark svg path")
              .style(
                "visibility",
                visibilityState[condition] ? "visible" : "hidden"
              );

            // Update the legend item opacity
            const legendItem2 = legendRow.select(
              attributeDisplayValues === "shape" ? "path.shape-icon" : "rect"
            );
            if (!legendItem2.empty()) {
              legendItem2.style(
                "opacity",
                visibilityState[condition] ? 1 : 0.4
              );
            }
          });

        // Create checkmark group
        const checkmarkGroup = legendRow
          .append("g")
          .attr("class", "checkmark")
          .attr("transform", "translate(-27, 0)")
          .style("pointer-events", "none");

        // Add SVG checkmark
        checkmarkGroup
          .append("svg")
          .attr("width", 8)
          .attr("height", 8)
          .attr("viewBox", "0 0 8 9")
          .attr("x", -3)
          .attr("y", -3)
          .attr("fill", "none")
          .attr("pointer-events", "none")
          .append("path")
          .attr("fill-rule", "evenodd")
          .attr("clip-rule", "evenodd")
          .attr(
            "d",
            "M6.90237 2.26413C7.03254 2.39431 7.03254 2.60536 6.90237 2.73554L3.2357 6.40221C3.10553 6.53238 2.89447 6.53238 2.7643 6.40221L1.09763 4.73554C0.967456 4.60536 0.967456 4.39431 1.09763 4.26414C1.22781 4.13396 1.43886 4.13396 1.56904 4.26414L3 5.6951L6.43096 2.26413C6.56114 2.13396 6.77219 2.13396 6.90237 2.26413Z"
          )
          .style("fill", "currentColor")
          .style("visibility", "visible");

        if (!useShapeForFirst) {
          // Add shape for second attribute - use the SAME shapeScale as the first attribute
          legendRow
            .append("path")
            .attr("class", "shape-icon")
            .attr("d", getShape(secondShapeScale(condition), LEGEND_SHAPE_SIZE)) // Use secondShapeScale here
            .attr("transform", "translate(0, 0)")
            .style(
              "fill",
              secondAttributeDisplayValues === "shape"
                ? "transparent"
                : secondColorScale(condition)
            )
            .style("stroke", "currentColor")
            .style("stroke-width", 1)
            .style("cursor", "default");
        } else {
          // Add rounded square with color for second attribute
          legendRow
            .append("rect")
            .attr("x", -8)
            .attr("y", -8)
            .attr("width", 20)
            .attr("height", 20)
            .attr("rx", 3)
            .attr("ry", 3)
            .style("fill", secondColorScale(condition))
            .style("stroke", "hsl(var(--border))")
            .style("stroke-width", 0.5)
            .style("cursor", "default");
        }

        legendRow
          .append("text")
          .attr("x", 20)
          .attr("y", 4)
          .style("dominant-baseline", "middle")
          .style("font-size", "12px")
          .style("fill", "hsl(var(--foreground))")
          .text(truncateText(formatDisplayValue(condition), 15));
      });
    } else if (controlsPosition === "inline") {
      // Position legend items more compactly
      conditions.forEach((condition, i) => {
        const legendRow = legendGroup
          .append("g")
          .attr(
            "transform",
            `translate(0, ${i * 25 + (secondConditions.length > 0 ? 10 : 5)})`
          );

        // Add checkbox for toggling visibility
        legendRow
          .append("rect")
          .attr("x", -35)
          .attr("y", -7)
          .attr("width", 16)
          .attr("height", 16)
          .attr("rx", 2)
          .attr("ry", 2)
          .style("fill", "hsl(var(--background))")
          .style("stroke", "hsl(var(--border))")
          .style("stroke-width", 1)
          .style("cursor", "pointer")
          .on("click", function () {
            // Toggle visibility state
            visibilityState[condition] = !visibilityState[condition];

            // Call the toggle function cho data points
            handleToggleVisibility(condition, visibilityState[condition]);

            legendRow
              .select("g.checkmark svg path")
              .style(
                "visibility",
                visibilityState[condition] ? "visible" : "hidden"
              );
          });

        // Create checkmark group
        const checkmarkGroup = legendRow
          .append("g")
          .attr("class", "checkmark")
          .attr("transform", "translate(-27, 0)")
          .style("pointer-events", "none");

        // Add SVG checkmark
        checkmarkGroup
          .append("svg")
          .attr("width", 8)
          .attr("height", 8)
          .attr("viewBox", "0 0 8 9")
          .attr("x", -3)
          .attr("y", -3)
          .attr("fill", "none")
          .attr("pointer-events", "none")
          .append("path")
          .attr("fill-rule", "evenodd")
          .attr("clip-rule", "evenodd")
          .attr(
            "d",
            "M6.90237 2.26413C7.03254 2.39431 7.03254 2.60536 6.90237 2.73554L3.2357 6.40221C3.10553 6.53238 2.89447 6.53238 2.7643 6.40221L1.09763 4.73554C0.967456 4.60536 0.967456 4.39431 1.09763 4.26414C1.22781 4.13396 1.43886 4.13396 1.56904 4.26414L3 5.6951L6.43096 2.26413C6.56114 2.13396 6.77219 2.13396 6.90237 2.26413Z"
          )
          .style("fill", "currentColor")
          .style("visibility", "visible");

        if (attributeDisplayValues === "shape") {
          // Add shape instead of circle
          legendRow
            .append("path")
            .attr("class", "shape-icon")
            .attr("d", getShape(shapeScale(condition), LEGEND_SHAPE_SIZE))
            .attr("transform", "translate(0, 0)")
            .style("fill", "transparent")
            .style("stroke", "currentColor")
            .style("stroke-width", 1)
            .style("cursor", "default");
        } else {
          // Add rounded square for color display instead of circle
          legendRow
            .append("rect")
            .attr("x", -8)
            .attr("y", -8)
            .attr("width", 20)
            .attr("height", 20)
            .attr("rx", 3) // rounded corners
            .attr("ry", 3) // rounded corners
            .style("fill", colorScale(condition))
            .style("stroke", "hsl(var(--border))")
            .style("stroke-width", 0.5)
            .style("cursor", "default");
        }

        legendRow
          .append("text")
          .attr("x", 20) // Closer to circle
          .attr("y", 4)
          .style("dominant-baseline", "middle")
          .style("font-size", "12px") // Smaller font
          .style("fill", "hsl(var(--foreground))")
          .text(truncateText(formatDisplayValue(condition), 15)); // Truncate to 15 characters
      });
    } else {
      // Original legend code
      conditions.forEach((condition, i) => {
        const legendRow = legendGroup
          .append("g")
          .attr(
            "transform",
            `translate(0, ${i * 25 + (secondConditions.length > 0 ? 10 : 5)})`
          );

        // Add checkbox for toggling visibility
        legendRow
          .append("rect")
          .attr("x", -35)
          .attr("y", -7)
          .attr("width", 16)
          .attr("height", 16)
          .attr("rx", 2)
          .attr("ry", 2)
          .style("fill", "hsl(var(--background))")
          .style("stroke", "hsl(var(--border))")
          .style("stroke-width", 1)
          .style("cursor", "pointer")
          .on("click", function () {
            // Toggle visibility state
            visibilityState[condition] = !visibilityState[condition];

            // Call the toggle function cho data points
            handleToggleVisibility(condition, visibilityState[condition]);

            legendRow
              .select("g.checkmark svg path")
              .style(
                "visibility",
                visibilityState[condition] ? "visible" : "hidden"
              );
          });

        // Create checkmark group
        const checkmarkGroup = legendRow
          .append("g")
          .attr("class", "checkmark")
          .attr("transform", "translate(-27, 0)")
          .style("pointer-events", "none");

        // Add SVG checkmark
        checkmarkGroup
          .append("svg")
          .attr("width", 8)
          .attr("height", 8)
          .attr("viewBox", "0 0 8 9")
          .attr("x", -3)
          .attr("y", -3)
          .attr("fill", "none")
          .attr("pointer-events", "none")
          .append("path")
          .attr("fill-rule", "evenodd")
          .attr("clip-rule", "evenodd")
          .attr(
            "d",
            "M6.90237 2.26413C7.03254 2.39431 7.03254 2.60536 6.90237 2.73554L3.2357 6.40221C3.10553 6.53238 2.89447 6.53238 2.7643 6.40221L1.09763 4.73554C0.967456 4.60536 0.967456 4.39431 1.09763 4.26414C1.22781 4.13396 1.43886 4.13396 1.56904 4.26414L3 5.6951L6.43096 2.26413C6.56114 2.13396 6.77219 2.13396 6.90237 2.26413Z"
          )
          .style("fill", "currentColor")
          .style("visibility", "visible");

        if (attributeDisplayValues === "shape") {
          // Add shape instead of circle
          legendRow
            .append("path")
            .attr("class", "shape-icon")
            .attr("d", getShape(shapeScale(condition), LEGEND_SHAPE_SIZE))
            .attr("transform", "translate(0, 0)")
            .style("fill", "transparent")
            .style("stroke", "currentColor")
            .style("stroke-width", 1)
            .style("cursor", "default");
        } else {
          // Add rounded square for color display instead of circle
          legendRow
            .append("rect")
            .attr("x", -8)
            .attr("y", -8)
            .attr("width", 20)
            .attr("height", 20)
            .attr("rx", 3) // rounded corners
            .attr("ry", 3) // rounded corners
            .style("fill", colorScale(condition))
            .style("stroke", "hsl(var(--border))")
            .style("stroke-width", 0.5)
            .style("cursor", "default");
        }

        legendRow
          .append("text")
          .attr("x", 20)
          .attr("y", 4)
          .style("dominant-baseline", "middle")
          .style("font-size", "12px")
          .style("fill", "hsl(var(--foreground))")
          .text(truncateText(formatDisplayValue(condition), 15));
      });
    }

    // Add zoom button to controls
    if (onZoom) {
      controlsContainer
        .append("g")
        .attr("class", "zoom-control")
        .attr("transform", `translate(${width - 30}, 10)`)
        .append("rect")
        .attr("width", 24)
        .attr("height", 24)
        .attr("rx", 4)
        .attr("fill", "hsl(var(--background))")
        .attr("stroke", "hsl(var(--border))")
        .attr("cursor", "pointer")
        .on("click", onZoom);

      // Add zoom icon
      controlsContainer
        .select(".zoom-control")
        .append("path")
        .attr(
          "d",
          "M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42 2.89 2.87L15 21h6v-6zM15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42 2.89 2.87L15 21h6v-6z"
        )
        .attr("transform", "translate(4, 4) scale(0.7)")
        .attr("fill", "hsl(var(--foreground))");
    }
  }, [
    data,
    isZoomed,
    attribute,
    type,
    attributeDisplayValues,
    secondAttribute,
    secondAttributeDisplayValues,
    fullWidth,
    controlsPosition,
  ]); // Add secondAttribute and secondAttributeDisplayValues to dependencies

  // Handle initial render and data changes
  useEffect(() => {
    if (data) {
      createPlot();
    }
  }, [data, createPlot]);

  // Add resize observer in a separate useEffect
  useEffect(() => {
    if (!pcaRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (data) {
        createPlot();
      }
    });

    if (pcaRef.current.parentElement) {
      resizeObserver.observe(pcaRef.current.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [pcaRef, data, createPlot]);

  // Function to truncate text with ellipsis
  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  if (loading) {
    return (
      <div className={isZoomed ? "h-[600px] p-4" : "h-[400px] p-4"}>
        <Spinner center className="flex-col" label="Rendering..." />
      </div>
    );
  }

  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!data) return <div className="p-4">No data available</div>;

  return (
    <div
      className={`h-full w-full ${
        fullWidth ? "min-h-[700px]" : ""
      } overflow-visible`}
    >
      <div
        className={`flex ${
          isZoomed ? "flex-row items-start" : "flex-col md:flex-row"
        } ${
          controlsPosition === "inline" ? "gap-0" : "gap-1"
        } items-start justify-start ${fullWidth ? "h-full" : ""}`}
      >
        <div className={`${fullWidth ? "h-full" : ""} w-full overflow-auto`}>
          <svg ref={pcaRef} className="max-w-full" />
        </div>
        <div
          className={
            controlsPosition === "inline"
              ? "ml-[-20px] flex h-full items-start pt-4"
              : "flex h-full items-start pt-4"
          }
        >
          <svg ref={controlsRef} />
        </div>
      </div>
    </div>
  );
};

export default PCAPlot;
