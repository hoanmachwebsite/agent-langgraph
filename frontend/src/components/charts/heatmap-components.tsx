import * as d3 from 'd3';

/**
 * Calculate center color as average between highColor and lowColor
 * @param {string} highColor - High color
 * @param {string} lowColor - Low color
 * @returns {string} Center color (average of high and low colors)
 */
const calculateCenterColor = (highColor: string, lowColor: string): string => {
  return d3.interpolateRgb(lowColor, highColor)(0.5);
};

/**
 * Creates color array for top gradient section (positive values)
 * @param {number} topValue - Top slider value (max)
 * @param {number} scaleBound - Scale boundary
 * @param {string} highColor - High color (e.g., yellow)
 * @param {number} numColors - Number of colors in array
 * @param {string} centerColor - Center color (default: average of high and low colors)
 * @returns {string[]} Array of color strings for top section
 */
const createTopColorArray = (
  topValue: number,
  scaleBound: number,
  highColor: string,
  numColors: number,
  centerColor?: string
): string[] => {
  if (!scaleBound || numColors <= 0 || isNaN(scaleBound) || isNaN(numColors)) {
    return [];
  }
  const actualCenterColor =
    centerColor || calculateCenterColor(highColor, '#0066CC');

  // Calculate counts for each zone in top section
  let solidCount = Math.floor(
    ((scaleBound - topValue) / scaleBound) * numColors
  );
  solidCount = Math.max(0, solidCount);
  const gradientCount = Math.max(0, numColors - solidCount);

  // Create color arrays - gradient from center color (near zero) to highColor (far from zero)
  const gradientColors = d3
    .range(gradientCount)
    .map((i) =>
      d3.interpolateRgb(
        actualCenterColor,
        highColor
      )(i / (gradientCount - 1 || 1))
    );
  const solidColors = Array(solidCount).fill(highColor);

  // Order: [center...gradient...highColor] + [solid highColor]
  return [...gradientColors, ...solidColors];
};

/**
 * Creates color array for bottom gradient section (negative values)
 * @param {number} bottomValue - Bottom slider value (min)
 * @param {number} scaleBound - Scale boundary
 * @param {string} lowColor - Low color (e.g., blue)
 * @param {number} numColors - Number of colors in array
 * @param {string} highColor - High color (e.g., yellow)
 * @param {string} centerColor - Center color (default: average of high and low colors)
 * @returns {string[]} Array of color strings for bottom section
 */
const createBottomColorArray = (
  bottomValue: number,
  scaleBound: number,
  lowColor: string,
  numColors: number,
  highColor: string,
  centerColor?: string
): string[] => {
  if (!scaleBound || numColors <= 0 || isNaN(scaleBound) || isNaN(numColors)) {
    return [];
  }
  const actualCenterColor =
    centerColor || calculateCenterColor(highColor, lowColor);

  // Calculate counts for each zone in bottom section
  let solidCount = Math.floor(
    ((scaleBound - Math.abs(bottomValue)) / scaleBound) * numColors
  );
  solidCount = Math.max(0, solidCount);
  const gradientCount = Math.max(0, numColors - solidCount);

  // Create solid colors (far from zero) - placed first in array
  const solidColors = Array(solidCount).fill(lowColor);

  // Create gradient colors (near zero) - gradient from lowColor to center color
  const gradientColors = d3
    .range(gradientCount)
    .map((i) =>
      d3.interpolateRgb(
        lowColor,
        actualCenterColor
      )(i / (gradientCount - 1 || 1))
    );

  // Order: [solid lowColor] + [gradient lowColor→center]
  // After reverse: [center, gradient..., lowColor] - center at zero position
  return [...solidColors, ...gradientColors];
};

/**
 * Creates segmented color scale based on slider positions
 * @param {number} topValue - Top slider value (max)
 * @param {number} bottomValue - Bottom slider value (min)
 * @param {number} scaleBound - Scale boundary
 * @param {string} highColor - High color
 * @param {string} lowColor - Low color
 * @param {string} centerColor - Center color (default: average of high and low colors)
 * @returns {Function} Color scale function
 */
export const createSegmentedColorScale = (
  topValue: number,
  bottomValue: number,
  scaleBound: number,
  highColor: string,
  lowColor: string,
  centerColor?: string
) => {
  const actualCenterColor =
    centerColor || calculateCenterColor(highColor, lowColor);

  // Create scale functions for each segment
  const topGradientScale = d3
    .scaleLinear<string>()
    .domain([topValue, 0])
    .range([highColor, actualCenterColor]);

  const bottomGradientScale = d3
    .scaleLinear<string>()
    .domain([bottomValue, 0])
    .range([lowColor, actualCenterColor]);

  // Return composite color scale function
  return (value: number): string => {
    if (value > topValue) {
      return highColor;
    } else if (value <= topValue && value >= 0) {
      return topGradientScale(value);
    } else if (value < 0 && value >= bottomValue) {
      return bottomGradientScale(value);
    } else {
      return lowColor;
    }
  };
};

