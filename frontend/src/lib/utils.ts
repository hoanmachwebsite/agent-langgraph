import { ArtifactInfo } from "@/types/artifact";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateString?: string): string | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
    return formatted || null;
  } catch {
    return null;
  }
};

export const extractContent = (content: any): string | null => {
  if (!content) return null;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "text" in item) {
        return item.text;
      }
    }
    return null;
  }
  if (typeof content === "object" && "text" in content) {
    return content.text;
  }
  return null;
};

// Helper function to parse artifact from tool message
export function parseArtifact(content: string): ArtifactInfo | null {
  try {
    const parsed = JSON.parse(content);
    if (
      parsed.type === "tool_use" &&
      parsed.name === "artifacts" &&
      parsed.input
    ) {
      const input = parsed.input;
      if (input.command === "create" && input.id && input.type && input.title) {
        return {
          id: input.id,
          type: input.type,
          title: input.title,
          content: input.content || "",
        };
      }
    }
  } catch {
    // Not a valid artifact JSON
  }

  return null;
}

export function extractContent2(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (content === null || content === undefined) {
    return "";
  }
  // Handle array content (e.g., [{ type: "text", text: "..." }])
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "object" && item !== null && "text" in item) {
          return item.text;
        }
        return JSON.stringify(item);
      })
      .join("");
  }
  return JSON.stringify(content);
}

export const formatNumber = (num: number) => {
  const MAX_DECIMAL_PLACES = 4;

  if (num === 0) return "0";

  if (String(num).includes("e")) {
    return num.toExponential(MAX_DECIMAL_PLACES);
  }

  const absNum = Math.abs(num);

  if (absNum < 0.0001) {
    return num.toExponential(MAX_DECIMAL_PLACES);
  }

  if (Number.isInteger(num)) {
    return num.toString();
  }

  const numStr = absNum.toString();
  const decimalPart = numStr.includes(".") ? numStr.split(".")[1] : "";

  if (decimalPart && decimalPart.length > MAX_DECIMAL_PLACES) {
    return parseFloat(num.toFixed(MAX_DECIMAL_PLACES)).toString();
  }

  let leadingZeros = 0;
  for (let i = 0; i < (decimalPart?.length ?? 0); i++) {
    if (decimalPart?.[i] === "0") {
      leadingZeros++;
    } else {
      break;
    }
  }

  const precision = Math.min(leadingZeros + 4, MAX_DECIMAL_PLACES);
  const fixed = num.toFixed(precision);

  return parseFloat(fixed).toString();
};

export const formatGeneCountValue = (value: any) => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  const num = Number(value);

  if (!isNaN(num)) {
    return formatNumber(num);
  }

  return value;
};

export const transformApiData = (dataBasic: any): Record<string, any>[] => {
  if (dataBasic === "") return [];
  let apiData = JSON.parse(dataBasic);
  if (!apiData || !apiData.headers || !apiData.data) {
    return [];
  }

  const headers = apiData.headers;

  return apiData.data.map((row: any[]) => {
    const item: Record<string, any> = {};
    headers.forEach((header: any, index: number) => {
      item[header] = row[index];
    });
    return item;
  });
};

