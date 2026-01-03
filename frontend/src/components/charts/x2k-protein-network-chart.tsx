"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { Button } from "@/components/ui/button";
import { transformNetworkData } from "@/lib/utils";
import {
  getChartDimensions,
  hasSignificantDimensionChange,
  createDebouncedResizeHandler,
} from "./chart-utils";
import { Spinner } from "@/components/ui/spinner";

interface X2KProteinNetworkChartProps {
  networkData: any;
  refChart: React.RefObject<HTMLDivElement>;
  isLoading?: boolean;
  isZoomed?: boolean;
  pinnedNodeIds?: Set<string>;
  onPinnedNodeIdsChange?: (pinnedNodeIds: Set<string>) => void;
}

export const X2KProteinNetworkChart: React.FC<X2KProteinNetworkChartProps> = ({
  networkData,
  refChart,
  isLoading = false,
  isZoomed = false,
  pinnedNodeIds: externalPinnedNodeIds,
  onPinnedNodeIdsChange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<{ svg: any; zoom: any; simulation?: any }>({
    svg: null,
    zoom: null,
    simulation: null,
  });

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);

  const getNetworkChartHeight = () => {
    if (isZoomed) {
      return Math.min(600, window.innerHeight * 0.75);
    } else {
      return 450;
    }
  };

  const chartHeight = getNetworkChartHeight();

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({
    width: isZoomed ? 1000 : 600,
    height: chartHeight,
  });
  const [internalPinnedNodeIds, setInternalPinnedNodeIds] = useState<
    Set<string>
  >(new Set());
  const pinnedNodeIds = externalPinnedNodeIds ?? internalPinnedNodeIds;
  const setPinnedNodeIds = onPinnedNodeIdsChange ?? setInternalPinnedNodeIds;

  const pinnedNodeIdsRef = useRef<Set<string>>(pinnedNodeIds);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    pinnedNodeIdsRef.current = pinnedNodeIds;
  }, [pinnedNodeIds]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    try {
      if (networkData) {
        const dataToTransform = networkData.data || networkData;
        const result = transformNetworkData(dataToTransform);

        if (!result.nodes || !result.edges) {
          throw new Error("Invalid data format received from networkData prop");
        }

        const formattedData = {
          nodes: {
            data: result.nodes.map((node) => [
              node.id,
              node.label,
              node.type,
              node.score || node.don || 0,
            ]),
          },
          edges: {
            data: result.edges.map((edge) => [
              edge.source?.id || edge.source,
              edge.target?.id || edge.target,
              edge.type || "PPI",
            ]),
          },
        };

        setData(formattedData);
        setError(null);
      } else {
        setData(null);
      }
    } catch (err: any) {
      console.error("Error processing PPI data:", err);
      setError(err.message);
      setData(null);
    }
  }, [networkData]);

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

  const isPinned = useCallback((nodeId: string): boolean => {
    return pinnedNodeIdsRef.current.has(nodeId);
  }, []);

  const getConnectedNodeIds = useCallback(
    (nodeId: string, links: any[]): Set<string> => {
      const connectedIds = new Set<string>();
      links.forEach((link: any) => {
        if (link.source.id === nodeId) connectedIds.add(link.target.id);
        if (link.target.id === nodeId) connectedIds.add(link.source.id);
      });
      return connectedIds;
    },
    []
  );

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const linkElements = svg.selectAll(".links line");
    const nodeElements = svg.selectAll(".nodes .node");

    if (linkElements.size() === 0 || nodeElements.size() === 0) {
      return;
    }

    if (hoveredNodeId) {
      const hoveredConnectedNodeIds = new Set([hoveredNodeId]);
      linkElements.each(function (linkData: any) {
        if (linkData.source.id === hoveredNodeId) {
          hoveredConnectedNodeIds.add(linkData.target.id);
        }
        if (linkData.target.id === hoveredNodeId) {
          hoveredConnectedNodeIds.add(linkData.source.id);
        }
      });

      linkElements
        .style("display", (l: any) => {
          const isConnectedToHoveredNode =
            l.source.id === hoveredNodeId || l.target.id === hoveredNodeId;
          return isConnectedToHoveredNode ? "block" : "none";
        })
        .style("stroke-opacity", (l: any) => {
          const isConnectedToHoveredNode =
            l.source.id === hoveredNodeId || l.target.id === hoveredNodeId;
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
          if (hoveredConnectedNodeIds.has(n.id)) {
            return "hsl(var(--chart-highlight-node))";
          }
          return "hsl(var(--chart-intermediate-protein))";
        })
        .style("stroke", (n: any) =>
          pinnedNodeIds.has(n.id) ? "#333" : "none"
        )
        .style("stroke-width", (n: any) => (pinnedNodeIds.has(n.id) ? 0 : 0));
    } else if (pinnedNodeIds.size > 0) {
      const highlightedNodeIds = new Set(pinnedNodeIds);

      linkElements.each(function (linkData: any) {
        if (pinnedNodeIds.has(linkData.source.id)) {
          highlightedNodeIds.add(linkData.target.id);
        }
        if (pinnedNodeIds.has(linkData.target.id)) {
          highlightedNodeIds.add(linkData.source.id);
        }
      });

      linkElements
        .style("display", (l: any) => {
          const showLink =
            pinnedNodeIds.has(l.source.id) || pinnedNodeIds.has(l.target.id);
          return showLink ? "block" : "none";
        })
        .style("stroke", (l: any) => {
          const isKinaseConnection =
            l.source.type === "kinase" || l.target.type === "kinase";
          return isKinaseConnection ? "#14532D" : "#6B7280";
        })
        .style("stroke-width", 1)
        .style("stroke-opacity", (l: any) => {
          const isActiveLink =
            pinnedNodeIds.has(l.source.id) || pinnedNodeIds.has(l.target.id);
          const isKinaseConnection =
            l.source.type === "kinase" || l.target.type === "kinase";

          if (isActiveLink) return 1;
          return isKinaseConnection ? 0.6 : 0.25;
        });

      nodeElements
        .select("circle")
        .style("opacity", (n: any) => {
          if (highlightedNodeIds.has(n.id)) return 1;
          if (n.type === "transcription_factor") return 0.3;
          return 0.15;
        })
        .style("fill", (n: any) => {
          if (n.type === "transcription_factor") return "#E94549";
          if (pinnedNodeIds.has(n.id) || highlightedNodeIds.has(n.id)) {
            return "hsl(var(--chart-highlight-node))";
          }
          return "hsl(var(--chart-intermediate-protein))";
        })
        .style("stroke", (n: any) =>
          pinnedNodeIds.has(n.id) ? "#333" : "none"
        )
        .style("stroke-width", (n: any) => (pinnedNodeIds.has(n.id) ? 0 : 0));
    } else {
      linkElements
        .style("display", "block")
        .style("stroke", (l: any) => {
          const isKinaseConnection =
            l.source.type === "kinase" || l.target.type === "kinase";
          return isKinaseConnection ? "#14532D" : "#6B7280";
        })
        .style("stroke-width", 1)
        .style("stroke-opacity", (l: any) => {
          const isKinaseConnection =
            l.source.type === "kinase" || l.target.type === "kinase";
          return isKinaseConnection ? 0.6 : 0.25;
        });

      nodeElements
        .select("circle")
        .style("opacity", 1)
        .style("fill", (n: any) => {
          if (n.type === "transcription_factor") return "#E94549";
          return "hsl(var(--chart-intermediate-protein))";
        })
        .style("stroke", "none")
        .style("stroke-width", 0);
    }
  }, [pinnedNodeIds, hoveredNodeId, getConnectedNodeIds]);

  const handleNodeClickWithoutSimulation = useCallback(
    (event: any, d: any) => {
      const simulation = containerRef.current?.simulation;
      if (!simulation) return;

      const allNodes = simulation.nodes();
      const currentPinnedNodes = pinnedNodeIdsRef.current;

      const frozenPositions = new Map();
      allNodes.forEach((node: any) => {
        frozenPositions.set(node.id, { x: node.x, y: node.y });
        node.vx = 0;
        node.vy = 0;
      });

      const frozenX = d.x;
      const frozenY = d.y;
      const newPinnedNodes = new Set(currentPinnedNodes);
      const wasAlreadyPinned = currentPinnedNodes.has(d.id);

      if (wasAlreadyPinned) {
        newPinnedNodes.delete(d.id);
        d.fx = null;
        d.fy = null;
        console.debug(
          "Unpinning node:",
          d.id,
          "Previous count:",
          currentPinnedNodes.size,
          "New count:",
          newPinnedNodes.size
        );
      } else {
        newPinnedNodes.add(d.id);
        d.fx = frozenX;
        d.fy = frozenY;
        console.debug(
          "Pinning node:",
          d.id,
          "Previous count:",
          currentPinnedNodes.size,
          "New count:",
          newPinnedNodes.size
        );
      }

      allNodes.forEach((node: any) => {
        const frozen = frozenPositions.get(node.id);
        if (frozen) {
          node.x = frozen.x;
          node.y = frozen.y;
        }
      });

      simulation.alpha(0);
      simulation.alphaTarget(0);

      setPinnedNodeIds(newPinnedNodes);

      // Apply immediate styling after pin state change
      setTimeout(() => {
        const svg = d3.select(svgRef.current);
        const linkElements = svg.selectAll(".links line");
        const nodeElements = svg.selectAll(".nodes .node");

        if (linkElements.size() > 0 && nodeElements.size() > 0) {
          // Apply styling based on new pin state
          if (newPinnedNodes.size > 0) {
            const highlightedNodeIds = new Set(newPinnedNodes);

            linkElements.each(function (linkData: any) {
              if (newPinnedNodes.has(linkData.source.id)) {
                highlightedNodeIds.add(linkData.target.id);
              }
              if (newPinnedNodes.has(linkData.target.id)) {
                highlightedNodeIds.add(linkData.source.id);
              }
            });

            linkElements
              .style("display", (l: any) => {
                const showLink =
                  newPinnedNodes.has(l.source.id) ||
                  newPinnedNodes.has(l.target.id);
                return showLink ? "block" : "none";
              })
              .style("stroke-opacity", (l: any) => {
                const isActiveLink =
                  newPinnedNodes.has(l.source.id) ||
                  newPinnedNodes.has(l.target.id);
                const isKinaseConnection =
                  l.source.type === "kinase" || l.target.type === "kinase";
                if (isActiveLink) return 1;
                return isKinaseConnection ? 0.6 : 0.25;
              });

            nodeElements
              .select("circle")
              .style("opacity", (n: any) => {
                if (highlightedNodeIds.has(n.id)) return 1;
                if (n.type === "transcription_factor") return 0.3;
                return 0;
              })
              .style("fill", (n: any) => {
                if (n.type === "transcription_factor") return "#E94549";
                if (newPinnedNodes.has(n.id) || highlightedNodeIds.has(n.id)) {
                  return "hsl(var(--chart-highlight-node))";
                }
                return "hsl(var(--chart-intermediate-protein))";
              })
              .style("stroke", (n: any) =>
                newPinnedNodes.has(n.id) ? "#333" : "none"
              )
              .style("stroke-width", (n: any) =>
                newPinnedNodes.has(n.id) ? 0 : 0
              );
          } else {
            // Reset to default styling when no pins
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
                if (n.type === "transcription_factor") return "#E94549";
                return "hsl(var(--chart-intermediate-protein))";
              })
              .style("stroke", "none")
              .style("stroke-width", 0);
          }
        }
      }, 10); // Small delay to ensure elements are ready
    },
    [isPinned, setPinnedNodeIds]
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

    const svg = d3.select(svgRef.current);
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

    const allNodes = data.nodes.data.map((nodeArray: any) => {
      const nodeType = nodeArray[2] || "intermediate_protein";
      const centerX = width / 2;
      const centerY = height / 2;
      let initialX, initialY;

      if (nodeType === "transcription_factor") {
        const angle = Math.random() * 2 * Math.PI;
        const radius = 30 + Math.random() * 40;
        initialX = centerX + radius * Math.cos(angle);
        initialY = centerY + radius * Math.sin(angle);
      } else {
        const angle = Math.random() * 2 * Math.PI;
        const radius = 100 + Math.random() * 80;
        initialX = centerX + radius * Math.cos(angle);
        initialY = centerY + radius * Math.sin(angle);
      }

      return {
        id: nodeArray[0],
        label: nodeArray[1],
        type: nodeType,
        score: nodeArray[3] || 0,
        x: initialX,
        y: initialY,
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
          };
        }
        return null;
      })
      .filter((link: any) => link !== null);

    const connectedNodeIds = new Set();
    links.forEach((link: any) => {
      connectedNodeIds.add(link.source.id);
      connectedNodeIds.add(link.target.id);
    });

    const nodes = allNodes.filter((node: any) => connectedNodeIds.has(node.id));

    function getNodeRadius(d: any) {
      const baseRadius = 15;
      const scoreMultiplier = Math.max(0.5, Math.min(2, d.score || 1));

      if (d.type === "transcription_factor")
        return baseRadius * 1.5 * scoreMultiplier;
      if (d.type === "kinase") return baseRadius * 1.3 * scoreMultiplier;
      return baseRadius * scoreMultiplier;
    }

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
            const sourceType = d.source.type;
            const targetType = d.target.type;

            if (sourceType !== targetType) {
              if (
                sourceType === "intermediate_protein" ||
                targetType === "intermediate_protein"
              ) {
                return 100;
              }
              return 140;
            }

            if (sourceType === "intermediate_protein") {
              return 50;
            }
            return 80;
          })
          .strength(0.3)
          .iterations(1)
      )
      .force(
        "charge",
        d3.forceManyBody().strength(-80).distanceMax(200).theta(0.9)
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3
          .forceCollide()
          .radius((d: any) => {
            const baseRadius = getNodeRadius(d);
            return d.type === "intermediate_protein"
              ? baseRadius + 8
              : baseRadius + 15;
          })
          .strength(0.9)
          .iterations(1)
      )
      .force(
        "radial",
        d3
          .forceRadial(
            (d: any) => {
              if (d.type === "transcription_factor") return 60;
              if (d.type === "kinase") return 100;
              return 140;
            },
            width / 2,
            height / 2
          )
          .strength(0.4)
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
      .attr("stroke-width", 1)
      .style("stroke-opacity", (d: any) => {
        const isKinaseConnection =
          d.source.type === "kinase" || d.target.type === "kinase";

        if (isKinaseConnection) {
          return 0.6;
        }

        return 0.25;
      });

    const DRAG_THRESHOLD = 10;

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

          const newX = Math.max(
            nodeRadius + 10,
            Math.min(width - nodeRadius - 10, event.x)
          );
          const newY = Math.max(
            nodeRadius + 10,
            Math.min(height - nodeRadius - 10, event.y)
          );

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
      .style("cursor", "pointer")
      .call(drag);

    node
      .append("circle")
      .attr("r", (d: any) => getNodeRadius(d))
      .style("fill", (d: any) => {
        if (d.type === "transcription_factor") {
          return "#E94549";
        } else {
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
        if (d.score > 1.5) return "11px";
        if (d.score > 1.0) return "10px";
        return "9px";
      })
      .attr("font-weight", (d: any) => (d.score > 1.5 ? "600" : "400"))
      .attr("fill", (d: any) => {
        return d.type === "transcription_factor"
          ? "currentColor"
          : "currentColor";
      })
      .style("pointer-events", "none")
      .style("user-select", "none");

    node
      .on("mouseover", function (_event: any, d: any) {
        setHoveredNodeId(d.id);
      })
      .on("mouseout", function () {
        setHoveredNodeId(null);
      });

    let animationId: number | null = null;

    simulation.on("tick", () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }

      animationId = requestAnimationFrame(() => {
        nodes.forEach((d: any) => {
          const nodeRadius = getNodeRadius(d);
          d.x = Math.max(
            nodeRadius + 10,
            Math.min(width - nodeRadius - 10, d.x)
          );
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
      simulation.alpha(0);
      simulation.stop();
    }, 5000);

    setTimeout(() => {
      simulation.alpha(0);
      simulation.alphaTarget(0);
      simulation.stop();
    }, 2000);

    // Apply pinned positions if any exist
    pinnedNodeIds.forEach((pinnedId) => {
      const foundNode = nodes.find((n: any) => n.id === pinnedId);
      if (foundNode) {
        // Keep pinned nodes at their fixed positions
        foundNode.fx = foundNode.x;
        foundNode.fy = foundNode.y;
      }
    });

    // Apply initial pin styling if there are pinned nodes
    setTimeout(() => {
      if (pinnedNodeIds.size > 0) {
        const linkElements = svg.selectAll(".links line");
        const nodeElements = svg.selectAll(".nodes .node");

        if (linkElements.size() > 0 && nodeElements.size() > 0) {
          const highlightedNodeIds = new Set(pinnedNodeIds);

          // Find connected nodes to pinned nodes
          linkElements.each(function (linkData: any) {
            if (pinnedNodeIds.has(linkData.source.id)) {
              highlightedNodeIds.add(linkData.target.id);
            }
            if (pinnedNodeIds.has(linkData.target.id)) {
              highlightedNodeIds.add(linkData.source.id);
            }
          });

          // Apply pin styling
          linkElements
            .style("display", (l: any) => {
              const showLink =
                pinnedNodeIds.has(l.source.id) ||
                pinnedNodeIds.has(l.target.id);
              return showLink ? "block" : "none";
            })
            .style("stroke-opacity", (l: any) => {
              const isActiveLink =
                pinnedNodeIds.has(l.source.id) ||
                pinnedNodeIds.has(l.target.id);
              const isKinaseConnection =
                l.source.type === "kinase" || l.target.type === "kinase";
              if (isActiveLink) return 1;
              return isKinaseConnection ? 0.6 : 0.25;
            });

          nodeElements
            .select("circle")
            .style("opacity", (n: any) => {
              if (highlightedNodeIds.has(n.id)) return 1;
              if (n.type === "transcription_factor") return 0.3;
              return 0;
            })
            .style("fill", (n: any) => {
              if (n.type === "transcription_factor") return "#E94549";
              if (pinnedNodeIds.has(n.id) || highlightedNodeIds.has(n.id)) {
                return "hsl(var(--chart-highlight-node))";
              }
              return "hsl(var(--chart-intermediate-protein))";
            })
            .style("stroke", (n: any) =>
              pinnedNodeIds.has(n.id) ? "#333" : "none"
            )
            .style("stroke-width", (n: any) =>
              pinnedNodeIds.has(n.id) ? 0 : 0
            );
        }
      }
    }, 50); // Slightly longer delay to ensure all elements are fully created

    containerRef.current = { svg, zoom, simulation };

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      simulation.stop();
    };
  }, [data, dimensions, handleNodeClickWithoutSimulation]);

  const handleZoomIn = () => {
    if (containerRef.current) {
      const { svg, zoom } = containerRef.current;
      svg.transition().duration(300).call(zoom.scaleBy, 1.5);
    }
  };

  const handleZoomOut = () => {
    if (containerRef.current) {
      const { svg, zoom } = containerRef.current;
      svg
        .transition()
        .duration(300)
        .call(zoom.scaleBy, 1 / 1.5);
    }
  };

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

        nodes.forEach((node: any) => {
          node.fx = null;
          node.fy = null;
          node.vx = 0;
          node.vy = 0;

          const nodeType = node.type || "intermediate_protein";
          const centerX = width / 2;
          const centerY = height / 2;

          if (nodeType === "transcription_factor") {
            const angle = Math.random() * 2 * Math.PI;
            const radius = 30 + Math.random() * 40;
            node.x = centerX + radius * Math.cos(angle);
            node.y = centerY + radius * Math.sin(angle);
          } else {
            const angle = Math.random() * 2 * Math.PI;
            const radius = 100 + Math.random() * 80;
            node.x = centerX + radius * Math.cos(angle);
            node.y = centerY + radius * Math.sin(angle);
          }
        });

        simulation.alpha(1.0).alphaDecay(0.05).alphaTarget(0).restart();

        setTimeout(() => {
          if (simulation.alpha() > 0.01) {
            simulation.stop();
          }
        }, 8000);
      }
    }

    console.debug("Reset chart: cleared", pinnedNodeIds.size, "pinned nodes");
  }, [
    setPinnedNodeIds,
    dimensions.width,
    dimensions.height,
    pinnedNodeIds.size,
  ]);

  useEffect(() => {
    return () => {
      if (containerRef.current?.simulation) {
        containerRef.current.simulation.stop();
      }
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 rounded-lg bg-white p-6 shadow-lg">
        <div className="py-8 text-center">
          <div className="mb-2 text-lg font-semibold text-red-500">
            Error Loading PPI Data
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

  if (!networkData && !isLoading) {
    return (
      <div className="flex h-[384px] flex-1 items-center justify-center">
        <p className="text-gray-500">
          No protein-protein interaction data available to display.
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
          No protein-protein interaction data available to display.
        </p>
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
              <div className="text-gray-600">Loading PPI network data...</div>
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
