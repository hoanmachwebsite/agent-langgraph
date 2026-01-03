"use client";

import { useMemo, useRef, useState } from "react";
import L1000Chart from "./l1000";
import { safeJsonParse, transformApiData } from "@/lib/utils";
import { DrugSigtureTable } from "./drug-signature-table";
import {
  HeatMapSetting,
  L1000TabEnum,
  LegendVolcanoChartItem,
  X2KChartTypeEnum,
} from "@/types/chart";
import { VolcanoPlotChart } from "./volcano-plot-chart";
import GeneHeatmap from "./gene-heatmap";
import { EnrichmentChart } from "./enrichment-chart";
import { X2KProteinNetworkChart } from "./x2k-protein-network-chart";
import { X2KKinasesChart } from "./x2k-kinases-chart";
import { X2KTranscriptionFactorsChart } from "./x2k-transcription-factors-chart";

interface ChartRendererProps {
  chartType: string;
  data: string | null; // JSON string from API
  isLoading: boolean;
  error: Error | undefined;
}

export function ChartRenderer({
  chartType,
  data,
  isLoading,
  error,
}: ChartRendererProps) {
  // Ref
  const l1000Ref = useRef<HTMLDivElement>(null);
  const mostSimilarRef = useRef<HTMLDivElement>(null);
  const mostOppositeRef = useRef<HTMLDivElement>(null);
  const enrichRef = useRef<HTMLDivElement>(null);

  const x2kProteinRef = useRef<HTMLDivElement>(null);
  const x2kKeaRef = useRef<HTMLDivElement>(null);

  // Volcanon
  const [legendItems, setLegendItems] = useState<LegendVolcanoChartItem[]>(
    () => [
      {
        id: "NS",
        name: "NS",
        color: "#F97316", // Orange
        visible: true,
      },
      {
        id: "log2FC",
        name: "Log₂ FC",
        color: "#22C55E", // Green
        visible: true,
      },
      {
        id: "padj",
        name: "p-adj",
        color: "#3B82F6", // Blue
        visible: true,
      },
      {
        id: "padj_and_log2FC",
        name: "p-adj and Log₂ FC",
        color: "#EAB308", // Yellow
        visible: true,
      },
    ]
  );

  const [showLabel, setShowLabel] = useState(true);

  const updateShowLabel = (show: boolean) => {
    setShowLabel(show);
  };

  const updateLegendItemVisibility = (itemId: string, visible: boolean) => {
    setLegendItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, visible } : item))
    );
  };

  // Heatmap
  const [setting] = useState<HeatMapSetting>(() => {
    return {
      clone: false,
      createdAt: new Date().toISOString(),
      highColor: "#EAB308", // Yellow
      id: "default",
      label: "Default Heatmap",
      lowColor: "#3B82F6", // Blue
      pipelineId: "mock",
      sampleSetId: "mock",
      updatedAt: new Date().toISOString(),
      additionalAnnotations: [],
      genes: {
        excluded: null,
        included: null,
      },
      samples: {
        excluded: null,
        included: null,
      },
    };
  });

  // X2k
  const [proteinNetworkPinnedNodeIds, setProteinNetworkPinnedNodeIds] =
    useState<Set<string>>(new Set());

  const handleHeatMap = (minValue: number, maxValue: number) => {
    console.log("Heatmap range changed:", { min: minValue, max: maxValue });
  };

  const dataParse = useMemo(() => {
    return safeJsonParse(data);
  }, [data]);

  // Parse JSON string to object
  const parsedData = useMemo(() => {
    if (!data) return null;
    try {
      return typeof data === "string" ? JSON.parse(data) : data;
    } catch {
      return null;
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-destructive">
          <p className="text-sm">Error loading chart: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!parsedData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">No data available</p>
      </div>
    );
  }

  // Volcano chart
  if (chartType === "volcano") {
    return (
      <VolcanoPlotChart
        data={data ?? ""}
        legendItems={legendItems}
        updateLegendItemVisibility={updateLegendItemVisibility}
        showLabel={showLabel}
        updateShowLabel={updateShowLabel}
      />
    );
  }

  // Heatmap
  if (chartType === "heatmap") {
    return (
      <GeneHeatmap
        dataHeatMap={dataParse}
        handleHeatMap={handleHeatMap}
        setting={setting}
      />
    );
  }

  const L1000Data = transformApiData(data ?? "");

  // l1000 Chart
  if (chartType === "l1000") {
    return (
      <div>
        <L1000Chart allData={L1000Data} refChart={l1000Ref} />
      </div>
    );
  }

  // l1000 similar table
  if (chartType === "similar_table") {
    return (
      <DrugSigtureTable
        refTable={mostSimilarRef}
        headItems={dataParse?.headers ?? []}
        data={dataParse?.data ?? []}
        isLoadingMostData={isLoading}
        tableType={L1000TabEnum.MOST_SIMILAR}
        classColorBox="bg-[#83CB19]"
      />
    );
  }

  // l1000 opposite table
  if (chartType === "opposite_table") {
    return (
      <DrugSigtureTable
        refTable={mostOppositeRef}
        headItems={dataParse?.headers ?? []}
        data={dataParse?.data ?? []}
        isLoadingMostData={isLoading}
        tableType={L1000TabEnum.MOST_OPPOSITE}
        classColorBox="bg-[#E94549]"
      />
    );
  }

  // Table types: gene_table, similar_table, opposite_table
  const tableTypes = ["gene_table", "transcription"];

  if (tableTypes.includes(chartType)) {
    return <TableChart data={parsedData} />;
  }

  // Enrichment chart types: go, kegg, ontologies, pathways, diseases, cell_type, transcription
  const enrichmentTypes = [
    "go",
    "kegg",
    "ontologies",
    "pathways",
    "diseases",
    "cell_type",
    "transcription",
  ];

  if (enrichmentTypes.includes(chartType)) {
    return <EnrichmentChart ref={enrichRef} data={data} width={1000} />;
  }

  const ppiX2kTypes = ["ppi_down", "ppi_up"];

  if (ppiX2kTypes.includes(chartType)) {
    return (
      <X2KProteinNetworkChart
        networkData={data}
        // @ts-ignore
        refChart={x2kProteinRef}
        isLoading={isLoading}
        pinnedNodeIds={proteinNetworkPinnedNodeIds}
        onPinnedNodeIdsChange={setProteinNetworkPinnedNodeIds}
      />
    );
  }

  const keaX2kTypes = ["kea_down", "kea_up"];

  if (keaX2kTypes.includes(chartType)) {
    return (
      <X2KKinasesChart
        data={data}
        chartType={X2KChartTypeEnum.BARGRAPH}
        // @ts-ignore
        refChart={x2kKeaRef}
        isLoading={isLoading}
      />
    );
  }

  const transacriptionX2kTypes = ["tfea_down", "tfea_up"];

  if (transacriptionX2kTypes.includes(chartType)) {
    return (
      <X2KTranscriptionFactorsChart
        data={data}
        chartType={X2KChartTypeEnum.TABLE}
        // @ts-ignore
        refChart={x2kKeaRef}
        isLoading={isLoading}
      />
    );
  }

  // Other chart types: heatmap, pca, l1000, kea_down, kea_up, ppi_down, ppi_up, tfea_down, tfea_up, x2k_down, x2k_up
  // For now, show formatted JSON, can be enhanced later with specific chart components
  return (
    <div className="h-full overflow-auto p-4">
      <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto font-mono whitespace-pre-wrap">
        {JSON.stringify(parsedData, null, 2)}
      </pre>
    </div>
  );
}

// Table Chart Component
function TableChart({ data }: { data: any }) {
  const headers = data.headers || [];
  const rows = data.data || [];
  const metadata = data.metadata || {};

  return (
    <div className="h-full overflow-auto p-4">
      {metadata && Object.keys(metadata).length > 0 && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span>{" "}
                <span className="text-muted-foreground">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              {headers.map((header: string, index: number) => (
                <th
                  key={index}
                  className="px-4 py-2 text-left font-medium border-b"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any[], rowIndex: number) => (
              <tr
                key={rowIndex}
                className="border-b hover:bg-muted/50 transition-colors"
              >
                {row.map((cell: any, cellIndex: number) => (
                  <td
                    key={cellIndex}
                    className="px-4 py-2 border-r last:border-r-0"
                  >
                    {typeof cell === "object"
                      ? JSON.stringify(cell)
                      : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