/**
 * Creates a color legend with adjustable sliders for a heat map
 * @param {SVGSVGElement} colorLegendRef - Reference to the SVG element to render the legend
 * @param {string[]} colors - Array of color values for the gradient
 * @param {number} scaleBound - The maximum absolute value for the scale
 * @param {string} highColor - High color (e.g., yellow)
 * @param {string} lowColor - Low color (e.g., blue)
 * @param {number} legendHeight - Height of the legend bar
 * @param {number} legendWidth - Width of the legend bar
 * @param {Function} onSliderChange - Callback when slider values change (min, max)
 * @param {string} centerColor - Center color (default: average of high and low colors)
 * @returns {Object} Legend controls with update methods
 */
export const createColorLegend = (
  colorLegendRef: SVGSVGElement | null,
  colors: string[],
  scaleBound: number,
  highColor: string,
  lowColor: string,
  legendHeight: number = 200,
  legendWidth: number = 16,
  onSliderChange?: (minValue: number, maxValue: number) => void,
  centerColor?: string
) => {
  if (!colorLegendRef) return;

  const actualCenterColor =
    centerColor || calculateCenterColor(highColor, lowColor);

  // Round scaleBound to 1 decimal place
  scaleBound = Math.ceil(scaleBound * 10) / 10;

  // Initialize min and max values
  const initialTopValue = scaleBound;
  const initialBottomValue = -scaleBound;

  // Create and configure the SVG container
  const colorLegendSvg = d3
    .select(colorLegendRef)
    .attr('width', 140)
    .attr('height', legendHeight + 100)
    .style('marginLeft', '0');

  // Clear any existing content
  colorLegendSvg.selectAll('*').remove();

  // Create a group for the color legend
  const colorLegend = colorLegendSvg
    .append('g')
    .attr('class', 'color-legend')
    .attr('transform', `translate(60, 40)`);

  // Create a scale for mapping values to positions
  const legendScale = d3
    .scaleLinear()
    .domain([-scaleBound, scaleBound])
    .range([legendHeight, 0]);

  // Set initial values
  let topValue = initialTopValue;
  let bottomValue = initialBottomValue;

  // Calculate the position of zero on the scale
  const zeroPosition = legendScale(0);

  // Calculate heights for top and bottom sections
  const topSectionHeight = zeroPosition;
  const bottomSectionHeight = legendHeight - zeroPosition;
  const totalColors = colors.length;
  const topColorCount = Math.floor(
    (topSectionHeight / legendHeight) * totalColors
  );
  const bottomColorCount = totalColors - topColorCount;

  // State variables for dynamic gradient updates
  let topColorRects: d3.Selection<SVGRectElement, string, SVGGElement, unknown>;
  let bottomColorRects: d3.Selection<
    SVGRectElement,
    string,
    SVGGElement,
    unknown
  >;
  let topColors: string[];
  let bottomColors: string[];

  // References to input elements
  let topValueInput: any;
  let bottomValueInput: any;

  // Initialize color arrays
  topColors = createTopColorArray(
    initialTopValue,
    scaleBound,
    highColor,
    topColorCount,
    actualCenterColor
  );
  bottomColors = createBottomColorArray(
    initialBottomValue,
    scaleBound,
    lowColor,
    bottomColorCount,
    highColor,
    actualCenterColor
  );

  // Create top section for positive values (0 to max)
  const topSection = colorLegend
    .append('g')
    .attr('class', 'top-gradient-section');

  // Create bottom section for negative values (min to 0)
  const bottomSection = colorLegend
    .append('g')
    .attr('class', 'bottom-gradient-section')
    .attr('transform', `translate(0, ${zeroPosition})`);

  // Create top color rectangles
  topColorRects = topSection
    .selectAll('rect.top-color-rect')
    .data(topColors.slice().reverse())
    .enter()
    .append('rect')
    .attr('class', 'top-color-rect')
    .attr('x', 0)
    .attr('y', (_, i) => i * (topSectionHeight / topColors.length))
    .attr('width', legendWidth)
    .attr('height', topSectionHeight / topColors.length + 1)
    .style('fill', (d) => d);

  // Create bottom color rectangles
  bottomColorRects = bottomSection
    .selectAll('rect.bottom-color-rect')
    .data(bottomColors.slice().reverse())
    .enter()
    .append('rect')
    .attr('class', 'bottom-color-rect')
    .attr('x', 0)
    .attr('y', (_, i) => i * (bottomSectionHeight / bottomColors.length))
    .attr('width', legendWidth)
    .attr('height', bottomSectionHeight / bottomColors.length + 1)
    .style('fill', (d) => d);

  // Create the axis group for value labels
  const axisGroup = colorLegendSvg
    .append('g')
    .attr('class', 'axis-group')
    .attr('transform', `translate(${60 + legendWidth + 39}, 40)`);

  // Create the axis with tick marks
  const tickValues = [
    -scaleBound,
    (-scaleBound * 2) / 3,
    -scaleBound / 3,
    0,
    scaleBound / 3,
    (scaleBound * 2) / 3,
    scaleBound,
  ];

  const legendAxis = d3
    .axisLeft(legendScale)
    .tickValues(tickValues)
    .tickFormat((d) => (d === 0 ? '0' : d3.format('.1f')(d)));

  // Configure axis styling
  axisGroup.call(legendAxis).call((g) => {
    g.select('.domain').remove();
    g.selectAll('.tick line').remove();
    g.selectAll('.tick text')
      .attr('class', 'text-[14px] font-medium font-raleway capitalize')
      .style('text-anchor', 'end')
      .style('fill', 'currentColor')
      .attr('x', -8);
  });

  // Create slider container
  const sliderGroup = colorLegendSvg
    .append('g')
    .attr('class', 'sliders')
    .attr('transform', `translate(60, 34)`);

  // Create transparent track for click interactions
  const sliderTrack = sliderGroup
    .append('rect')
    .attr('class', 'slider-track')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', 'transparent')
    .style('cursor', 'pointer');

  // Create top slider (maximum value)
  const topSliderGroup = sliderGroup
    .append('g')
    .attr('class', 'slider-handle top-slider-group')
    .attr('transform', `translate(0, 0)`)
    .style('cursor', 'ns-resize');

  // Create arrow using path from sliderThumbIcon
  topSliderGroup
    .append('path')
    .attr('class', 'slider-arrow')
    .attr(
      'd',
      'M9.25 4.70117C10.1873 5.24243 10.2459 6.54422 9.42578 7.18066L9.25 7.29883L3.25 10.7627C2.25 11.34 1 10.6186 1 9.46387V2.53613C1 1.45373 2.09835 0.751648 3.05957 1.14355L3.25 1.2373L9.25 4.70117Z'
    )
    .attr('transform', 'translate(-10, 0)')
    .style('fill', '#111827')
    .style('stroke', '#E5E7EB')
    .style('stroke-width', 1);

  topSliderGroup
    .append('rect')
    .attr('class', 'slider-mark')
    .attr('x', 0)
    .attr('y', 6)
    .attr('width', legendWidth)
    .attr('height', 1)
    .style('fill', 'white')
    .style('stroke', 'white')
    .style('stroke-width', 0.5);

  // Create bottom slider (minimum value)
  const bottomSliderGroup = sliderGroup
    .append('g')
    .attr('class', 'slider-handle bottom-slider-group')
    .attr('transform', `translate(0, ${legendHeight})`)
    .style('cursor', 'ns-resize');

  // Create arrow and mark for bottom slider
  bottomSliderGroup
    .append('path')
    .attr('class', 'slider-arrow')
    .attr(
      'd',
      'M9.25 4.70117C10.1873 5.24243 10.2459 6.54422 9.42578 7.18066L9.25 7.29883L3.25 10.7627C2.25 11.34 1 10.6186 1 9.46387V2.53613C1 1.45373 2.09835 0.751648 3.05957 1.14355L3.25 1.2373L9.25 4.70117Z'
    )
    .attr('transform', 'translate(-10, 0)')
    .style('fill', '#111827')
    .style('stroke', '#E5E7EB')
    .style('stroke-width', 1);

  bottomSliderGroup
    .append('rect')
    .attr('class', 'slider-mark')
    .attr('x', 0)
    .attr('y', 6)
    .attr('width', legendWidth)
    .attr('height', 1)
    .style('fill', 'white')
    .style('stroke', 'white')
    .style('stroke-width', 0.5);

  // Define value box dimensions
  const valueBoxWidth = 50;
  const valueBoxHeight = 28;

  // Create value box for top slider
  const topValueBox = colorLegendSvg
    .append('g')
    .attr('class', 'value-box top-value')
    .attr(
      'transform',
      `translate(${77 - valueBoxWidth / 2 + legendWidth / 2}, 1)`
    );

  topValueBox
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', valueBoxWidth)
    .attr('height', valueBoxHeight)
    .attr('rx', 8)
    .attr('ry', 8)
    .style('fill', 'hsl(var(--background))')
    .style('stroke', 'hsl(var(--control-stroke-token))')
    .style('stroke-width', '1px');

  // Create editable input for top value
  const topValueForeignObject = topValueBox
    .append('foreignObject')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', valueBoxWidth)
    .attr('height', valueBoxHeight);

  topValueInput = topValueForeignObject
    .append('xhtml:input')
    .attr('type', 'text')
    .property('value', initialTopValue.toFixed(2))
    .style('font-size', '14px')
    .style(
      'font-family',
      'var(--font-raleway), Raleway, -apple-system, BlinkMacSystemFont, sans-serif'
    )
    .style('text-align', 'center')
    .style('background', 'transparent')
    .style('border', 'none')
    .style('color', 'hsl(var(--foreground))')
    .style('outline', 'none')
    .style('width', '100%')
    .style('height', '100%')
    .style('padding', '0')
    .style('-moz-appearance', 'textfield')
    .style('transition', 'border 0.2s, padding 0.2s');

  // Create value box for bottom slider
  const bottomValueBox = colorLegendSvg
    .append('g')
    .attr('class', 'value-box bottom-value')
    .attr(
      'transform',
      `translate(${77 - valueBoxWidth / 2 + legendWidth / 2}, ${legendHeight + 52})`
    );

  bottomValueBox
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', valueBoxWidth)
    .attr('height', valueBoxHeight)
    .attr('rx', 8)
    .attr('ry', 8)
    .style('fill', 'hsl(var(--background))')
    .style('stroke', 'hsl(var(--control-stroke-token))')
    .style('stroke-width', '1px');

  // Create editable input for bottom value
  const bottomValueForeignObject = bottomValueBox
    .append('foreignObject')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', valueBoxWidth)
    .attr('height', valueBoxHeight);

  bottomValueInput = bottomValueForeignObject
    .append('xhtml:input')
    .attr('type', 'text')
    .property('value', initialBottomValue.toFixed(2))
    .style('font-size', '14px')
    .style(
      'font-family',
      'var(--font-raleway), Raleway, -apple-system, BlinkMacSystemFont, sans-serif'
    )
    .style('text-align', 'center')
    .style('background', 'transparent')
    .style('border', 'none')
    .style('color', 'hsl(var(--foreground))')
    .style('outline', 'none')
    .style('width', '100%')
    .style('height', '100%')
    .style('padding', '0')
    .style('-moz-appearance', 'textfield')
    .style('transition', 'border 0.2s, padding 0.2s');

  // Event handlers for input changes
  const handleInputFocus = (event: Event) => {
    const target = event.target as HTMLInputElement;
    target.select();
  };

  const handleInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      const target = event.target as HTMLInputElement;
      target.blur();
    }
  };

  const handleTopInputBlur = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const inputValue = parseFloat(target.value);

    // Check if input is invalid or empty
    if (isNaN(inputValue) || target.value.trim() === '') {
      target.value = topValue.toFixed(2);
      d3.select(target).style('border', 'none').style('padding', '0');
      return;
    }

    // Clamp value to valid range (0.0 to scaleBound)
    const clampedValue = Math.max(0.0, Math.min(scaleBound, inputValue));

    // Update only if value changed
    if (clampedValue !== topValue) {
      topValue = clampedValue;
      updateSliders();
      updateTopGradient(topValue);
    }

    // Format to 2 decimal places
    target.value = clampedValue.toFixed(2);

    // Remove focus styles
    d3.select(target).style('border', 'none').style('padding', '0');
  };

  const handleBottomInputBlur = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const inputValue = parseFloat(target.value);

    // Check if input is invalid or empty
    if (isNaN(inputValue) || target.value.trim() === '') {
      // Restore previous value
      target.value = bottomValue.toFixed(2);
      d3.select(target).style('border', 'none').style('padding', '0');
      return;
    }

    // Clamp value to valid range (-scaleBound to -0.0)
    const clampedValue = Math.min(-0.0, Math.max(-scaleBound, inputValue));

    // Update only if value changed
    if (clampedValue !== bottomValue) {
      bottomValue = clampedValue;
      updateSliders();
      updateBottomGradient(bottomValue);
    }

    // Format to 2 decimal places
    target.value = clampedValue.toFixed(2);

    // Remove focus styles
    d3.select(target).style('border', 'none').style('padding', '0');
  };

  // Add event listeners to top value input
  topValueInput
    .on('focus', handleInputFocus)
    .on('blur', handleTopInputBlur)
    .on('keydown', handleInputKeyDown);

  // Add event listeners to bottom value input
  bottomValueInput
    .on('focus', handleInputFocus)
    .on('blur', handleBottomInputBlur)
    .on('keydown', handleInputKeyDown);

  // Function to update top gradient only
  const updateTopGradient = (topValue: number) => {
    topColors = createTopColorArray(
      topValue,
      scaleBound,
      highColor,
      Math.floor(colors.length / 2),
      actualCenterColor
    );
    topColorRects.data(topColors.slice().reverse()).style('fill', (d) => d);
  };

  // Function to update bottom gradient only
  const updateBottomGradient = (bottomValue: number) => {
    bottomColors = createBottomColorArray(
      bottomValue,
      scaleBound,
      lowColor,
      Math.floor(colors.length / 2),
      highColor,
      actualCenterColor
    );
    bottomColorRects
      .data(bottomColors.slice().reverse())
      .style('fill', (d) => d);
  };

  // Update sliders' positions and values
  const updateSliders = () => {
    const topY = legendScale(topValue);
    const bottomY = legendScale(bottomValue);

    topSliderGroup.attr('transform', `translate(0, ${topY})`);
    bottomSliderGroup.attr('transform', `translate(0, ${bottomY})`);

    topValueInput.property('value', topValue.toFixed(2));
    bottomValueInput.property('value', bottomValue.toFixed(2));

    if (onSliderChange) {
      onSliderChange(bottomValue, topValue);
    }
  };

  // Add drag behavior for top slider - restrict to positive values only
  const dragTop = d3.drag<SVGGElement, unknown>().on('drag', (event) => {
    const y = Math.max(0, Math.min(zeroPosition, event.y));
    const newValue = legendScale.invert(y);

    topValue = newValue;
    updateSliders();
    updateTopGradient(topValue);
  });

  // Add drag behavior for bottom slider - restrict to negative values only
  const dragBottom = d3.drag<SVGGElement, unknown>().on('drag', (event) => {
    const y = Math.max(zeroPosition, Math.min(legendHeight, event.y));
    const newValue = legendScale.invert(y);

    bottomValue = newValue;
    updateSliders();
    updateBottomGradient(bottomValue);
  });

  // Apply drag behaviors to slider groups
  topSliderGroup.call(dragTop);
  bottomSliderGroup.call(dragBottom);

  // Handle clicks on the legend track
  sliderTrack.on('click', (event) => {
    const y = Math.max(0, Math.min(legendHeight, d3.pointer(event)[1]));
    const clickedValue = legendScale.invert(y);

    // If clicked above zero line, update top slider
    if (y <= zeroPosition) {
      topValue = clickedValue;
      updateSliders();
      updateTopGradient(topValue);
    }
    // If clicked below zero line, update bottom slider
    else {
      bottomValue = clickedValue;
      updateSliders();
      updateBottomGradient(bottomValue);
    }
  });

  // Return methods to control the legend externally
  return {
    updateSliders,
    getCurrentValues: () => ({ min: bottomValue, max: topValue }),
  };
};

