export async function GET() {
  try {
    const getEnrichRData = {
      data: '{"dotplot":{"headers":["Description","GeneRatio","Count","p.adjust","geneID","geneID_up","geneID_down","category"],"data":[{"Description":"Appendix","GeneRatio":0.0789473684210526,"Count":3,"p.adjust":0.0753639151658709,"geneID":"UTY/ZFY/GP6","geneID_up":"UTY/ZFY","geneID_down":"GP6","Category":"Human_Gene_Atlas"},{"Description":"Kidney","GeneRatio":0.0789473684210526,"Count":3,"p.adjust":0.0753639151658709,"geneID":"ALDOB/XPNPEP2/CUBN","geneID_up":"ALDOB/XPNPEP2/CUBN","geneID_down":"","Category":"Human_Gene_Atlas"}]},"barplot":{"headers":["log2FC_sign","Description","perc","geneID","category"],"data":[{"log2FC_sign":"down","Description":"Appendix","perc":0.333333333333333,"geneID":"GP6","Category":"Human_Gene_Atlas"},{"log2FC_sign":"up","Description":"Appendix","perc":0.666666666666667,"geneID":"UTY/ZFY","Category":"Human_Gene_Atlas"},{"log2FC_sign":"up","Description":"Kidney","perc":1,"geneID":"ALDOB/XPNPEP2/CUBN","Category":"Human_Gene_Atlas"}]},"metadata":{"categories":["Human_Gene_Atlas"],"enrichmentType":"CELL_TYPES"}}',
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
