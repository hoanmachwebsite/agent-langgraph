"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Ref } from "react";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";

import { Combobox } from "../ui/combobox";

import { Icon } from "@/components/icon";
import { formatGeneCountValue } from "@/lib/utils";
import { TOTAL_COLOR_SHOW_L1000_CHART } from "@/lib/contants";

interface DataPoint {
  sig_id: string;
  drug: string;
  perturbation_id: string;
  cell: string;
  dose: number;
  time: number;
  phase: string;
  batch: string;
  MOA: string;
  similarity_score: number;
  x: number;
  y: number;
}

interface L1000ChartTypeProps {
  allData: Record<string, any>[];
  refChart: Ref<HTMLDivElement>;
}

const L1000Chart: React.FC<L1000ChartTypeProps> = ({ allData, refChart }) => {
  // Add this check at the very beginning of the component
  if (!allData || allData.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg">
        <p className="text-gray-500">No data available to display.</p>
      </div>
    );
  }

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const needsRedrawRef = useRef<boolean>(true);

  // State for shape and color dropdowns
  const [selectedShapeCategory, setSelectedShapeCategory] = useState("time");

  const [selectedShapes] = useState(new Set());
  const [selectedColorCategory, setSelectedColorCategory] =
    useState("similarity_score");

  // Add drug search state
  const [selectedDrug, setSelectedDrug] = useState("");

  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });

  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 800,
    height: 600,
  });

  // Canvas dimensions - auto-calculated based on container
  const margin = { top: 20, right: 20, bottom: 20, left: 20 }; // Minimal margins
  const chartWidth = canvasDimensions.width - margin.left - margin.right;
  const chartHeight = canvasDimensions.height - margin.top - margin.bottom;

  // Generate drug options for the combobox
  const drugOptions = useMemo(() => {
    const uniqueDrugs = [...new Set(allData.map((d) => d.drug))].sort();
    return uniqueDrugs.map((drug) => ({
      value: drug,
      label: drug,
    }));
  }, [allData]);

  // Auto-resize canvas based on container dimensions
  useEffect(() => {
    const updateCanvasSize = () => {
      if (chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        const containerWidth = rect.width - 32; // Subtract padding (16px * 2)
        const containerHeight = rect.height - 32; // Subtract padding (16px * 2)

        setCanvasDimensions({
          width: Math.max(400, containerWidth), // Minimum width
          height: Math.max(300, containerHeight), // Minimum height
        });
      }
    };

    // Initial size calculation
    updateCanvasSize();

    // Add resize listener
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    // Fallback for window resize
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, []);

  const categories = [
    { label: "Time", value: "time" },
    { label: "Dose", value: "dose" },
    { label: "P-Value", value: "pValue" },
  ];

  const colorCategories = [
    { label: "Similarity Score", value: "similarity_score" },
    { label: "Batch", value: "batch" },
    { label: "Cell", value: "cell" },
    { label: "MOA", value: "MOA" },
    { label: "Drug Discovery Phase", value: "phase" },
  ];

  // Memoize dose ranges calculation
  const doseRanges = useMemo(() => {
    const doses = allData.map((d: any) => d.dose).filter((d: any) => d != null);
    const minDose = Math.min(...doses);
    const maxDose = Math.max(...doses);
    const doseStep = (maxDose - minDose) / 6;

    const ranges = [];
    for (let i = 0; i < 6; i++) {
      const min = minDose + i * doseStep;
      const max = minDose + (i + 1) * doseStep;
      ranges.push({ min, max });
    }
    return ranges;
  }, [allData]);

  // Generate color scale based on selected color category
  const colorScale = useMemo(() => {
    const colors = [
      "#F97316",
      "#22C55E",
      "#3B82F6",
      "#EAB308",
      "#8B5CF6",
      "#06B6D4",
      "#D946EF",
      "#6366F1",
      "#EC4899",
      "#10B981",
      "#A855F7",
      "#14B8A6",
      "#F43F5E",
      "#AE5E5E",
      "#06B6D4",
      "#84CC16",
      "#71933D",
      "#6B7280",
      "#C98A8A",
    ];

    if (selectedColorCategory === "similarity_score") {
      // Continuous color scale for similarity score
      const scores = allData.map((d: any) => d.similarity_score);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);

      return (value: number) => {
        const normalized = (value - minScore) / (maxScore - minScore);
        // Create a gradient from red (low) to green (high)
        const red = Math.floor(255 * (1 - normalized));
        const green = Math.floor(255 * normalized);
        return `rgb(${red}, ${green}, 100)`;
      };
    } else {
      // Categorical color scale - select values based on similarity_score
      const uniqueValues = [
        ...new Set(allData.map((d) => d[selectedColorCategory])),
      ];

      // Calculate average similarity_score for each category value
      const valueScores = uniqueValues.map((value: any) => {
        const pointsForValue = allData.filter(
          (d: any) => d[selectedColorCategory] === value
        );
        const avgScore =
          pointsForValue.reduce(
            (sum: number, d: any) => sum + d.similarity_score,
            0
          ) / pointsForValue.length;
        return { value, avgScore };
      });

      // Separate positive and negative scores
      const positiveScores = valueScores
        .filter((item) => item.avgScore > 0)
        .sort((a, b) => b.avgScore - a.avgScore);
      const negativeScores = valueScores
        .filter((item) => item.avgScore < 0)
        .sort((a, b) => a.avgScore - b.avgScore);

      const selectedValues = [];

      const availableColors = TOTAL_COLOR_SHOW_L1000_CHART;
      const maxPositiveCount = Math.min(
        10,
        positiveScores.length,
        Math.floor(availableColors * 0.6)
      );
      const maxNegativeCount = Math.min(
        9,
        negativeScores.length,
        availableColors - maxPositiveCount
      );

      // Take top positive scores (highest)
      selectedValues.push(
        ...positiveScores.slice(0, maxPositiveCount).map((item) => item.value)
      );

      // Take negative scores (lowest)
      selectedValues.push(
        ...negativeScores.slice(0, maxNegativeCount).map((item) => item.value)
      );

      const colorMap = new Map();

      // Assign colors to selected values
      selectedValues.forEach((value, index) => {
        if (index < colors.length) {
          colorMap.set(value, colors[index]);
        }
      });

      // All other values get gray color
      const grayColor = "#9CA3AF";

      return (value: any) => {
        if (colorMap.has(value)) {
          return colorMap.get(value);
        }
        // Return gray for all values not in selected list
        return grayColor;
      };
    }
  }, [selectedColorCategory, allData]);

  // Generate color legend options
  const getColorLegend = useMemo(() => {
    if (selectedColorCategory === "similarity_score") {
      const scores = allData.map((d) => d.similarity_score);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      const step = (maxScore - minScore) / 5;

      return Array.from({ length: 6 }, (_, i) => {
        const value = minScore + i * step;
        return {
          label: value.toFixed(3),
          color: colorScale(value),
          value: value,
        };
      });
    } else {
      const uniqueValues = [
        ...new Set(allData.map((d: any) => d[selectedColorCategory])),
      ];

      // Calculate average similarity_score for each category value
      const valueScores = uniqueValues.map((value: any) => {
        const pointsForValue = allData.filter(
          (d: any) => d[selectedColorCategory] === value
        );
        const avgScore =
          pointsForValue.reduce(
            (sum: number, d: any) => sum + d.similarity_score,
            0
          ) / pointsForValue.length;
        return { value, avgScore };
      });

      // Separate positive and negative scores
      const positiveScores = valueScores
        .filter((item) => item.avgScore > 0)
        .sort((a, b) => b.avgScore - a.avgScore);
      const negativeScores = valueScores
        .filter((item) => item.avgScore < 0)
        .sort((a, b) => a.avgScore - b.avgScore);

      const selectedValues = [];

      const availableColors = TOTAL_COLOR_SHOW_L1000_CHART;
      const maxPositiveCount = Math.min(
        10,
        positiveScores.length,
        Math.floor(availableColors * 0.6)
      );
      const maxNegativeCount = Math.min(
        9,
        negativeScores.length,
        availableColors - maxPositiveCount - 1
      );

      // Take top positive scores (highest)
      selectedValues.push(
        ...positiveScores.slice(0, maxPositiveCount).map((item) => item.value)
      );

      // Take negative scores (lowest)
      selectedValues.push(
        ...negativeScores.slice(0, maxNegativeCount).map((item) => item.value)
      );

      const legendItems: Array<{
        label: string;
        color: string;
        value: any;
        tooltip?: string;
      }> = [];

      // Add selected values
      selectedValues.forEach((value: any) => {
        const color = colorScale(value);
        const grayColor = "#9CA3AF";

        const isDuplicateColor = legendItems.some(
          (item) => item.color === color
        );
        const isSimilarToGray = color === grayColor;

        if (!isDuplicateColor && !isSimilarToGray) {
          legendItems.push({
            label: value,
            color: color,
            value: value,
          });
        }
      });

      // Add "Other" category if there are more values than selected
      if (uniqueValues.length > selectedValues.length) {
        legendItems.push({
          label: "Other",
          color: "#9CA3AF",
          value: "other",
          tooltip: "All drugs not in Most Similar or Most Opposite.",
        });
      }

      return legendItems;
    }
  }, [selectedColorCategory, colorScale, allData]);

  const similarityLegendData = useMemo(() => {
    if (selectedColorCategory !== "similarity_score" || allData.length === 0) {
      return null;
    }
    const scores = allData.map((d) => d.similarity_score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    // Number of divisions (5 divisions will create 6 lines)
    const numIntervals = 4;
    const stepValue = (maxScore - minScore) / numIntervals;

    // Create an array of value points from high to low
    const steps = Array.from({ length: numIntervals + 1 }, (_, i) => {
      const value = maxScore - i * stepValue;
      return {
        value: value,
        label: value.toFixed(2), // Round to 2 decimal places
      };
    });

    return {
      minScore,
      maxScore,
      minColor: colorScale(minScore),
      maxColor: colorScale(maxScore),
      steps, // Array of split points
    };
  }, [selectedColorCategory, allData, colorScale]);

  // Generate shape options based on selected category
  const getShapeOptions = useMemo(() => {
    if (selectedShapeCategory === "time") {
      const uniqueTimes = [...new Set(allData.map((d) => d.time))].sort(
        (a, b) => a - b
      );
      return uniqueTimes.map((time) => {
        let icon;
        if (time === 6)
          icon = <Icon name="squareIcon" width={16} height={17} />;
        else if (time === 24)
          icon = <Icon name="circleIcon" width={16} height={17} />;
        else if (time === 48)
          icon = <Icon name="crossIcon" width={16} height={17} />;
        return { label: `${time}h`, value: time, icon };
      });
    } else if (selectedShapeCategory === "dose") {
      return doseRanges.map((range, i) => ({
        label: `${range.min.toFixed(1)} to ${range.max.toFixed(1)}`,
        value: `${range.min}-${range.max}`,
        icon:
          i === 0 ? (
            <Icon name="squareIcon" width={16} height={17} />
          ) : i === 1 ? (
            <Icon name="circleIcon" width={16} height={17} />
          ) : i === 2 ? (
            <Icon name="crossIcon" width={16} height={17} />
          ) : i === 3 ? (
            <Icon name="xIcon" width={16} height={17} />
          ) : i === 4 ? (
            <Icon name="diamondIcon" width={16} height={17} />
          ) : i === 5 ? (
            <Icon name="triangleIcon" width={16} height={17} />
          ) : (
            <Icon name="triangleIcon" width={16} height={17} />
          ),
      }));
    } else if (selectedShapeCategory === "pValue") {
      return [
        {
          label: "0.00 to 0.001",
          value: "0-0.001",
          icon: <Icon name="squareIcon" width={16} height={17} />,
        },
        {
          label: "0.001 to 0.01",
          value: "0.001-0.01",
          icon: <Icon name="circleIcon" width={16} height={17} />,
        },
        {
          label: "0.01 to 0.05",
          value: "0.01-0.05",
          icon: <Icon name="crossIcon" width={16} height={17} />,
        },
        {
          label: "0.05 to 0.1",
          value: "0.05-0.1",
          icon: <Icon name="xIcon" width={16} height={17} />,
        },
        {
          label: "0.1 to 1",
          value: "0.1-1",
          icon: <Icon name="diamondIcon" width={16} height={17} />,
        },
      ];
    }
    return [];
  }, [selectedShapeCategory, doseRanges, allData]);

  // Optimized filtering with early returns
  const filteredData = useMemo(() => {
    let data = allData;

    // Filter by selected shapes
    if (selectedShapes.size > 0) {
      const shapesArray = Array.from(selectedShapes);

      data = data.filter((item: any) => {
        if (selectedShapeCategory === "time") {
          return shapesArray.includes(item.time);
        } else if (selectedShapeCategory === "dose") {
          return shapesArray.some((range: any) => {
            const [min, max] = range.split("-").map(Number) as [number, number];
            return item.dose >= min && item.dose <= max;
          });
        } else if (selectedShapeCategory === "pValue") {
          // Generate consistent p-value based on item properties
          const seed =
            item.drug.charCodeAt(0) + item.cell.charCodeAt(0) + item.time;
          const pValue = (Math.sin(seed) * 0.5 + 0.5) * 0.2;
          return shapesArray.some((range: any) => {
            const [min, max] = range.split("-").map(Number) as [number, number];
            return pValue >= min && pValue <= max;
          });
        }
        return true;
      });
    }

    return data;
  }, [selectedShapeCategory, selectedShapes, allData]);

  // Memoize scales calculation
  const scales = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        xScale: (x: number) => x,
        yScale: (y: number) => y,
        xExtent: [0, 1],
        yExtent: [0, 1],
        xInvert: (px: number) => px,
        yInvert: (py: number) => py,
      };
    }

    const xExtent = [
      Math.min(...filteredData.map((d: any) => d.x)),
      Math.max(...filteredData.map((d: any) => d.x)),
    ] as any;
    const yExtent = [
      Math.min(...filteredData.map((d: any) => d.y)),
      Math.max(...filteredData.map((d: any) => d.y)),
    ] as any;

    // Add some padding
    const xPadding = (xExtent[1] - xExtent[0]) * 0.05;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.05;

    xExtent[0] -= xPadding;
    xExtent[1] += xPadding;
    yExtent[0] -= yPadding;
    yExtent[1] += yPadding;

    const xScale = (x: number) =>
      ((x - xExtent[0]) / (xExtent[1] - xExtent[0])) * chartWidth;
    const yScale = (y: number) =>
      chartHeight -
      ((y - yExtent[0]) / (yExtent[1] - yExtent[0])) * chartHeight;
    const xInvert = (px: number) =>
      (px / chartWidth) * (xExtent[1] - xExtent[0]) + xExtent[0];
    const yInvert = (py: number) =>
      ((chartHeight - py) / chartHeight) * (yExtent[1] - yExtent[0]) +
      yExtent[0];

    return { xScale, yScale, xExtent, yExtent, xInvert, yInvert };
  }, [filteredData, chartWidth, chartHeight]);

  // Check if a point belongs to the selected drug
  const isSelectedDrugPoint = useCallback(
    (item: any) => {
      return selectedDrug && item.drug === selectedDrug;
    },
    [selectedDrug]
  );

  // Memoize point style calculations
  const pointStyles = useMemo(() => {
    const styleMap = new Map();

    filteredData.forEach((item) => {
      let shape = "circle";

      // Determine shape based on selected shape category
      if (selectedShapeCategory === "time") {
        switch (item.time) {
          case 6:
            shape = "square";
            break;
          case 24:
            shape = "circle";
            break;
          case 48:
            shape = "cross";
            break;
          default:
            shape = "circle";
        }
      } else if (selectedShapeCategory === "dose") {
        for (let i = 0; i < doseRanges.length; i++) {
          const range = doseRanges[i] as any;
          if (item.dose >= range.min && item.dose <= range.max) {
            const shapes = [
              "square",
              "circle",
              "cross",
              "x",
              "diamond",
              "triangle",
            ];
            shape = shapes[i] || "circle";
            break;
          }
        }
      } else if (selectedShapeCategory === "pValue") {
        // Generate consistent p-value based on item properties
        const seed =
          item.drug.charCodeAt(0) + item.cell.charCodeAt(0) + item.time;
        const pValue = (Math.sin(seed) * 0.5 + 0.5) * 0.2;

        if (pValue <= 0.001) {
          shape = "square";
        } else if (pValue <= 0.01) {
          shape = "circle";
        } else if (pValue <= 0.05) {
          shape = "cross";
        } else if (pValue <= 0.1) {
          shape = "x";
        } else {
          shape = "diamond";
        }
      }

      // Determine color based on selected color category
      const color = colorScale(item[selectedColorCategory]);

      // Check if this point belongs to the selected drug
      const isHighlighted = isSelectedDrugPoint(item);

      styleMap.set(item, { shape, color, isHighlighted });
    });

    return styleMap;
  }, [
    filteredData,
    selectedShapeCategory,
    selectedColorCategory,
    doseRanges,
    colorScale,
    isSelectedDrugPoint,
  ]);

  // Optimized draw point function
  const drawPoint = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      shape: string,
      color: string,
      isHovered = false,
      isHighlighted = false,
      currentTransform: { scale: number } // Add this parameter
    ) => {
      // Calculate fixed size regardless of zoom level
      const baseSize = isHighlighted ? 5 : 3;
      const hoverBonus = isHovered ? 0.5 : 0;
      // Divide by scale so that the shape stays the same size when zoomed.
      const size = (baseSize + hoverBonus) / currentTransform.scale;

      // Enhanced styling for highlighted points
      ctx.fillStyle = isHighlighted ? color : color;
      ctx.strokeStyle = isHighlighted
        ? "#FFD700" // Gold border for highlighted points
        : "rgba(255,255,255,0.3)";
      // Line width also needs to be adjusted according to scale
      ctx.lineWidth = isHighlighted
        ? 1 / currentTransform.scale
        : 0.1 / currentTransform.scale;

      // Add glow effect for highlighted points
      if (isHighlighted) {
        ctx.shadowColor = "#FFD700";
        ctx.shadowBlur = 8 / currentTransform.scale; // Adjust blur by scale
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();

      switch (shape) {
        case "square":
          ctx.fillRect(x - size, y - size, size * 2, size * 2);
          ctx.strokeRect(x - size, y - size, size * 2, size * 2);
          break;
        case "cross": {
          const originalLineWidth = ctx.lineWidth;
          const originalStrokeStyle = ctx.strokeStyle;

          // Apply highlighting effects for cross shape
          if (isHighlighted) {
            ctx.shadowColor = "#FFD700";
            ctx.shadowBlur = 8 / currentTransform.scale;
            // Make the cross thicker when highlighted
            ctx.lineWidth = Math.max(
              originalLineWidth * 2.5,
              1.5 / currentTransform.scale
            );
            ctx.strokeStyle = color;
          } else {
            ctx.lineWidth = Math.max(
              originalLineWidth * 1.3,
              0.8 / currentTransform.scale
            );
            ctx.strokeStyle = color;
          }

          ctx.beginPath();
          ctx.moveTo(x - size, y);
          ctx.lineTo(x + size, y);
          ctx.moveTo(x, y - size);
          ctx.lineTo(x, y + size);
          ctx.stroke();

          // Add golden border for highlighted cross
          if (isHighlighted) {
            ctx.shadowBlur = 0; // Reset shadow
            ctx.lineWidth = Math.max(
              originalLineWidth * 3.5,
              2 / currentTransform.scale
            );
            ctx.strokeStyle = "#FFD700";
            ctx.beginPath();
            ctx.moveTo(x - size, y);
            ctx.lineTo(x + size, y);
            ctx.moveTo(x, y - size);
            ctx.lineTo(x, y + size);
            ctx.stroke();
          }

          ctx.lineWidth = originalLineWidth;
          ctx.strokeStyle = originalStrokeStyle;
          ctx.shadowBlur = 0;
          return;
        }
        case "triangle": {
          ctx.moveTo(x, y + size);
          ctx.lineTo(x - size, y - size);
          ctx.lineTo(x + size, y - size);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }
        case "diamond":
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size, y);
          ctx.lineTo(x, y + size);
          ctx.lineTo(x - size, y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case "x": {
          const originalLineWidth = ctx.lineWidth;
          const originalStrokeStyle = ctx.strokeStyle;

          // Apply highlighting effects for x shape
          if (isHighlighted) {
            ctx.shadowColor = "#FFD700";
            ctx.shadowBlur = 8 / currentTransform.scale;
            // Make the x thicker when highlighted
            ctx.lineWidth = Math.max(
              originalLineWidth * 2.5,
              1.5 / currentTransform.scale
            );
            ctx.strokeStyle = color;
          } else {
            ctx.lineWidth = Math.max(
              originalLineWidth * 1,
              0.8 / currentTransform.scale
            );
            ctx.strokeStyle = color;
          }

          ctx.beginPath();
          ctx.moveTo(x - size, y - size);
          ctx.lineTo(x + size, y + size);
          ctx.moveTo(x + size, y - size);
          ctx.lineTo(x - size, y + size);
          ctx.stroke();

          // Add golden border for highlighted x
          if (isHighlighted) {
            ctx.shadowBlur = 0; // Reset shadow
            ctx.lineWidth = Math.max(
              originalLineWidth * 3.5,
              2 / currentTransform.scale
            );
            ctx.strokeStyle = "#FFD700";
            ctx.beginPath();
            ctx.moveTo(x - size, y - size);
            ctx.lineTo(x + size, y + size);
            ctx.moveTo(x + size, y - size);
            ctx.lineTo(x - size, y + size);
            ctx.stroke();
          }

          ctx.lineWidth = originalLineWidth;
          ctx.strokeStyle = originalStrokeStyle;
          ctx.shadowBlur = 0;
          return;
        }
        default:
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
      }

      // Reset shadow for next points
      ctx.shadowBlur = 0;
    },
    []
  );

  // Find point at coordinates
  const findPointAt = useCallback(
    (canvasX: number, canvasY: number) => {
      // Adjust mouse coordinates to correspond to transformed coordinate system
      // Step 1: Subtract margin
      const adjustedX = canvasX - margin.left;
      const adjustedY = canvasY - margin.top;

      // Step 2: Apply inverse transform to get the real coordinates in chart coordinate
      const chartX = (adjustedX - transform.x) / transform.scale;
      const chartY = (adjustedY - transform.y) / transform.scale;

      for (let i = filteredData.length - 1; i >= 0; i--) {
        const point = filteredData[i];
        if (point) {
          // Get the coordinates of the point in the chart coordinate system (not transformed)
          const pointX = scales.xScale(point.x);
          const pointY = scales.yScale(point.y);

          // Get the style to determine shape and highlight status
          const style = pointStyles.get(point);
          if (!style) continue;

          // Detection area size - must match actual shape size
          const baseSize = style.isHighlighted ? 5 : 3; // Matches drawPoint: 5,3
          const hoverBonus = 2; // Increase buffer to 2px for easier hover
          const actualSize = (baseSize + hoverBonus) / transform.scale;

          // Shape based collision checking - use larger detection area
          const distance = Math.sqrt(
            (chartX - pointX) ** 2 + (chartY - pointY) ** 2
          );

          //Use simpler detection for all shapes
          if (distance <= actualSize) {
            return point;
          }
        }
      }
      return null;
    },
    [filteredData, scales, transform, pointStyles, margin]
  );

  // Main render function
  const render = useCallback(() => {
    if (!needsRedrawRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Set canvas size for retina displays
    canvas.width = canvasDimensions.width * dpr;
    canvas.height = canvasDimensions.height * dpr;
    canvas.style.width = canvasDimensions.width + "px";
    canvas.style.height = canvasDimensions.height + "px";
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);

    // Apply transform
    ctx.save();
    ctx.translate(margin.left, margin.top);
    ctx.scale(transform.scale, transform.scale);
    ctx.translate(transform.x / transform.scale, transform.y / transform.scale);

    // Draw non-highlighted points first
    filteredData.forEach((point) => {
      const style = pointStyles.get(point);
      if (style && !style.isHighlighted) {
        const x = scales.xScale(point.x);
        const y = scales.yScale(point.y);
        const isHovered = hoveredPoint === point;
        drawPoint(
          ctx,
          x,
          y,
          style.shape,
          style.color,
          isHovered,
          false,
          transform
        );
      }
    });

    // Draw highlighted points on top
    filteredData.forEach((point) => {
      const style = pointStyles.get(point);
      if (style && style.isHighlighted) {
        const x = scales.xScale(point.x);
        const y = scales.yScale(point.y);
        const isHovered = hoveredPoint === point;
        drawPoint(
          ctx,
          x,
          y,
          style.shape,
          style.color,
          isHovered,
          true,
          transform
        );
      }
    });

    ctx.restore();

    needsRedrawRef.current = false;
  }, [
    filteredData,
    scales,
    transform,
    hoveredPoint,
    pointStyles,
    drawPoint,
    canvasDimensions,
    margin.left,
    margin.top,
  ]);

  // Mark for redraw when dependencies change
  useEffect(() => {
    needsRedrawRef.current = true;
  }, [
    filteredData,
    scales,
    transform,
    hoveredPoint,
    pointStyles,
    canvasDimensions,
  ]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // Update mouse position for tooltip - use global coordinates
      setMousePosition({ x: e.clientX, y: e.clientY });

      if (isDragging) {
        const deltaX = e.clientX - lastMousePos.x;
        const deltaY = e.clientY - lastMousePos.y;

        setTransform((prev) => ({
          ...prev,
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));

        setLastMousePos({ x: e.clientX, y: e.clientY });
      } else {
        // Calculate coordinates relative to canvas
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const canvasX = e.clientX - rect.left;
          const canvasY = e.clientY - rect.top;

          // Find point at this location
          const point = findPointAt(canvasX, canvasY);

          // @ts-ignore
          setHoveredPoint(point);
        }
      }
    },
    [findPointAt, isDragging, lastMousePos]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(
        0.1,
        Math.min(1000, transform.scale * scaleFactor)
      );

      setTransform((prev) => ({
        scale: newScale,
        x: mouseX - (mouseX - prev.x) * (newScale / prev.scale),
        y: mouseY - (mouseY - prev.y) * (newScale / prev.scale),
      }));
    },
    [transform.scale]
  );

  // Animation loop
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      render();
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [render]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  // Add event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleMouseLeave,
  ]);

  // Handler for drug selection
  const handleDrugChange = useCallback((drugName: string) => {
    setSelectedDrug(drugName);
  }, []);

  const getTooltipStyle = (mousePos: { x: number; y: number }) => {
    const tooltipWidth = 280;
    const tooltipHeight = 200;
    const offset = 15;

    // Check if the tooltip overflows the viewport
    const isNearRightEdge =
      mousePos.x + tooltipWidth + offset > window.innerWidth;
    const isNearBottomEdge =
      mousePos.y + tooltipHeight + offset > window.innerHeight;

    let left = mousePos.x + offset;
    let top = mousePos.y - 10;
    let transform = "none";

    if (isNearRightEdge) {
      left = mousePos.x - offset;
      transform = "translateX(-100%)";
    }

    if (isNearBottomEdge) {
      top = mousePos.y - offset;
      transform = isNearRightEdge
        ? "translate(-100%, -100%)"
        : "translateY(-100%)";
    }

    return {
      left: `${left}px`,
      top: `${top}px`,
      transform,
      maxWidth: `${tooltipWidth}px`,
    };
  };

  return (
    <div className="w-full">
      {/* Main Layout */}
      <div className="flex h-[calc(100vh-120px)] gap-4">
        {/* Chart Area - Left Side */}
        <div className="flex-1" ref={chartContainerRef}>
          <div ref={containerRef} className="relative h-full w-full">
            <div ref={refChart}>
              <canvas
                ref={canvasRef}
                className="border-input cursor-pointer rounded border"
                style={{ touchAction: "none" }}
              />
            </div>

            {/* Tooltip */}
            {hoveredPoint && (
              <div
                className="pointer-events-none fixed z-50 rounded-lg border border-gray-600 bg-gray-900 bg-opacity-95 p-3 text-sm text-white shadow-xl backdrop-blur-sm"
                style={getTooltipStyle(mousePosition)}
              >
                <div className="grid grid-cols-1 gap-x-4 gap-y-1">
                  <div>
                    <span className="text-gray-400">
                      Batch: {hoveredPoint.batch}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400">
                      Drug: {hoveredPoint.drug}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400">
                      Perturbation: {hoveredPoint.perturbation_id}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400">
                      Cell: {hoveredPoint.cell}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400">
                      Dose: {hoveredPoint.dose.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400">
                      Time: {hoveredPoint.time} hours
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400">
                      Phase: {hoveredPoint.phase}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400">
                      MOA: {hoveredPoint.MOA ?? ""}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400">
                      Similarity Score:{" "}
                      {formatGeneCountValue(hoveredPoint.similarity_score)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Controls and Info */}
        <div className="flex w-80 flex-col gap-2 overflow-y-auto">
          {/* Drug Search */}
          <div className="space-y-2">
            <Combobox
              classTrigger="w-full"
              items={drugOptions}
              selectedValue={selectedDrug}
              onChange={handleDrugChange}
              placeholder="All Drugs.."
              textEmpty="No matching drugs found."
              allowNewItems={false}
              showNewItemLabel={false}
            />
            {selectedDrug && (
              <div className="hidden items-center justify-between text-xs text-gray-400">
                <span>Selected: {selectedDrug}</span>
                <button
                  onClick={() => setSelectedDrug("")}
                  className="text-yellow-400 hover:text-yellow-300"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Color Legend */}
          <div className="rounded-lg">
            <div className="space-y-2 text-sm">
              <div className="mb-2 text-gray-400">
                {/* Color by Category */}
                <div className="mb-2 flex items-center gap-2">
                  <Select
                    value={
                      colorCategories.find(
                        (c) => c.value === selectedColorCategory
                      )?.value || ""
                    }
                    onValueChange={setSelectedColorCategory}
                  >
                    <SelectTrigger className="w-full text-left">
                      <SelectValue
                        placeholder={"Select an attribute to analyze..."}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {colorCategories?.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedColorCategory === "similarity_score" &&
              similarityLegendData ? (
                <div className="flex h-40 flex-row items-start gap-3 px-1 py-2">
                  <div
                    className="h-full w-4"
                    style={{
                      background: `linear-gradient(to top, ${similarityLegendData.minColor}, ${similarityLegendData.maxColor})`,
                    }}
                  />

                  <div className="relative h-full flex-1 text-xs">
                    {similarityLegendData.steps.map((step, index) => {
                      // Calculate position based on the index for even distribution
                      const positionPercent =
                        (index / (similarityLegendData.steps.length - 1)) * 100;

                      let transformClass = "-translate-y-1/2";
                      if (index === 0) {
                        // Align top for the first item
                        transformClass = "";
                      } else if (
                        index ===
                        similarityLegendData.steps.length - 1
                      ) {
                        // Align bottom for the last item
                        transformClass = "-translate-y-full";
                      }

                      return (
                        <div
                          key={index}
                          className={`text-foreground absolute transform ${transformClass}`}
                          style={{ top: `${positionPercent}%` }}
                        >
                          <span>{step.label}</span>
                          {index === 0 && (
                            <span className="ml-2">(Most Similar)</span>
                          )}
                          {index === similarityLegendData.steps.length - 1 && (
                            <span className="ml-2">(Most Opposite)</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {getColorLegend.map((item, index) => (
                    <div
                      key={index}
                      className="flex-start flex items-center gap-1.5"
                      title={(item as any).tooltip || undefined}
                    >
                      <div
                        className="border-control size-6 rounded-md border"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="text-foreground flex-1 truncate text-xs">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Shape Legend */}
          <div className="rounded-lg">
            <div className="space-y-2 text-sm">
              <div className="mb-2 text-gray-400">
                <div className="mb-2 flex items-center gap-2">
                  <Select
                    value={
                      categories.find((c) => c.value === selectedShapeCategory)
                        ?.value || "time"
                    }
                    onValueChange={setSelectedShapeCategory}
                  >
                    <SelectTrigger className="w-full text-left">
                      <SelectValue
                        placeholder={"Select an attribute to analyze..."}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {getShapeOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-lg">{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default L1000Chart;
