"use client";

import { ArtifactInfo } from "@/app/c/[threadId]/page";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChart } from "@/hooks/use-chart";
import { ChartRenderer } from "@/components/charts/ChartRenderer";

interface ArtifactViewerProps {
  artifact: ArtifactInfo;
  onClose: () => void;
}

export function ArtifactViewer({ artifact, onClose }: ArtifactViewerProps) {
  // Call API khi component mount
  const { chartData, isLoading, error, chartType, isChart } =
    useChart(artifact);

  // Lấy chart type để hiển thị (từ content hoặc type)
  const getDisplayChartType = (): string => {
    try {
      if (artifact.content) {
        const parsed = JSON.parse(artifact.content);
        if (parsed?.chart_type) {
          return parsed.chart_type;
        }
      }
    } catch {
      // Not a valid JSON
    }

    // Fallback về artifact.type
    if (artifact.type.includes("/")) {
      return artifact.type.split("/")[1];
    }
    return artifact.type.replace("chart/", "");
  };

  const displayChartType = getDisplayChartType();

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{artifact.title}</h3>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded shrink-0">
            {displayChartType}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <Tabs
          defaultValue="output"
          className="flex-1 flex flex-col overflow-hidden min-h-0"
        >
          <div className="px-4 pt-3 shrink-0">
            <TabsList>
              <TabsTrigger value="output">Output</TabsTrigger>
              <TabsTrigger value="visual">Visual</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="output"
            className="flex-1 overflow-auto mt-0 px-4 py-4 min-h-0"
          >
            <div className="space-y-2">
              <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto font-mono whitespace-pre-wrap">
                {artifact.content || "No content available"}
              </pre>
            </div>
          </TabsContent>

          <TabsContent
            value="visual"
            className="flex-1 overflow-hidden mt-0 px-4 py-4 min-h-0"
          >
            {isChart && chartType ? (
              <ChartRenderer
                chartType={chartType}
                data={chartData}
                isLoading={isLoading}
                error={error}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">
                  This artifact is not a chart type
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
