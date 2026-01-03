export const TOTAL_COLOR_SHOW_L1000_CHART = 19;

export const ALLOWED_HEADER_MOST_TABLE = [
  "drug",
  "sig_id",
  "similarity_score",
  "p_value",
  "q_value",
  "z_score",
  "combined_score",
];

export const TABLE_MOST_COLOR_VALUE = 0.05;

export const X2K_SIGNIFICANCE_THRESHOLD = 0.05;

// Color constants for statistical significance - Kinases
export const X2K_KINASES_BAR_COLORS = {
  SIGNIFICANT: "#607AAC", // Blue for P < 0.05
  NOT_SIGNIFICANT: "#6B7280", // Gray for P >= 0.05
} as const;

// Legend settings
export const X2K_LEGEND_BOX_SIZE = 16;
export const X2K_LEGEND_SPACING = 24;

export const X2K_BARGRAPH_ITEMS_PER_PAGE = 10;
export const X2K_BAR_HEIGHT = 20;

// Color constants for statistical significance - Transcription Factors
export const X2K_TF_BAR_COLORS = {
  SIGNIFICANT: "#EF4444", // Red for P < 0.05
  NOT_SIGNIFICANT: "#6B7280", // Gray for P >= 0.05
} as const;
