"use client";

import { useMemo } from "react";

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

  // Table types: gene_table, similar_table, opposite_table
  const tableTypes = [
    "gene_table",
    "similar_table",
    "opposite_table",
    "transcription",
  ];

  if (tableTypes.includes(chartType)) {
    return <TableChart data={parsedData} />;
  }

  // Enrichment chart types: go, kegg, ontologies, pathways, diseases, cell_type
  const enrichmentTypes = [
    "go",
    "kegg",
    "ontologies",
    "pathways",
    "diseases",
    "cell_type",
  ];

  if (enrichmentTypes.includes(chartType)) {
    return <EnrichmentChart data={parsedData} chartType={chartType} />;
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
                <span className="text-muted-foreground">
                  {String(value)}
                </span>
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
                  <td key={cellIndex} className="px-4 py-2 border-r last:border-r-0">
                    {typeof cell === "object" ? JSON.stringify(cell) : String(cell)}
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

// Enrichment Chart Component (GO, KEGG, etc.)
function EnrichmentChart({ data, chartType }: { data: any; chartType: string }) {
  const dotplot = data.dotplot || {};
  const barplot = data.barplot || {};
  const metadata = data.metadata || {};

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {metadata && Object.keys(metadata).length > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span>{" "}
                <span className="text-muted-foreground">
                  {Array.isArray(value) ? value.join(", ") : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dotplot.headers && dotplot.data && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Dot Plot</h3>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  {dotplot.headers.map((header: string, index: number) => (
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
                {dotplot.data.slice(0, 20).map((row: any, rowIndex: number) => (
                  <tr
                    key={rowIndex}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    {dotplot.headers.map((header: string, headerIndex: number) => (
                      <td
                        key={headerIndex}
                        className="px-4 py-2 border-r last:border-r-0"
                      >
                        {typeof row[header] === "object"
                          ? JSON.stringify(row[header])
                          : String(row[header] || row[headerIndex] || "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {dotplot.data.length > 20 && (
              <div className="px-4 py-2 text-xs text-muted-foreground text-center border-t">
                Showing 20 of {dotplot.data.length} rows
              </div>
            )}
          </div>
        </div>
      )}

      {barplot.headers && barplot.data && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Bar Plot</h3>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  {barplot.headers.map((header: string, index: number) => (
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
                {barplot.data.slice(0, 20).map((row: any, rowIndex: number) => (
                  <tr
                    key={rowIndex}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    {barplot.headers.map((header: string, headerIndex: number) => (
                      <td
                        key={headerIndex}
                        className="px-4 py-2 border-r last:border-r-0"
                      >
                        {typeof row[header] === "object"
                          ? JSON.stringify(row[header])
                          : String(row[header] || row[headerIndex] || "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {barplot.data.length > 20 && (
              <div className="px-4 py-2 text-xs text-muted-foreground text-center border-t">
                Showing 20 of {barplot.data.length} rows
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

