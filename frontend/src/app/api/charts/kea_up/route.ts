export async function GET() {
  try {
    const getPpiData = {
      data: '{"edges":{"headers":["source","target","type"],"data":[[9,6,"PPI"],[10,13,"PPI"],[10,18,"PPI"],[10,14,"PPI"],[10,20,"PPI"],[10,5,"PPI"],[10,3,"PPI"],[10,7,"PPI"],[10,4,"PPI"],[10,19,"PPI"],[10,16,"PPI"],[10,17,"PPI"],[6,18,"PPI"],[6,9,"PPI"],[11,18,"PPI"],[11,19,"PPI"],[11,5,"PPI"],[11,12,"PPI"],[11,15,"PPI"],[11,16,"PPI"],[11,2,"PPI"],[12,11,"PPI"],[12,3,"PPI"],[12,20,"PPI"],[12,5,"PPI"],[13,10,"PPI"],[13,5,"PPI"],[13,18,"PPI"],[13,7,"PPI"],[13,15,"PPI"],[13,16,"PPI"],[13,4,"PPI"],[13,17,"PPI"],[14,10,"PPI"],[14,5,"PPI"],[14,18,"PPI"],[14,22,"PPI"],[14,8,"PPI"],[14,17,"PPI"],[15,11,"PPI"],[15,13,"PPI"],[15,18,"PPI"],[15,20,"PPI"],[15,5,"PPI"],[15,8,"PPI"],[15,3,"PPI"],[15,7,"PPI"],[15,19,"PPI"],[15,16,"PPI"],[15,17,"PPI"],[15,2,"PPI"],[16,11,"PPI"],[16,3,"PPI"],[16,10,"PPI"],[16,13,"PPI"],[16,18,"PPI"],[16,7,"PPI"],[16,19,"PPI"],[16,15,"PPI"],[5,11,"PPI"],[5,10,"PPI"],[5,13,"PPI"],[5,18,"PPI"],[5,22,"PPI"],[5,14,"PPI"],[5,19,"PPI"],[5,12,"PPI"],[5,15,"PPI"],[5,17,"PPI"],[4,10,"PPI"],[4,13,"PPI"],[4,18,"PPI"],[4,21,"PPI"],[17,10,"PPI"],[17,13,"PPI"],[17,7,"PPI"],[17,14,"PPI"],[17,20,"PPI"],[17,5,"PPI"],[17,15,"PPI"],[0,20,"PPI"],[18,11,"PPI"],[18,10,"PPI"],[18,13,"PPI"],[18,22,"PPI"],[18,14,"PPI"],[18,20,"PPI"],[18,5,"PPI"],[18,6,"PPI"],[18,4,"PPI"],[18,19,"PPI"],[18,15,"PPI"],[18,16,"PPI"],[3,19,"PPI"],[3,10,"PPI"],[3,22,"PPI"],[3,12,"PPI"],[3,15,"PPI"],[3,16,"PPI"],[19,11,"PPI"],[19,3,"PPI"],[19,10,"PPI"],[19,18,"PPI"],[19,5,"PPI"],[19,15,"PPI"],[19,16,"PPI"],[7,21,"PPI"],[7,10,"PPI"],[7,13,"PPI"],[7,15,"PPI"],[7,16,"PPI"],[7,17,"PPI"],[20,10,"PPI"],[20,18,"PPI"],[20,0,"PPI"],[20,8,"PPI"],[20,12,"PPI"],[20,15,"PPI"],[20,17,"PPI"],[21,7,"PPI"],[21,4,"PPI"],[2,11,"PPI"],[2,15,"PPI"],[22,14,"PPI"],[22,3,"PPI"],[22,5,"PPI"],[22,18,"PPI"],[8,14,"PPI"],[8,15,"PPI"],[8,20,"PPI"]]},"nodes":{"headers":["id","label","type","don"],"data":[[0,"CHD1","transcription_factor",0.08333333333333333],[1,"IRF8","transcription_factor",0],[2,"UBTF","transcription_factor",0.16666666666666666],[3,"YY1","transcription_factor",0.5],[4,"ETS1","transcription_factor",0.3333333333333333],[5,"STAT3","transcription_factor",0.8333333333333334],[6,"FOXA1","transcription_factor",0.16666666666666666],[7,"CREB1","transcription_factor",0.5],[8,"PPARD","transcription_factor",0.25],[9,"FOXA2","transcription_factor",0.08333333333333333],[10,"CREBBP","intermediate_protein",0.9166666666666666],[11,"RB1","intermediate_protein",0.5833333333333334],[12,"HDAC3","intermediate_protein",0.3333333333333333],[13,"DAXX","intermediate_protein",0.6666666666666666],[14,"NCOA1","intermediate_protein",0.5],[15,"HDAC1","intermediate_protein",1],[16,"HDAC2","intermediate_protein",0.6666666666666666],[17,"NR3C1","intermediate_protein",0.5833333333333334],[18,"AR","intermediate_protein",1],[19,"SP1","intermediate_protein",0.5833333333333334],[20,"NCOR1","intermediate_protein",0.5833333333333334],[21,"MEIS1","intermediate_protein",0.16666666666666666],[22,"EZH2","intermediate_protein",0.3333333333333333]]}}',
    };

    return Response.json(getPpiData);
  } catch (error) {
    console.error("Error fetching getPpiData data:", error);
    return Response.json(
      {
        error: "Failed to fetch getPpiData data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
