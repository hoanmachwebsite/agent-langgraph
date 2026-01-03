export interface GeneHeatmapProps {
  dataHeatMap: GeneExpressionData | null;
  setting?: HeatMapSetting;
  handleHeatMap: (minValue: number, maxValue: number) => void;
}

export interface GeneExpression {
  name: string;
  expressions: number[];
  displayName?: string;
}

export interface GeneExpressionData {
  samples: GeneExpressionSample[];
  genes: GeneExpression[];
  metadata: {
    contrast: string;
    alternate_level: string;
    reference_level: string;
    available_attributes: string[];
  };
  additionalAnnotations?: AdditionalAnnotation[];
}

export interface HeatMapSetting {
  clone: boolean;
  createdAt: string;
  highColor: string;
  id: string;
  label: string;
  lowColor: string;
  pipelineId: string;
  sampleSetId: string;
  updatedAt: string;
  additionalAnnotations: AdditionalAnnotation[];
  genes: GeneFilter;
  samples: SampleFilter;
  maxValue?: number;
  minValue?: number;
}

export interface GeneExpressionSample {
  id: string;
  attributes: Record<string, string>;
}

export interface GeneHeatmapProps {
  dataHeatMap: GeneExpressionData | null;
  setting?: HeatMapSetting;
  handleHeatMap: (minValue: number, maxValue: number) => void;
}

export interface SampleFilter {
  excluded: string[] | null;
  included: string[] | null;
}

export interface GeneFilter {
  excluded: string[] | null;
  included: string[] | null;
}

export interface AdditionalAnnotation {
  index: number;
  name: string;
  type: string;
}

export enum PCAPlotItemTypeEnum {
  GROUP = "group",
  ATTRIBUTE = "attribute",
}

export type PCAData = {
  headers: string[];
  data: (string | number)[][];
  metadata: {
    alternate_level: string;
    reference_level: string;
    PC1_variance: string;
    PC2_variance: string;
    ntop: number;
  };
};

export type VolcanoData = {
  headers: string[];
  data: any[][];
  metadata: {
    alternate_level: string;
    reference_level: string;
    fc_threshold: number;
    padj_threshold: number;
  };
};

export interface LegendVolcanoChartItem {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export enum L1000TabEnum {
  OVERLAY_PLOT = "overlay_plot",
  MOST_SIMILAR = "most_similar",
  MOST_OPPOSITE = "most_opposite",
}

export enum X2KChartTypeEnum {
  BARGRAPH = "bargraph",
  TABLE = "table",
}
