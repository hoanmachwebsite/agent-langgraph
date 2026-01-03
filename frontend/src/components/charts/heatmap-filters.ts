import { GeneExpressionData, HeatMapSetting } from "@/types/chart";

export function getFilteredSamples(
  data: GeneExpressionData,
  setting: HeatMapSetting
) {
  if (!setting || !setting.samples) {
    return data.samples;
  }

  if (setting.samples.included && setting.samples.included.length > 0) {
    return data.samples.filter((sample) =>
      setting.samples.included?.includes(sample.id)
    );
  }

  if (setting.samples.excluded && setting.samples.excluded.length > 0) {
    return data.samples.filter(
      (sample) => !setting.samples.excluded?.includes(sample.id)
    );
  }

  return data.samples;
}

export function getFilteredGenes(
  data: GeneExpressionData,
  setting: HeatMapSetting
) {
  if (!setting || !setting.genes) {
    return data.genes;
  }

  if (setting.genes.included && setting.genes.included.length > 0) {
    return data.genes.filter((gene) =>
      setting.genes.included?.includes(gene.name)
    );
  }

  if (setting.genes.excluded && setting.genes.excluded.length > 0) {
    return data.genes.filter(
      (gene) => !setting.genes.excluded?.includes(gene.name)
    );
  }

  return data.genes;
}

export function getFilteredIds(items: any[], idField: string) {
  return items.map((item) => item[idField]);
}

export const getVisibleSamples = (
  samples: any[],
  setting: any,
  visibilityState: Map<string, boolean>
): any[] => {
  if (
    !setting.additionalAnnotations ||
    setting.additionalAnnotations.length === 0 ||
    !visibilityState.size
  ) {
    return samples;
  }

  return samples.filter((sample) => {
    for (const annotation of setting.additionalAnnotations) {
      const attributeName = annotation.name.toLowerCase();
      const attributeValue = sample.attributes[attributeName];
      const key = `${annotation.name}:${attributeValue}`;

      if (visibilityState.get(key) === false) {
        return false;
      }
    }

    return true;
  });
};
