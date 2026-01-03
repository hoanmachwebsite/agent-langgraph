'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface TooltipHook {
  showTooltip: (event: any, content: string) => void;
  moveTooltip: (event: any) => void;
  hideTooltip: () => void;
}

const useTooltip = (): TooltipHook => {
  const tooltipRef = useRef<d3.Selection<
    HTMLDivElement,
    unknown,
    HTMLElement,
    any
  > | null>(null);

  useEffect(() => {
    if (!tooltipRef.current) {
      // Create tooltip if it doesn't exist
      tooltipRef.current = d3
        .select('body')
        .append('div')
        .attr('class', 'visualization-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', 'white')
        .style('color', 'black')
        .style('padding', '8px')
        .style('border', '1px solid #ddd')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('box-shadow', '0 1px 3px rgba(0,0,0,0.1)')
        .style('pointer-events', 'none')
        .style('z-index', '1000');
    }

    // Clean up tooltip when component unmounts
    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.remove();
        tooltipRef.current = null;
      }
    };
  }, []);

  const showTooltip = (event: any, content: string) => {
    if (!tooltipRef.current) return;

    tooltipRef.current
      .style('visibility', 'visible')
      .html(content)
      .style('top', `${event.pageY - 10}px`)
      .style('left', `${event.pageX + 10}px`);
  };

  const moveTooltip = (event: any) => {
    if (!tooltipRef.current) return;

    tooltipRef.current
      .style('top', `${event.pageY - 10}px`)
      .style('left', `${event.pageX + 10}px`);
  };

  const hideTooltip = () => {
    if (!tooltipRef.current) return;

    tooltipRef.current.style('visibility', 'hidden');
  };

  return { showTooltip, moveTooltip, hideTooltip };
};

export default useTooltip;
