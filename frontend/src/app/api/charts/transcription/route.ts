export async function GET() {
  try {
    const getEnrichRData = {
      data: '{"dotplot":{"headers":["Description","GeneRatio","Count","p.adjust","geneID","geneID_up","geneID_down","category"],"data":[{"Description":"GTTTGTT,MIR-495","GeneRatio":0.333333333333333,"Count":5,"p.adjust":0.00784256958337318,"geneID":"DDX3Y/PRKY/PRKX/ZFX/PCDHA6","geneID_up":"DDX3Y/PRKY","geneID_down":"PRKX/ZFX/PCDHA6","Category":"TargetScan_microRNA"}]},"barplot":{"headers":["log2FC_sign","Description","perc","geneID","category"],"data":[{"log2FC_sign":"down","Description":"GTTTGTT,MIR-495","perc":0.6,"geneID":"PRKX/ZFX/PCDHA6","Category":"TargetScan_microRNA"},{"log2FC_sign":"up","Description":"GTTTGTT,MIR-495","perc":0.4,"geneID":"DDX3Y/PRKY","Category":"TargetScan_microRNA"}]},"metadata":{"categories":["TargetScan_microRNA"],"enrichmentType":"TRANSCRIPTION"}}',
    };

    return Response.json(getEnrichRData);
  } catch (error) {
    console.error("Error fetching heatmap data:", error);
    return Response.json(
      {
        error: "Failed to fetch heatmap data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
