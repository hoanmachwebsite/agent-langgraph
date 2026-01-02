import useSWR from "swr";
import { ArtifactInfo } from "@/app/c/[threadId]/page";
import { useMemo } from "react";

/**
 * Extract chart type from artifact content (JSON string)
 * Content format: {"chart_type": "x2k_down", "data": "..."}
 */
function getChartTypeFromContent(content: string): string | null {
  if (!content || content.trim() === "") return null;

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && "chart_type" in parsed) {
      return parsed.chart_type;
    }
  } catch {
    // Not a valid JSON or doesn't have chart_type
  }

  return null;
}

/**
 * Extract chart type from artifact type (fallback)
 * Examples:
 * - "chart/heatmap" -> "heatmap"
 * - "chart/go" -> "go"
 */
function getChartTypeFromType(artifactType: string): string | null {
  if (artifactType.startsWith("chart/")) {
    return artifactType.replace("chart/", "");
  }
  if (artifactType.includes("/")) {
    const parts = artifactType.split("/");
    return parts[parts.length - 1];
  }
  return null;
}

/**
 * Fetcher function for chart API
 */
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error(
      `Failed to fetch chart data: ${res.statusText}`
    ) as Error & {
      status: number;
    };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

/**
 * Hook to fetch chart data based on artifact info
 *
 * @param artifact - ArtifactInfo object containing type, id, and content
 * @returns Object containing chart data, loading state, and error
 */
export function useChart(artifact: ArtifactInfo | null) {
  // Ưu tiên lấy chart_type từ content, fallback về artifact.type
  const chartType = useMemo(() => {
    if (!artifact) return null;

    // Thử lấy từ content trước
    const typeFromContent = artifact.content
      ? getChartTypeFromContent(artifact.content)
      : null;

    if (typeFromContent) {
      return typeFromContent;
    }

    // Fallback về artifact.type
    return getChartTypeFromType(artifact.type);
  }, [artifact]);

  const shouldFetch = artifact && chartType !== null;

  // SWR key: chỉ dùng artifact id và chart type
  const swrKey = shouldFetch ? [artifact.id, chartType] : null;

  // Build the API URL
  const apiUrl = shouldFetch
    ? `/api/charts/${chartType}?id=${artifact.id}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<any>(
    swrKey ? apiUrl : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateOnMount: true,
      dedupingInterval: 0,
      keepPreviousData: false,
    }
  );

  return {
    chartData: data?.data || null,
    rawData: data || null,
    isLoading,
    error,
    mutate,
    chartType,
    isChart: shouldFetch,
  };
}
