"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import * as d3 from "d3";
import { Button } from "@/components/ui/button";
import { transformNetworkData } from "@/lib/utils";
import {
  getChartDimensions,
  hasSignificantDimensionChange,
  createDebouncedResizeHandler,
} from "./chart-utils";
import { Spinner } from "@/components/ui/spinner";

interface NetworkData {
  nodes: {
    data: any[][];
  };
  edges: {
    data: any[][];
  };
}

interface ContainerRef {
  svg: any;
  zoom: any;
  simulation?: any;
}

interface X2KNetworkChartProps {
  networkData: any;
  refChart: React.RefObject<HTMLDivElement>;
  isLoading?: boolean;
  isZoomed?: boolean;
  pinnedNodeIds?: Set<string>;
  onPinnedNodeIdsChange?: (pinnedNodeIds: Set<string>) => void;
}

export const X2KNetworkChart: React.FC<X2KNetworkChartProps> = ({
  networkData,
  refChart,
  isLoading = false,
  isZoomed = false,
  pinnedNodeIds: externalPinnedNodeIds,
  onPinnedNodeIdsChange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<ContainerRef | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD = 10;

  const getNetworkChartHeight = () => {
    if (isZoomed) {
      return Math.min(600, window.innerHeight * 0.75);
    } else {
      return 450;
    }
  };

  const chartHeight = getNetworkChartHeight();
  const [dimensions, setDimensions] = useState({
    width: isZoomed ? 1200 : 800,
    height: chartHeight,
  });

  const [data, setData] = useState<NetworkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const [internalPinnedNodeIds, setInternalPinnedNodeIds] = useState<
    Set<string>
  >(new Set());

  const pinnedNodeIds = externalPinnedNodeIds ?? internalPinnedNodeIds;
  const setPinnedNodeIds = onPinnedNodeIdsChange ?? setInternalPinnedNodeIds;

  const pinnedNodeIdsRef = useRef<Set<string>>(pinnedNodeIds);

  useEffect(() => {
    pinnedNodeIdsRef.current = pinnedNodeIds;
  }, [pinnedNodeIds]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  const processedData = useMemo(() => {
    if (!networkData) return null;

    try {
      const dataToTransform = networkData.data || networkData;
      const result = transformNetworkData(dataToTransform);

      if (!result.nodes || !result.edges) {
        throw new Error("Invalid data format received from networkData prop");
      }

      return {
        nodes: {
          data: result.nodes.map((node) => [
            node.id,
            node.label,
            node.type,
            node.score || 0,
            node.layer || 1,
          ]),
        },
        edges: {
          data: result.edges.map((edge) => [
            edge.source?.id || edge.source,
            edge.target?.id || edge.target,
            edge.type || "PPI",
            edge.weight || 1,
          ]),
        },
      };
    } catch (err: any) {
      console.error("Error processing X2K data:", err);
      setError(err.message);
      return null;
    }
  }, [networkData]);

  useEffect(() => {
    setData(processedData);
    if (processedData) {
      setError(null);
    }
  }, [processedData]);

  const handleResize = useCallback(() => {
    const newDimensions = getChartDimensions(isZoomed, refChart, chartHeight);

    setDimensions((prev) => {
      if (hasSignificantDimensionChange(prev, newDimensions)) {
        return newDimensions;
      }
      return prev;
    });
  }, [refChart, chartHeight, isZoomed, isLoading]);

  useEffect(() => {
    const cleanup = createDebouncedResizeHandler(handleResize);
    return cleanup;
  }, [handleResize]);

  const getNodeRadius = useCallback((d: any) => {
    const baseRadius = 15;
    const scoreMultiplier = Math.max(0.5, Math.min(2, d.score || 1));

    if (d.type === "transcription_factor")
      return baseRadius * 1.5 * scoreMultiplier;
    if (d.type === "kinase") return baseRadius * 1.3 * scoreMultiplier;
    return baseRadius * scoreMultiplier;
  }, []);

  const isPinned = useCallback((nodeId: string): boolean => {
    return pinnedNodeIdsRef.current.has(nodeId);
  }, []);

  // Helper function to apply pin and hover styling
  const applyNodeStyling = useCallback(
    (
      linkElements: any,
      nodeElements: any,
      currentHoveredNodeId: string | null,
      currentPinnedNodeIds: Set<string>
    ) => {
      if (currentHoveredNodeId) {
        const hoveredConnectedNodeIds = new Set([currentHoveredNodeId]);
        linkElements.each(function (linkData: any) {
          if (linkData.source.id === currentHoveredNodeId) {
            hoveredConnectedNodeIds.add(linkData.target.id);
          }
          if (linkData.target.id === currentHoveredNodeId) {
            hoveredConnectedNodeIds.add(linkData.source.id);
          }
        });

        linkElements
          .style("display", (l: any) => {
            const isConnectedToHoveredNode =
              l.source.id === currentHoveredNodeId ||
              l.target.id === currentHoveredNodeId;
            return isConnectedToHoveredNode ? "block" : "none";
          })
          .style("stroke-opacity", (l: any) => {
            const isConnectedToHoveredNode =
              l.source.id === currentHoveredNodeId ||
              l.target.id === currentHoveredNodeId;
            if (isConnectedToHoveredNode) {
              const isKinaseConnection =
                l.source.type === "kinase" || l.target.type === "kinase";
              return isKinaseConnection ? 0.8 : 1;
            }
            return 0;
          });

        nodeElements
          .select("circle")
          .style("opacity", (n: any) =>
            hoveredConnectedNodeIds.has(n.id) ? 1 : 0.3
          )
          .style("fill", (n: any) => {
            if (n.type === "transcription_factor") return "#E94549";
            if (n.type === "kinase") return "#607AAC";
            if (hoveredConnectedNodeIds.has(n.id)) {
              return "hsl(var(--chart-highlight-node))";
            }
            return "hsl(var(--chart-intermediate-protein))";
          });
      } else if (currentPinnedNodeIds.size > 0) {
        const highlightedNodeIds = new Set(currentPinnedNodeIds);

        linkElements.each(function (linkData: any) {
          if (currentPinnedNodeIds.has(linkData.source.id)) {
            highlightedNodeIds.add(linkData.target.id);
          }
          if (currentPinnedNodeIds.has(linkData.target.id)) {
            highlightedNodeIds.add(linkData.source.id);
          }
        });

        linkElements
          .style("display", (l: any) => {
            const showLink =
              currentPinnedNodeIds.has(l.source.id) ||
              currentPinnedNodeIds.has(l.target.id);
            return showLink ? "block" : "none";
          })
          .style("stroke-opacity", (l: any) => {
            const isActiveLink =
              currentPinnedNodeIds.has(l.source.id) ||
              currentPinnedNodeIds.has(l.target.id);
            if (isActiveLink) {
              const isKinaseConnection =
                l.source.type === "kinase" || l.target.type === "kinase";
              return isKinaseConnection ? 0.8 : 1;
            }
            return 0;
          });

        nodeElements
          .select("circle")
          .style("opacity", (n: any) => {
            if (highlightedNodeIds.has(n.id)) return 1;
            if (n.type === "transcription_factor" || n.type === "kinase")
              return 0.3;
            return 0;
          })
          .style("fill", (n: any) => {
            if (n.type === "transcription_factor") return "#E94549";
            if (n.type === "kinase") return "#607AAC";
            if (
              currentPinnedNodeIds.has(n.id) ||
              highlightedNodeIds.has(n.id)
            ) {
              return "hsl(var(--chart-highlight-node))";
            }
            return "hsl(var(--chart-intermediate-protein))";
          })
          .style("stroke", (n: any) =>
            currentPinnedNodeIds.has(n.id)
              ? "hsl(var(--chart-highlight-node))"
              : "none"
          )
          .style("stroke-width", (n: any) =>
            currentPinnedNodeIds.has(n.id) ? 0 : 0
          );
      } else {
        linkElements
          .style("display", "block")
          .style("stroke-opacity", (l: any) => {
            const isKinaseConnection =
              l.source.type === "kinase" || l.target.type === "kinase";
            return isKinaseConnection ? 0.6 : 0.25;
          });
        nodeElements
          .select("circle")
          .style("opacity", 1)
          .style("fill", (n: any) => {
            switch (n.type) {
              case "transcription_factor":
                return "#E94549";
              case "kinase":
                return "#607AAC";
              default:
                return "hsl(var(--chart-intermediate-protein))";
            }
          })
          .style("stroke", "none")
          .style("stroke-width", 0);
      }
    },
    []
  );

  const handleNodeClickWithoutSimulation = useCallback(
    (event: any, d: any) => {
      const currentPinnedNodes = pinnedNodeIdsRef.current;

      const frozenX = d.x;
      const frozenY = d.y;
      d.vx = 0;
      d.vy = 0;
      d.fx = null;
      d.fy = null;

      const newPinnedNodes = new Set(currentPinnedNodes);

      if (isPinned(d.id)) {
        newPinnedNodes.delete(d.id);
      } else {
        newPinnedNodes.add(d.id);
      }

      d.x = frozenX;
      d.y = frozenY;

      setPinnedNodeIds(newPinnedNodes);

      // Apply styling immediately after pin state change
      const svg = d3.select(svgRef.current);
      const linkElements = svg.selectAll(".links line");
      const nodeElements = svg.selectAll(".nodes .node");
      if (linkElements.size() > 0 && nodeElements.size() > 0) {
        applyNodeStyling(
          linkElements,
          nodeElements,
          hoveredNodeId,
          newPinnedNodes
        );
      }
    },
    [isPinned, getNodeRadius, setPinnedNodeIds, hoveredNodeId, applyNodeStyling]
  );

  useEffect(() => {
    if (
      !data ||
      !data.nodes ||
      !data.edges ||
      !data.nodes.data ||
      !data.edges.data
    )
      return;

    if (containerRef.current?.simulation) {
      containerRef.current.simulation.stop();
    }

    const svg = d3.select(svgRef.current as SVGSVGElement);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const zoom = d3.zoom().on("zoom", (event) => {
      container.attr("transform", event.transform);
    });

    (svg as any).call(zoom);

    const container = svg.append("g");

    const LAYER_HEIGHT = height / 5;
    const LAYER_POSITIONS = {
      kinase: LAYER_HEIGHT * 0.8,
      intermediate: LAYER_HEIGHT * 2.5,
      transcription_factor: LAYER_HEIGHT * 4.2,
    };

    const allNodes = data.nodes.data.map((nodeArray: any, index: number) => {
      const nodeType = nodeArray[2] || "intermediate";
      const layerY =
        LAYER_POSITIONS[nodeType as keyof typeof LAYER_POSITIONS] ||
        LAYER_POSITIONS.intermediate;

      const randomOffset =
        nodeType === "intermediate"
          ? (Math.random() - 0.5) * 10
          : (Math.random() - 0.5) * 20;

      return {
        id: nodeArray[0],
        label: nodeArray[1],
        type: nodeType,
        score: nodeArray[3] || 0,
        layer: nodeArray[4] || 1,
        index,
        x: Math.random() * (width - 100) + 50,
        y: layerY + randomOffset,
        vx: 0,
        vy: 0,
      };
    });

    const nodeMap = new Map();
    allNodes.forEach((node: any) => nodeMap.set(node.id, node));

    const links = data.edges.data
      .map((edgeArray: any) => {
        const sourceId = edgeArray[0];
        const targetId = edgeArray[1];
        const sourceNode = nodeMap.get(sourceId);
        const targetNode = nodeMap.get(targetId);

        if (sourceNode && targetNode) {
          return {
            source: sourceNode,
            target: targetNode,
            type: edgeArray[2] || "PPI",
            weight: edgeArray[3] || 1,
          };
        }
        return null;
      })
      .filter((link: any) => link !== null) as any[];

    const connectedNodeIds = new Set();
    links.forEach((link: any) => {
      connectedNodeIds.add(link.source.id);
      connectedNodeIds.add(link.target.id);
    });

    const nodes = allNodes.filter((node: any) => connectedNodeIds.has(node.id));

    const simulation = d3
      .forceSimulation(nodes)
      .alphaDecay(0.05)
      .velocityDecay(0.8)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance((d: any) => {
            const sourceLayer = d.source.type;
            const targetLayer = d.target.type;

            if (sourceLayer !== targetLayer) {
              if (
                sourceLayer === "intermediate" ||
                targetLayer === "intermediate"
              ) {
                return 120;
              }
              return 180;
            }

            if (sourceLayer === "intermediate") {
              return 30;
            }
            return 50;
          })
          .strength(0.3)
          .iterations(1)
      )
      .force(
        "charge",
        d3.forceManyBody().strength(-100).distanceMax(200).theta(0.9)
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3
          .forceCollide()
          .radius((d: any) => {
            const baseRadius = getNodeRadius(d);
            return d.type === "intermediate" ? baseRadius + 8 : baseRadius + 15;
          })
          .strength(0.9)
          .iterations(1)
      )
      .force(
        "y",
        d3
          .forceY((d: any) => {
            const layerY =
              LAYER_POSITIONS[d.type as keyof typeof LAYER_POSITIONS];
            return layerY || LAYER_POSITIONS.intermediate;
          })
          .strength(2.0)
      )
      .force("x", d3.forceX(width / 2).strength(0.03));

    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .style("stroke", (d: any) => {
        const isKinaseConnection =
          d.source.type === "kinase" || d.target.type === "kinase";

        if (isKinaseConnection) {
          return "#14532D";
        }

        return "#6B7280";
      })
      .style("stroke-opacity", (d: any) => {
        const isKinaseConnection =
          d.source.type === "kinase" || d.target.type === "kinase";

        if (isKinaseConnection) {
          return 0.6;
        }

        return 0.25;
      })
      .attr("stroke-width", (d: any) => {
        if (d.type === "phosphorylation") return 2;
        return 1.5;
      })

      .attr("stroke-dasharray", (d: any) => {
        if (d.type === "phosphorylation") return "5,5";
        return null;
      });

    const drag = d3
      .drag<SVGGElement, any>()
      .on("start", function (event, d: any) {
        dragStartPositionRef.current = { x: d.x, y: d.y };
        setIsDragging(false);
        isDraggingRef.current = false;

        d3.select(this).raise();
        d3.select(this)
          .select("circle")
          .attr("stroke", "#999")
          .attr("stroke-width", 1);
      })
      .on("drag", function (event, d: any) {
        if (!dragStartPositionRef.current) return;

        const targetX = event.x;
        const targetY = event.y;
        const distance = Math.sqrt(
          Math.pow(targetX - dragStartPositionRef.current.x, 2) +
            Math.pow(targetY - dragStartPositionRef.current.y, 2)
        );

        if (distance > DRAG_THRESHOLD && !isDraggingRef.current) {
          setIsDragging(true);
          isDraggingRef.current = true;

          if (!event.active) simulation.alphaTarget(0.1).restart();

          d3.select(this)
            .select("circle")
            .attr("stroke", "#333")
            .attr("stroke-width", 3);
        }

        if (isDraggingRef.current) {
          const nodeRadius = getNodeRadius(d);
          const layerY =
            LAYER_POSITIONS[d.type as keyof typeof LAYER_POSITIONS];

          const newX = Math.max(
            nodeRadius + 10,
            Math.min(width - nodeRadius - 10, event.x)
          );

          let newY;
          if (layerY) {
            const tolerance = d.type === "intermediate" ? 15 : 25;
            newY = Math.max(
              layerY - tolerance,
              Math.min(layerY + tolerance, event.y)
            );
          } else {
            newY = Math.max(
              nodeRadius + 10,
              Math.min(height - nodeRadius - 10, event.y)
            );
          }

          d.x = newX;
          d.y = newY;
          d.fx = newX;
          d.fy = newY;

          d3.select(this).attr("transform", `translate(${newX},${newY})`);

          container.selectAll(".links line").each(function (linkData: any) {
            if (linkData.source === d || linkData.target === d) {
              d3.select(this)
                .attr("x1", linkData.source.x)
                .attr("y1", linkData.source.y)
                .attr("x2", linkData.target.x)
                .attr("y2", linkData.target.y);
            }
          });
        }
      })
      .on("end", function (event, d: any) {
        let finalDistance = 0;
        if (dragStartPositionRef.current) {
          finalDistance = Math.sqrt(
            Math.pow(d.x - dragStartPositionRef.current.x, 2) +
              Math.pow(d.y - dragStartPositionRef.current.y, 2)
          );
        }

        const hasPositionConstraints = d.fx !== null && d.fx !== undefined;
        const isActualDrag =
          isDraggingRef.current &&
          finalDistance > DRAG_THRESHOLD &&
          hasPositionConstraints;

        if (isActualDrag) {
          simulation.alpha(0.3).alphaTarget(0).alphaDecay(0.08).restart();

          setTimeout(() => {
            if (simulation.alpha() > 0.01) {
              simulation.alphaTarget(0);
            }
            simulation.alphaDecay(0.05);
          }, 1500);
        } else {
          if (!event.active) simulation.alphaTarget(0);

          if (dragStartPositionRef.current) {
            d.x = dragStartPositionRef.current.x;
            d.y = dragStartPositionRef.current.y;
            d.vx = 0;
            d.vy = 0;
          }

          d.fx = null;
          d.fy = null;

          handleNodeClickWithoutSimulation(event, d);
        }

        d3.select(this)
          .select("circle")
          .attr("stroke", "none")
          .attr("stroke-width", 0);

        setTimeout(() => {
          setIsDragging(false);
          isDraggingRef.current = false;
          dragStartPositionRef.current = null;
        }, 200);
      });

    const node = container
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("data-node-id", (d: any) => d.id)
      .style("cursor", "pointer")
      .call(drag);

    node
      .append("circle")
      .attr("r", (d: any) => getNodeRadius(d))
      .style("fill", (d: any) => {
        switch (d.type) {
          case "transcription_factor":
            return "#E94549";
          case "kinase":
            return "#607AAC";
          case "intermediate":
            return "hsl(var(--chart-intermediate-protein))";
          case "phosphorylation":
            return "hsl(var(--chart-intermediate-protein))";
          default:
            return "hsl(var(--chart-intermediate-protein))";
        }
      })
      .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.1))")
      .style("opacity", 1);

    node
      .append("text")
      .text((d: any) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .attr("font-size", (d: any) => {
        if (d.type === "transcription_factor") return "10px";
        if (d.type === "kinase") return "10px";
        return "10px";
      })
      .attr("font-weight", (d: any) => {
        if (d.type === "transcription_factor") return "600";
        if (d.type === "kinase") return "400";
        return "400";
      })
      .attr("fill", (d: any) => {
        if (d.type === "transcription_factor") return "currentColor";
        if (d.type === "kinase") return "currentColor";
        return "currentColor";
      })
      .style("pointer-events", "none")
      .style("user-select", "none");

    let lastHoveredNode: any = null;

    node
      .on("mouseover", function (_event: any, d: any) {
        if (lastHoveredNode === d.id) return;
        lastHoveredNode = d.id;

        setHoveredNodeId(d.id);
        // Apply styling immediately for hover
        applyNodeStyling(link, node, d.id, pinnedNodeIds);
      })
      .on("mouseout", function () {
        lastHoveredNode = null;

        setHoveredNodeId(null);
        // Apply styling immediately when hover ends
        applyNodeStyling(link, node, null, pinnedNodeIds);
      });

    // Apply initial pin and hover styling
    applyNodeStyling(link, node, hoveredNodeId, pinnedNodeIds);

    let animationId: number | null = null;

    simulation.on("tick", () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }

      animationId = requestAnimationFrame(() => {
        nodes.forEach((d: any) => {
          const nodeRadius = getNodeRadius(d);
          const layerY =
            LAYER_POSITIONS[d.type as keyof typeof LAYER_POSITIONS];

          d.x = Math.max(
            nodeRadius + 10,
            Math.min(width - nodeRadius - 10, d.x)
          );

          if (layerY) {
            const tolerance = d.type === "intermediate" ? 15 : 25;
            d.y = Math.max(
              layerY - tolerance,
              Math.min(layerY + tolerance, d.y)
            );
          }

          d.y = Math.max(
            nodeRadius + 10,
            Math.min(height - nodeRadius - 10, d.y)
          );
        });

        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);

        animationId = null;
      });
    });

    setTimeout(() => {
      if (simulation.alpha() > 0.01) {
        simulation.stop();
      }
    }, 10000);

    if (containerRef.current !== null) {
      containerRef.current = { svg, zoom, simulation };
    } else {
      containerRef.current = { svg, zoom, simulation };
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      simulation.stop();
    };
  }, [data, dimensions, getNodeRadius]);

  // Update styling when hover or pin state changes
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const linkElements = svg.selectAll(".links line");
    const nodeElements = svg.selectAll(".nodes .node");

    if (linkElements.size() === 0 || nodeElements.size() === 0) {
      return;
    }

    applyNodeStyling(linkElements, nodeElements, hoveredNodeId, pinnedNodeIds);
  }, [hoveredNodeId, pinnedNodeIds, applyNodeStyling]);

  const handleZoomIn = useCallback(() => {
    if (containerRef.current) {
      const { svg, zoom } = containerRef.current;
      (svg as any).transition().duration(300).call(zoom.scaleBy, 1.5);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (containerRef.current) {
      const { svg, zoom } = containerRef.current;
      (svg as any)
        .transition()
        .duration(300)
        .call(zoom.scaleBy, 1 / 1.5);
    }
  }, []);

  const handleReset = useCallback(() => {
    setPinnedNodeIds(new Set());

    setHoveredNodeId(null);

    if (containerRef.current) {
      const { svg, zoom, simulation } = containerRef.current;

      (svg as any)
        .transition()
        .duration(500)
        .call(zoom.transform, d3.zoomIdentity);

      if (simulation) {
        const nodes = simulation.nodes();
        const width = dimensions.width;
        const height = dimensions.height;

        const LAYER_HEIGHT = height / 5;
        const LAYER_POSITIONS = {
          kinase: LAYER_HEIGHT * 0.8,
          intermediate: LAYER_HEIGHT * 2.5,
          transcription_factor: LAYER_HEIGHT * 4.2,
        };

        nodes.forEach((node: any) => {
          node.fx = null;
          node.fy = null;
          node.vx = 0;
          node.vy = 0;

          const nodeType = node.type || "intermediate";
          const layerY =
            LAYER_POSITIONS[nodeType as keyof typeof LAYER_POSITIONS] ||
            LAYER_POSITIONS.intermediate;
          const randomOffset =
            nodeType === "intermediate"
              ? (Math.random() - 0.5) * 10
              : (Math.random() - 0.5) * 20;

          node.x = Math.random() * (width - 100) + 50;
          node.y = layerY + randomOffset;
        });

        simulation.alpha(1.0).alphaDecay(0.05).alphaTarget(0).restart();

        setTimeout(() => {
          if (simulation.alpha() > 0.01) {
            simulation.stop();
          }
        }, 8000);
      }
    }
  }, [setPinnedNodeIds, dimensions.width, dimensions.height]);

  useEffect(() => {
    return () => {
      if (containerRef.current?.simulation) {
        containerRef.current.simulation.stop();
      }
    };
  }, []);

  if (!networkData && !isLoading) {
    return (
      <div className="flex h-[384px] flex-1 items-center justify-center">
        <p className="text-gray-500">
          No X2K network data available to display.
        </p>
      </div>
    );
  }

  // Check if data exists but is empty (nodes and edges arrays are empty)
  if (
    data &&
    data.nodes &&
    data.edges &&
    data.nodes.data &&
    data.edges.data &&
    data.nodes.data.length === 0 &&
    data.edges.data.length === 0 &&
    !isLoading
  ) {
    return (
      <div className="flex h-[384px] flex-1 items-center justify-center">
        <p className="text-gray-500">
          No X2K network data available to display.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full flex-1">
        <div className="py-8 text-center">
          <div className="mb-2 text-lg font-semibold text-red-500">
            Error Loading X2K Data
          </div>
          <div className="mb-4 text-gray-600">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={refChart}
      className="bg-background mx-auto flex w-full flex-1 flex-col border border-transparent"
    >
      <div className="relative flex-1 overflow-hidden rounded-lg">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-90">
            <div className="flex items-center gap-3">
              <Spinner />
              <div className="text-gray-600">Loading X2K network data...</div>
            </div>
          </div>
        )}

        <svg ref={svgRef} className="block w-full"></svg>
      </div>

      <div className="flex items-end justify-between gap-2 pt-4">
        <div className="flex items-center rounded-md">
          <Button
            onClick={handleZoomIn}
            className="border-border !size-7 !min-w-7 !rounded-l-md !rounded-r-none border !bg-transparent"
            data-html2canvas-ignore
            variant="onlyOneIcon"
            icon="plusIcon"
            classNameIcon="w-4 h-4"
            disabled={isLoading}
            title="Zoom In"
          ></Button>
          <Button
            onClick={handleZoomOut}
            className="!border-border !size-7 !min-w-7 !rounded-l-none !rounded-r-md border !bg-transparent"
            data-html2canvas-ignore
            variant="onlyOneIcon"
            icon="minusIcon"
            classNameIcon="w-5 h-5"
            disabled={isLoading}
            title="Zoom Out"
          ></Button>
          <Button
            onClick={handleReset}
            className="ml-2 !size-7 !min-w-7 !bg-[hsl(var(--chart-intermediate-protein))]"
            iconOnly
            data-html2canvas-ignore
            variant="onlyOneIcon"
            shape="rounded"
            icon="resetIcon"
            classNameIcon="w-4 h-4"
            disabled={isLoading}
            width="auto"
          ></Button>
        </div>

        <div className="flex items-center gap-4 pb-1.5">
          <div className="flex items-center">
            <svg width="130" height="20">
              <circle cx="8" cy="10" r="8" fill="#E94549" />
              <text
                x="24"
                y="10"
                dominantBaseline="central"
                textAnchor="start"
                fontSize="11"
                fontFamily="Raleway, sans-serif"
                fill="currentColor"
              >
                Transcription Factor
              </text>
            </svg>
          </div>
          <div className="flex items-center">
            <svg width="130" height="20">
              <circle
                cx="8"
                cy="10"
                r="8"
                style={{ fill: "hsl(var(--chart-intermediate-protein))" }}
              />
              <text
                x="24"
                y="10"
                dominantBaseline="central"
                textAnchor="start"
                fontSize="11"
                fontFamily="Raleway, sans-serif"
                fill="currentColor"
              >
                Intermediate Protein
              </text>
            </svg>
          </div>
          <div className="flex items-center">
            <svg width="60" height="20">
              <circle cx="8" cy="10" r="8" fill="#607AAC" />
              <text
                x="24"
                y="10"
                dominantBaseline="central"
                textAnchor="start"
                fontSize="11"
                fontFamily="Raleway, sans-serif"
                fill="currentColor"
              >
                Kinase
              </text>
            </svg>
          </div>
          <div className="flex items-center">
            <svg width="100" height="20">
              <line
                x1="2"
                y1="10"
                x2="22"
                y2="10"
                stroke="#14532D"
                strokeWidth="2"
              />
              <text
                x="26"
                y="10"
                dominantBaseline="central"
                textAnchor="start"
                fontSize="11"
                fontFamily="Raleway, sans-serif"
                fill="currentColor"
              >
                Phosphorylation
              </text>
            </svg>
          </div>
          <div className="flex items-center">
            <svg width="45" height="20">
              <line
                x1="2"
                y1="10"
                x2="22"
                y2="10"
                style={{ stroke: "#6B7280", strokeOpacity: 0.25 }}
                strokeWidth="2"
              />
              <text
                x="26"
                y="10"
                dominantBaseline="central"
                textAnchor="start"
                fontSize="11"
                fontFamily="Raleway, sans-serif"
                fill="currentColor"
              >
                PPI
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