export const convertToTitleCase = (input: string): string => {
  return input
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const safeJsonParse = <T = any>(
  jsonString: string | null | undefined
): T | null => {
  try {
    if (!jsonString) return null;
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("JSON parse error:", error);
    return null;
  }
};

/**
 * Transform kinases data for visualization
 */
export function transformKinasesData(data: any): {
  bargraphData: any[];
  tableData: any[];
  headers: string[];
} {
  if (!data) {
    return { bargraphData: [], tableData: [], headers: [] };
  }

  try {
    // Parse JSON string if needed
    const parsedData = typeof data === "string" ? JSON.parse(data) : data;

    // Handle X2K API format: {headers: [...], data: [...]}
    if (
      parsedData.headers &&
      Array.isArray(parsedData.headers) &&
      parsedData.data &&
      Array.isArray(parsedData.data)
    ) {
      const headers = parsedData.headers;

      // Find column indexes
      const regulatorIndex = headers.findIndex(
        (h: string) => h.toLowerCase() === "regulator"
      );
      const pValueIndex = headers.findIndex(
        (h: string) => h.toLowerCase() === "pvalue"
      );
      const minusLog10PValueIndex = headers.findIndex(
        (h: string) => h.toLowerCase() === "minus_log10_pvalue"
      );
      const targetsIndex = headers.findIndex(
        (h: string) => h.toLowerCase() === "targets"
      );

      // Transform rows to objects
      const transformedData = parsedData.data.map((row: any[]) => {
        const targetsValue = row[targetsIndex] || "";
        const targetCount =
          typeof targetsValue === "string" && targetsValue.trim()
            ? targetsValue.split(",").length
            : 0;

        return {
          kinase: row[regulatorIndex] || "N/A",
          proteinKinase: row[regulatorIndex] || "N/A",
          regulator: row[regulatorIndex] || "N/A",
          pValue: parseFloat(row[pValueIndex]) || 0,
          minusLog10PValue: parseFloat(row[minusLog10PValueIndex]) || 0,
          targets: targetsValue,
          targetCount: targetCount,
          // Legacy compatibility
          score: parseFloat(row[minusLog10PValueIndex]) || 0,
        };
      });

      // Sort by minus_log10_pvalue descending (most significant first)
      const sortedData = transformedData.sort(
        (a: any, b: any) => b.minusLog10PValue - a.minusLog10PValue
      );

      // Return all data - pagination will be handled in components
      const bargraphData = sortedData;

      return {
        bargraphData,
        tableData: transformedData,
        headers,
      };
    }

    // Fallback to legacy format
    const transformedData = transformApiData(data);
    if (!transformedData.length) {
      return { bargraphData: [], tableData: [], headers: [] };
    }

    const headers =
      transformedData.length > 0 ? Object.keys(transformedData[0]) : [];
    const bargraphData = transformedData
      .sort((a, b) => (b.score || b.pValue || 0) - (a.score || a.pValue || 0))
      .slice(0, 10);

    return {
      bargraphData,
      tableData: transformedData,
      headers,
    };
  } catch (error) {
    console.error("Error transforming kinases data:", error);
    return { bargraphData: [], tableData: [], headers: [] };
  }
}

/**
 * Transform network data for D3.js visualization
 */
export function transformNetworkData(data: any): {
  nodes: any[];
  edges: any[];
} {
  if (!data) {
    return { nodes: [], edges: [] };
  }

  try {
    // Parse JSON string if needed
    const parsedData = typeof data === "string" ? JSON.parse(data) : data;

    // Handle new API format: {nodes: {data: [...]}, edges: {data: [...]}}
    if (
      parsedData &&
      typeof parsedData === "object" &&
      parsedData.nodes &&
      parsedData.edges &&
      parsedData.nodes.data &&
      Array.isArray(parsedData.nodes.data) &&
      parsedData.edges.data &&
      Array.isArray(parsedData.edges.data)
    ) {
      // Process nodes from array format [id, label, type, don]
      const allNodes = parsedData.nodes.data.map((nodeArray: any[]) => ({
        id: nodeArray[0] || `node-${Math.random()}`,
        label: nodeArray[1] || nodeArray[0] || "Unknown",
        type: nodeArray[2] || "protein",
        don: nodeArray[3] || 0, // degree of nodes for sizing
      }));

      // Create node lookup for faster edge processing
      const nodeMap = new Map();
      allNodes.forEach((node: any) => nodeMap.set(node.id, node));

      // Process edges from array format [sourceId, targetId, type]
      const processedEdges = parsedData.edges.data
        .map((edgeArray: any[]) => {
          const sourceId = edgeArray[0];
          const targetId = edgeArray[1];
          const sourceNode = nodeMap.get(sourceId);
          const targetNode = nodeMap.get(targetId);

          if (sourceNode && targetNode) {
            return {
              source: sourceNode,
              target: targetNode,
              type: edgeArray[2] || "PPI",
              weight: 1,
            };
          }
          return null;
        })
        .filter((link: any) => link !== null);

      // Filter nodes to only include those that have connections
      const connectedNodeIds = new Set();
      processedEdges.forEach((link: any) => {
        connectedNodeIds.add(link.source.id);
        connectedNodeIds.add(link.target.id);
      });

      const connectedNodes = allNodes.filter((node: any) =>
        connectedNodeIds.has(node.id)
      );

      return { nodes: connectedNodes, edges: processedEdges };
    }

    // Handle legacy flat data format
    const transformedData = transformApiData(data);

    if (!transformedData.length) {
      return { nodes: [], edges: [] };
    }

    // Handle existing object format with nodes/edges properties
    if (
      transformedData &&
      typeof transformedData === "object" &&
      !Array.isArray(transformedData)
    ) {
      if ("nodes" in transformedData && "edges" in transformedData) {
        const networkData = transformedData as { nodes: any[]; edges: any[] };
        return {
          nodes: networkData.nodes,
          edges: networkData.edges,
        };
      }
    }

    // Extract nodes and edges from flat data structure (legacy)
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeIds = new Set();

    transformedData.forEach((item: any) => {
      // Add source node
      if (item.source && !nodeIds.has(item.source)) {
        nodes.push({
          id: item.source,
          label: item.sourceLabel || item.source,
          type: item.sourceType || "protein",
          don: item.sourceDon || 0,
        });
        nodeIds.add(item.source);
      }

      // Add target node
      if (item.target && !nodeIds.has(item.target)) {
        nodes.push({
          id: item.target,
          label: item.targetLabel || item.target,
          type: item.targetType || "protein",
          don: item.targetDon || 0,
        });
        nodeIds.add(item.target);
      }

      // Add edge
      if (item.source && item.target) {
        edges.push({
          source: item.source,
          target: item.target,
          type: item.edgeType || "PPI",
          weight: item.weight || 1,
        });
      }
    });

    return { nodes, edges };
  } catch (error) {
    console.error("Failed to transform network data:", error);
    return { nodes: [], edges: [] };
  }
}

/**
 * Transform transcription factors data for visualization
 */
export function transformTranscriptionFactorsData(data: any): {
  bargraphData: any[];
  tableData: any[];
  headers: string[];
} {
  if (!data) {
    return { bargraphData: [], tableData: [], headers: [] };
  }

  try {
    // Parse JSON string if needed
    const parsedData = typeof data === "string" ? JSON.parse(data) : data;

    // Handle X2K API format: {headers: [...], data: [...]}
    if (
      parsedData.headers &&
      Array.isArray(parsedData.headers) &&
      parsedData.data &&
      Array.isArray(parsedData.data)
    ) {
      const headers = parsedData.headers;

      // Find column indexes
      const regulatorIndex = headers.findIndex(
        (h: string) => h.toLowerCase() === "regulator"
      );
      const pValueIndex = headers.findIndex(
        (h: string) => h.toLowerCase() === "pvalue"
      );
      const minusLog10PValueIndex = headers.findIndex(
        (h: string) => h.toLowerCase() === "minus_log10_pvalue"
      );
      const targetsIndex = headers.findIndex(
        (h: string) => h.toLowerCase() === "targets"
      );

      // Transform rows to objects
      const transformedData = parsedData.data.map((row: any[]) => {
        const targetsValue = row[targetsIndex] || "";
        const targetCount =
          typeof targetsValue === "string" && targetsValue.trim()
            ? targetsValue.split(",").length
            : 0;

        return {
          transcriptionFactor: row[regulatorIndex] || "N/A",
          regulator: row[regulatorIndex] || "N/A",
          pValue: parseFloat(row[pValueIndex]) || 0,
          minusLog10PValue: parseFloat(row[minusLog10PValueIndex]) || 0,
          targets: targetsValue,
          targetCount: targetCount,
          // Legacy compatibility
          score: parseFloat(row[minusLog10PValueIndex]) || 0,
        };
      });

      // Sort by minus_log10_pvalue descending (most significant first)
      const sortedData = transformedData.sort(
        (a: any, b: any) => b.minusLog10PValue - a.minusLog10PValue
      );

      // Return all data - pagination will be handled in components
      const bargraphData = sortedData;

      return {
        bargraphData,
        tableData: transformedData,
        headers,
      };
    }

    // Fallback to legacy format
    const transformedData = transformApiData(data);
    if (!transformedData.length) {
      return { bargraphData: [], tableData: [], headers: [] };
    }

    const headers =
      transformedData.length > 0 ? Object.keys(transformedData[0]) : [];
    const bargraphData = transformedData
      .sort((a, b) => (b.score || b.pValue || 0) - (a.score || a.pValue || 0))
      .slice(0, 10);

    return {
      bargraphData,
      tableData: transformedData,
      headers,
    };
  } catch (error) {
    console.error("Error transforming transcription factors data:", error);
    return { bargraphData: [], tableData: [], headers: [] };
  }
}