/**
 * Creates attribute legend for the heatmap
 * @param {SVGSVGElement | null} attributeLegendRef - Reference to the SVG element to render the legend
 * @param {any[]} sortedAnnotations - Sorted annotations for the heatmap
 * @param {any[]} filteredSamples - Filtered samples for the heatmap
 * @param {Map<string, Map<any, string>>} colorMapTemp - Color map for the heatmap
 * @param {Map<string, boolean>} visibilityState - Visibility state for the heatmap
 * @param {Function} updateVisibilityCallback - Callback to update visibility state
 * @returns {Object} Legend controls with update methods
 */
export const createAttributeLegend = (
  attributeLegendRef: SVGSVGElement | null,
  sortedAnnotations: any[],
  filteredSamples: any[],
  colorMapTemp: Map<string, Map<any, string>>,
  visibilityState: Map<string, boolean>,
  updateVisibilityCallback: (key: string, newValue: boolean) => void
) => {
  if (!attributeLegendRef) return;

  const attributeLegendSvg = d3
    .select(attributeLegendRef)
    .attr('width', 200)
    .style('marginLeft', '0');

  const attributeLegend = attributeLegendSvg
    .append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(20,20)`);

  // Step 1: Group legend entries by annotation name
  const legendEntriesByAnnotation = new Map();

  // Process sortedAnnotations to create the grouping structure
  sortedAnnotations.forEach((annotation) => {
    const attributeName = annotation.name.toLowerCase();

    // Create a new array for this annotation group if it doesn't exist
    if (!legendEntriesByAnnotation.has(annotation.name)) {
      legendEntriesByAnnotation.set(annotation.name, []);
    }

    // Get all unique values for this annotation
    const uniqueValues = new Set();
    filteredSamples.forEach((sample) => {
      const sampleValue = sample.attributes[attributeName];
      if (sampleValue !== undefined) {
        uniqueValues.add(sampleValue);
      }
    });

    // Add entries for this annotation group
    Array.from(uniqueValues).forEach((value) => {
      // Use color from previously created map
      const color = colorMapTemp.get(attributeName)?.get(value);

      if (color) {
        const valueKey = `${annotation.name}:${value}`;

        legendEntriesByAnnotation.get(annotation.name).push({
          value: value?.toString() || 'Unknown',
          color: color,
          key: valueKey,
          attributeName: attributeName,
        });
      }
    });
  });

  // Clear existing legend content
  attributeLegend.selectAll('*').remove();

  // Calculate heights and spacing
  const categoryTitleHeight = 30;
  const entryHeight = 28;
  const categorySpacing = 20;

  let currentY = 0;

  // Render each annotation category with its entries
  legendEntriesByAnnotation.forEach((entries, annotationName) => {
    // Create a group for this annotation category
    const categoryGroup = attributeLegend
      .append('g')
      .attr(
        'class',
        `category-group-${annotationName.replace(/\s+/g, '-').toLowerCase()}`
      )
      .attr('transform', `translate(-14, ${currentY})`);

    // Add category title
    categoryGroup
      .append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('class', 'text-[13px] font-bold font-raleway capitalize')
      .style('fill', 'currentColor')
      .text(annotationName);

    currentY += categoryTitleHeight;

    // Add entries for this category
    entries.forEach(
      (entry: { key: any; color: string; value: any }, i: number) => {
        const entryY = currentY + i * entryHeight;
        const valueKey = entry.key;

        const entryGroup = attributeLegend
          .append('g')
          .attr(
            'class',
            `entry-group-${valueKey
              .replace(/\s+/g, '-')
              .replace(/[^\w-]/g, '_')
              .toLowerCase()}`
          )
          .attr('transform', `translate(10, ${entryY})`);

        // Add checkbox
        const checkboxSize = 16;

        const checkbox = entryGroup
          .append('rect')
          .attr('x', -23)
          .attr('y', -6)
          .attr('width', checkboxSize)
          .attr('height', checkboxSize)
          .attr('rx', 2)
          .attr('ry', 2)
          .style('fill', 'hsl(var(--background))')
          .style('stroke', 'hsl(var(--border))')
          .style('stroke-width', 1)
          .style('cursor', 'pointer');

        // Create a group for the checkmark to center it properly within the checkbox
        const checkmarkGroup = entryGroup
          .append('g')
          .attr(
            'transform',
            `translate(${-23 + checkboxSize / 2 - 4}, ${-6 + checkboxSize / 2 - 4})`
          );

        // Add a prettier SVG checkmark
        const checkmark = checkmarkGroup
          .append('svg')
          .attr('width', 8)
          .attr('height', 8)
          .attr('viewBox', '0 0 8 9')
          .attr('fill', 'none')
          .attr('pointer-events', 'none')
          .append('path')
          .attr('fill-rule', 'evenodd')
          .attr('clip-rule', 'evenodd')
          .attr(
            'd',
            'M6.90237 2.26413C7.03254 2.39431 7.03254 2.60536 6.90237 2.73554L3.2357 6.40221C3.10553 6.53238 2.89447 6.53238 2.7643 6.40221L1.09763 4.73554C0.967456 4.60536 0.967456 4.39431 1.09763 4.26414C1.22781 4.13396 1.43886 4.13396 1.56904 4.26414L3 5.6951L6.43096 2.26413C6.56114 2.13396 6.77219 2.13396 6.90237 2.26413Z'
          )
          .style('fill', 'currentColor');

        // Set initial checkbox state based on visibilityState
        const isVisible = visibilityState.get(valueKey) !== false;
        if (isVisible) {
          checkbox.style('fill', 'hsl(var(--background))');
          checkmark.style('visibility', 'visible');
        } else {
          checkbox.style('fill', 'hsl(var(--background))');
          checkmark.style('visibility', 'hidden');
        }

        checkbox.on('click', (event) => {
          event.stopPropagation();
          const currentState = visibilityState.get(valueKey) !== false;
          const newState = !currentState;

          if (newState) {
            checkbox.style('fill', 'hsl(var(--background))');
            checkmark.style('visibility', 'visible');
          } else {
            checkbox.style('fill', 'hsl(var(--background))');
            checkmark.style('visibility', 'hidden');
          }

          updateVisibilityCallback(valueKey, newState);
        });

        // Color square for the value
        entryGroup
          .append('rect')
          .attr('x', 0)
          .attr('y', -10)
          .attr('width', 24)
          .attr('height', 24)
          .attr('rx', 4)
          .attr('ry', 4)
          .style('fill', entry.color)
          .style('stroke', 'hsl(var(--border))')
          .style('stroke-width', 1);

        // Value label
        const maxTextLength = 20;
        const labelText = entry.value;

        const textElement = entryGroup
          .append('text')
          .attr('x', 30)
          .attr('y', 6)
          .attr('class', 'text-xs font-raleway font-normal')
          .style('fill', 'currentColor');

        if (labelText.length > maxTextLength) {
          // Truncate text if too long
          textElement.text(labelText.substring(0, maxTextLength) + '...');

          // Add tooltip for the full text
          entryGroup
            .style('cursor', 'pointer')
            .on('mouseover', (event) => {
              // Prevent checkbox tooltip from appearing when clicking
              if (
                event.target.tagName.toLowerCase() === 'rect' &&
                event.target.__data__ === undefined
              ) {
                return;
              }

              d3.select('body')
                .append('div')
                .attr('class', `legend-tooltip-${annotationName}-${i}`)
                .style('position', 'absolute')
                .style('visibility', 'visible')
                .style('background-color', 'hsl(var(--popover))')
                .style('padding', '5px')
                .style('border', '1px solid hsl(var(--border))')
                .style('border-radius', '4px')
                .style('font-size', '12px')
                .style('pointer-events', 'none')
                .style('z-index', '10000')
                .html(labelText)
                .style('top', `${event.pageY - 10}px`)
                .style('left', `${event.pageX + 10}px`);
            })
            .on('mousemove', (event) => {
              d3.select(`.legend-tooltip-${annotationName}-${i}`)
                .style('top', `${event.pageY - 10}px`)
                .style('left', `${event.pageX + 10}px`);
            })
            .on('mouseout', () => {
              d3.select(`.legend-tooltip-${annotationName}-${i}`).remove();
            });
        } else {
          textElement.text(labelText);
        }
      }
    );

    // Update current Y position for next category
    currentY += entries.length * entryHeight + categorySpacing;
  });

  // Set the height of the SVG based on the content
  attributeLegendSvg.attr('height', currentY);

  return {
    legendHeight: currentY,
    legendEntriesByAnnotation,
  };
};

/**
 * Creates annotation bars for the heatmap
 * @param {d3.Selection<SVGGElement, unknown, null, undefined>} container - Selection to the SVG element to render the annotation bars
 * @param {any[]} sortedAnnotations - Sorted annotations for the heatmap
 * @param {any[]} sortedVisibleSamples - Sorted visible samples for the heatmap
 * @param {Map<string, Map<any, string>>} colorMapTemp - Color map for the heatmap
 * @param {number} cellWidth - Width of each cell in the heatmap
 * @returns {Object} Annotation bars with height and spacing
 */
export const createAnnotationBars = (
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  sortedAnnotations: any[],
  sortedVisibleSamples: any[],
  colorMapTemp: Map<string, Map<any, string>>,
  cellWidth: number
) => {
  // Height of each annotation bar
  const annotationBarHeight = 16;
  // Spacing between bars
  const annotationBarSpacing = 0;
  // Total height for all annotation bars
  const totalAnnotationHeight =
    sortedAnnotations.length * (annotationBarHeight + annotationBarSpacing);

  // Draw attribute bars
  const attributeBarsGroup = container
    .append('g')
    .attr('class', 'attribute-bars')
    .attr('transform', 'translate(0, 0)');

  const marginTopBarText = 2;
  // Draw each annotation bar
  sortedAnnotations.forEach((annotation, annotationIndex) => {
    const attributeName = annotation.name.toLowerCase();

    // Create group for each annotation
    const annotationBar = attributeBarsGroup
      .append('g')
      .attr('class', `annotation-bar-${annotation.name}`)
      .attr(
        'transform',
        `translate(0, ${annotationIndex * (annotationBarHeight + annotationBarSpacing)})`
      );

    // Draw a bar for each sample
    sortedVisibleSamples.forEach((sample, sampleIndex) => {
      const value = sample.attributes[attributeName];
      // Use color from previously created map
      const fillColor = colorMapTemp.get(attributeName)?.get(value);

      annotationBar
        .append('rect')
        .attr('x', sampleIndex * cellWidth)
        .attr('y', 0)
        .attr('width', cellWidth)
        .attr('height', annotationBarHeight)
        .style('fill', fillColor || 'hsl(var(--background))')
        .append('title') // Add tooltip for each rect
        .text(`${annotation.name}: ${value}`);
    });

    // Add label for each annotation - placed on right side
    const totalWidth = sortedVisibleSamples.length * cellWidth;
    annotationBar
      .append('text')
      .attr('x', totalWidth + 5) // Place on right side of bars
      .attr('y', annotationBarHeight / 2 + marginTopBarText)
      .attr('text-anchor', 'start')
      .attr('alignment-baseline', 'middle')
      .attr('class', 'text-[13px] font-raleway font-bold capitalize')
      .text(annotation.name)
      .style('fill', 'currentColor');
  });

  return {
    totalAnnotationHeight,
    spacingBarAndChart: 8, // default spacing
  };
};

/**
 * Helper to generate color map for annotations
 */
export const generateColorMap = (
  sortedAnnotations: any[],
  filteredSamples: any[],
  metadata: any
) => {
  // Color schemes list
  const colorScheme = [
    // Main colors for contrast
    ['#F97316', '#22C55E'],
    // Colors for other annotations
    [
      '#3B82F6',
      '#EAB308',
      '#8B5CF6',
      '#D946EF',
      '#06B6D4',
      '#EF4444',
      '#10B981',
      '#F97316',
      '#0EA5E9',
      '#A21CAF',
    ],
  ];

  // Create a map to store colors
  const colorMapTemp = new Map<string, Map<any, string>>();

  // Initialize colors for all annotations and their values
  sortedAnnotations.forEach((annotation) => {
    const attributeName = annotation.name.toLowerCase();
    const isContrastAnnotation = annotation.type === 'contrast';
    const colors = isContrastAnnotation ? colorScheme[0] : colorScheme[1];

    // Create map for this annotation
    if (!colorMapTemp.has(attributeName)) {
      colorMapTemp.set(attributeName, new Map());
    }

    // Get all unique values for this annotation
    const uniqueValues = new Set();
    filteredSamples.forEach((sample) => {
      const sampleValue = sample.attributes[attributeName];
      if (sampleValue !== undefined) {
        uniqueValues.add(sampleValue);
      }
    });

    // Assign color to each value
    Array.from(uniqueValues).forEach((value, valueIndex) => {
      if (value !== undefined) {
        if (isContrastAnnotation && colors) {
          const isAlternateLevel = value === metadata.alternate_level;
          colorMapTemp
            .get(attributeName)!
            // @ts-ignore: We've already checked that value is not undefined
            .set(String(value), isAlternateLevel ? colors[0] : colors[1]);
        } else if (colors) {
          // For other annotations, distribute colors by order
          colorMapTemp
            .get(attributeName)!
            // @ts-ignore: We've already checked that value is not undefined
            .set(String(value), colors[valueIndex % colors.length]);
        }
      }
    });
  });

  return colorMapTemp;
};

/**
 * Creates x-axis for the heatmap
 * @param {SVGSVGElement | null} xAxisRef - Reference to the SVG element to render the x-axis
 * @param {any[]} sortedVisibleSamples - Sorted visible samples for the heatmap
 * @param {number} cellWidth - Width of each cell in the heatmap
 * @param {number} width - Width of the heatmap
 * @param {number} totalAnnotationHeight - Total height of the annotation bars
 * @returns {void}
 */
export const createXAxis = (
  xAxisRef: SVGSVGElement | null,
  sortedVisibleSamples: any[],
  cellWidth: number,
  width: number,
  totalAnnotationHeight: number
) => {
  if (!xAxisRef) return;

  const xAxisSvg = d3
    .select(xAxisRef)
    .attr('width', width)
    .attr('height', 40)
    .style('overflow', 'visible')
    .style('top', totalAnnotationHeight - 30)
    .style('position', 'relative');

  // Clear existing content
  xAxisSvg.selectAll('*').remove();

  // Remove any existing tooltips to prevent duplicates
  d3.selectAll('.sample-tooltip').remove();

  const xAxisGroup = xAxisSvg.append('g').attr('class', 'x-axis');

  // Calculate the maximum width for each label
  const maxLabelWidth = cellWidth - 2;

  // Create x-axis labels
  sortedVisibleSamples.forEach((sample, index) => {
    const sampleId = sample.id;
    const shouldRotate = sampleId.length > 3;

    const textElement = xAxisGroup
      .append('text')
      .attr('x', index * cellWidth + cellWidth / 2)
      .attr('y', 10)
      .attr('text-anchor', shouldRotate ? 'end' : 'middle')
      .attr(
        'transform',
        shouldRotate
          ? `rotate(-45, ${index * cellWidth + cellWidth / 2}, 0)`
          : ''
      )
      .attr('class', 'text-xs font-raleway')
      .style('fill', 'currentColor')
      .text(sampleId);

    // Check and truncate text if needed
    const node = textElement.node();
    if (node) {
      const textLength = node.getComputedTextLength();
      if (textLength > maxLabelWidth) {
        let truncatedText = sampleId;
        let currentNode = node;

        while (
          truncatedText.length > 10 &&
          currentNode.getComputedTextLength() > maxLabelWidth
        ) {
          truncatedText = truncatedText.slice(0, -1);
          textElement.text(truncatedText + '...');
          const updatedNode = textElement.node();
          if (!updatedNode) break;
          currentNode = updatedNode;
        }

        // Add tooltip for truncated sample IDs
        textElement
          .style('cursor', 'pointer')
          .on('mouseover', (event) => {
            // Remove any existing tooltip first to prevent duplicates
            d3.selectAll('.sample-tooltip').remove();

            d3.select('body')
              .append('div')
              .attr('class', 'sample-tooltip')
              .style('position', 'absolute')
              .style('visibility', 'visible')
              .style('background-color', 'hsl(var(--background))')
              .style('padding', '5px')
              .style('border', '1px solid hsl(var(--border))')
              .style('border-radius', '4px')
              .style('font-size', '12px')
              .style('pointer-events', 'none')
              .style('z-index', '10000')
              .html(sampleId)
              .style('top', `${event.pageY - 10}px`)
              .style('left', `${event.pageX + 10}px`);
          })
          .on('mousemove', (event) => {
            const tooltip = d3.select('.sample-tooltip');
            if (!tooltip.empty()) {
              tooltip
                .style('top', `${event.pageY - 10}px`)
                .style('left', `${event.pageX + 10}px`);
            }
          })
          .on('mouseout', () => {
            d3.selectAll('.sample-tooltip').remove();
          });
      }
    }
  });
};

/**
 * Creates y-axis for the heatmap (gene labels)
 * @param {d3.Selection<SVGGElement, unknown, null, undefined>} container - Selection to the SVG element to render the y-axis
 * @param {any[]} filteredGenes - Filtered genes for the heatmap
 * @param {number} totalAnnotationHeight - Total height of the annotation bars
 * @param {number} cellHeight - Height of each cell in the heatmap
 * @param {number} spacingBarAndChart - Spacing between the annotation bars and the heatmap
 * @returns {d3.Selection<SVGGElement, unknown, null, undefined>} y-axis group
 */
export const createYAxis = (
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  filteredGenes: any[],
  totalAnnotationHeight: number,
  cellHeight: number,
  spacingBarAndChart: number = 8
) => {
  const isSmallGeneSet = filteredGenes.length <= 50;

  // Remove any existing tooltips to prevent duplicates
  d3.selectAll('.gene-tooltip').remove();

  const yAxisGroup = container
    .append('g')
    .attr(
      'transform',
      `translate(0, ${totalAnnotationHeight + spacingBarAndChart})`
    )
    .attr('class', 'y-axis');

  if (isSmallGeneSet) {
    yAxisGroup
      .append('text')
      .attr('x', -5)
      .attr('y', -10)
      .attr('text-anchor', 'end')
      .attr('alignment-baseline', 'middle')
      .attr('class', 'text-[13px] font-bold font-raleway capitalize')
      .style('fill', 'currentColor');

    const maxTextWidth = 70;

    filteredGenes.forEach((gene, index) => {
      const textElement = yAxisGroup
        .append('text')
        .attr('x', -5)
        .attr('y', index * cellHeight + cellHeight / 2)
        .attr('text-anchor', 'end')
        .attr('alignment-baseline', 'middle')
        .attr('class', 'text-[10px] font-medium font-raleway')
        .style('fill', 'currentColor')
        .text(gene.displayName || gene.name);

      const node = textElement.node();
      if (node) {
        const textLength = node.getComputedTextLength();
        if (textLength > maxTextWidth) {
          let truncatedText = gene.displayName || gene.name;
          let currentNode = node;

          while (
            truncatedText.length > 3 &&
            currentNode.getComputedTextLength() > maxTextWidth
          ) {
            truncatedText = truncatedText.slice(0, -1);
            textElement.text(truncatedText + '...');
            const updatedNode = textElement.node();
            if (!updatedNode) break;
            currentNode = updatedNode;
          }

          // Add tooltip for truncated gene names
          textElement
            .style('cursor', 'pointer')
            .on('mouseover', (event) => {
              // Remove any existing tooltip first to prevent duplicates
              d3.selectAll('.gene-tooltip').remove();

              d3.select('body')
                .append('div')
                .attr('class', 'gene-tooltip')
                .style('position', 'absolute')
                .style('visibility', 'visible')
                .style('background-color', 'hsl(var(--background))')
                .style('padding', '5px')
                .style('border', '1px solid hsl(var(--border))')
                .style('border-radius', '4px')
                .style('font-size', '12px')
                .style('pointer-events', 'none')
                .style('z-index', '10000')
                .html(gene.displayName || gene.name)
                .style('top', `${event.pageY - 10}px`)
                .style('left', `${event.pageX + 10}px`);
            })
            .on('mousemove', (event) => {
              const tooltip = d3.select('.gene-tooltip');
              if (!tooltip.empty()) {
                tooltip
                  .style('top', `${event.pageY - 10}px`)
                  .style('left', `${event.pageX + 10}px`);
              }
            })
            .on('mouseout', () => {
              d3.selectAll('.gene-tooltip').remove();
            });
        }
      }
    });
  }

  return yAxisGroup;
};
