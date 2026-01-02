export async function GET() {
  try {
    const getKEGGEnrichmentData = {
      data: '{"dotplot":{"headers":["category","Description","GeneRatio","Count","p.adjust","geneID","geneID_up","geneID_down"],"data":[{"Category":"Metabolism","Description":"Starch and sucrose metabolism","GeneRatio":0.0714285714285714,"Count":2,"p.adjust":0.0608269259075557,"geneID":"TREH/GYG2","geneID_up":"TREH","geneID_down":"GYG2"},{"Category":"Organismal Systems","Description":"Fat digestion and absorption","GeneRatio":0.142857142857143,"Count":4,"p.adjust":0.000272995418956727,"geneID":"APOA1/APOA4/NPC1L1/ABCG5","geneID_up":"APOA1/APOA4/NPC1L1/ABCG5","geneID_down":""},{"Category":"Organismal Systems","Description":"Cholesterol metabolism","GeneRatio":0.142857142857143,"Count":4,"p.adjust":0.000272995418956727,"geneID":"APOA1/APOA4/SOAT2/ABCG5","geneID_up":"APOA1/APOA4/SOAT2/ABCG5","geneID_down":""},{"Category":"Organismal Systems","Description":"Vitamin digestion and absorption","GeneRatio":0.107142857142857,"Count":3,"p.adjust":0.000756874213697871,"geneID":"APOA1/APOA4/CUBN","geneID_up":"APOA1/APOA4/CUBN","geneID_down":""}]},"barplot":{"headers":["log2FC_sign","category","Description","perc","geneID"],"data":[{"log2FC_sign":"down","Category":"Metabolism","Description":"Starch and sucrose metabolism","perc":0.5,"geneID":"GYG2"},{"log2FC_sign":"up","Category":"Metabolism","Description":"Starch and sucrose metabolism","perc":0.5,"geneID":"TREH"},{"log2FC_sign":"up","Category":"Organismal Systems","Description":"Fat digestion and absorption","perc":1,"geneID":"APOA1/APOA4/NPC1L1/ABCG5"},{"log2FC_sign":"up","Category":"Organismal Systems","Description":"Cholesterol metabolism","perc":1,"geneID":"APOA1/APOA4/SOAT2/ABCG5"},{"log2FC_sign":"up","Category":"Organismal Systems","Description":"Vitamin digestion and absorption","perc":1,"geneID":"APOA1/APOA4/CUBN"}]},"metadata":{"categories":["Metabolism","Organismal Systems"],"enrichmentType":"KEGG"}}',
    };

    return Response.json(getKEGGEnrichmentData);
  } catch (error) {
    console.error("Error fetching getKEGGEnrichmentData data:", error);
    return Response.json(
      {
        error: "Failed to fetch getKEGGEnrichmentData data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
