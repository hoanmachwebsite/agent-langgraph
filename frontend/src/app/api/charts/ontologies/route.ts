export async function GET() {
  try {
    const GetEnrichRData = {
      data: '{"dotplot":{"headers":["Description","GeneRatio","Count","p.adjust","geneID","geneID_up","geneID_down","category"],"data":[{"Description":"DEMENTIA","GeneRatio":0.2,"Count":1,"p.adjust":0.0986159598812585,"geneID":"MMRN1","geneID_up":"","geneID_down":"MMRN1","Category":"Jensen_DISEASES_Experimental_2025"},{"Description":"LEWY BODY DEMENTIA","GeneRatio":0.2,"Count":1,"p.adjust":0.0986159598812585,"geneID":"MMRN1","geneID_up":"","geneID_down":"MMRN1","Category":"Jensen_DISEASES_Experimental_2025"},{"Description":"CARPAL TUNNEL SYNDROME","GeneRatio":0.2,"Count":1,"p.adjust":0.0986159598812585,"geneID":"LTBP1","geneID_up":"","geneID_down":"LTBP1","Category":"Jensen_DISEASES_Experimental_2025"},{"Description":"NERVE COMPRESSION SYNDROME","GeneRatio":0.2,"Count":1,"p.adjust":0.0986159598812585,"geneID":"LTBP1","geneID_up":"","geneID_down":"LTBP1","Category":"Jensen_DISEASES_Experimental_2025"}]},"barplot":{"headers":["log2FC_sign","Description","perc","geneID","category"],"data":[{"log2FC_sign":"down","Description":"DEMENTIA","perc":1,"geneID":"MMRN1","Category":"Jensen_DISEASES_Experimental_2025"},{"log2FC_sign":"down","Description":"LEWY BODY DEMENTIA","perc":1,"geneID":"MMRN1","Category":"Jensen_DISEASES_Experimental_2025"},{"log2FC_sign":"down","Description":"CARPAL TUNNEL SYNDROME","perc":1,"geneID":"LTBP1","Category":"Jensen_DISEASES_Experimental_2025"},{"log2FC_sign":"down","Description":"NERVE COMPRESSION SYNDROME","perc":1,"geneID":"LTBP1","Category":"Jensen_DISEASES_Experimental_2025"}]},"metadata":{"categories":["Jensen_DISEASES_Experimental_2025"],"enrichmentType":"ONTOLOGIES"}}',
    };

    return Response.json(GetEnrichRData);
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
