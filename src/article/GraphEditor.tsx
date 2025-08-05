// TODO: Deduplicate with construction site.

import useResizeObserver from "@react-hook/resize-observer";
import * as d3 from "d3";
import { act, MouseEvent, useLayoutEffect, useReducer, useRef, useState } from "react";
import Permutation, { clipToRange, correctIdx } from "../common/Permutation";
import { backgroundColor, getColorScale, inputColor, MainGradient, midColor, outputColor, redColor, topColor } from "../common/Colors";
import PermWidget from "@/common/PermWidget";
import { useFlushingResizeObserver } from "@/common/resizeObserver";
import { computeGridLayout as computeWeightedLayout, computeGridMargins, Grid } from "@/common/Grid";
import { applyTerminalBias, CenteredKI, drawNode, GraphNodeType } from "@/common/NodeDrawing";
import { EdgeType, ColGraph, GraphEdge, GraphNode, TriadColor, triadColorToColor, CompatGraph } from "./Graph";
import { ToolSel } from "@/common/Toolbar";
import { bucketScale, computeNodeBucket, drawBuckets, fitEllipseIntoIceCone, genBucketsJsx, useBucketCanvas } from "./buckets";
import { Vec2 } from "@/common/mathUtils";

type AddEdgeInteraction = {
  fromNode: GraphNode,
};

export default function GraphEditor({
  graph,
  compatGraph,
  onChange = (() => {}),
  tool
} : {graph: ColGraph, compatGraph: CompatGraph, onChange?: (graph: ColGraph, structuralChange: boolean) => void, tool: ToolSel})
{
  let cnv = useBucketCanvas(graph);

  let [draggedNode, setDraggedNode] = useState<GraphNode>();
  let [edgeInteraction, setEdgeInteraction] = useState<AddEdgeInteraction>();
  let [mousePos, setMousePos] = useState<Vec2>();

  // NOTE: Calling e.preventDefault is necessary in the mouse handlers, to avoid
  // Firefox from removing the keyboard focus from the parent interceptor.

  function handleMouseDown(e: React.MouseEvent, node?: GraphNode, edge?: GraphEdge) {
    let [ex, ey] = cnv.getEventPoint(e);

    if (tool === 'insert') {
      if (node) {
        // Add an edge
        setEdgeInteraction({
          fromNode: node
        });
        e.stopPropagation();
        e.preventDefault();
      } else {
        // Add a node.
        let x = cnv.grid.xFromScreen(ex, ey, false);
        let y = cnv.grid.yFromScreen(ex, ey, false);
        let newNode: GraphNode = { color: TriadColor.Col1, key: "usrnd_" + graph.getNextId(), fy: y, fx: x };

        graph.nodes.push(newNode);
        onChange(graph, true);
        e.stopPropagation();
        e.preventDefault();
      }
    } else if (tool === 'delete') {
      if (node) {
        graph.deleteNode(node);
        onChange(graph, true);
        e.stopPropagation();
        e.preventDefault();
      } else if (edge) {
        graph.deleteEdge(edge);
        onChange(graph, true);
        e.stopPropagation();
        e.preventDefault();
      }
    } else if (tool === 'drag') {
      if (node) {
        setDraggedNode(node);
        e.stopPropagation();
        e.preventDefault();
      }
    } else if (tool === 'paint') {
      if (node) {
        node.color = (node.color + 1) % 3;
        let bucketIdx = computeNodeBucket(graph, node);
        compatGraph.recomputeActiveSubgraph(bucketIdx);
        onChange(graph, false);
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    let [ex, ey] = cnv.getEventPoint(e);

    console.log(draggedNode);
    if (draggedNode) {
      let x = cnv.grid.xFromScreen(ex, ey, false);
      let y = cnv.grid.yFromScreen(ex, ey, false);

      draggedNode.fx = x;
      draggedNode.fy = y;
      onChange(graph, false);
    } else if (edgeInteraction) {
      setEdgeInteraction({
        fromNode: edgeInteraction.fromNode
      });
      e.stopPropagation();
      e.preventDefault();
    }

    setMousePos([ex, ey]);
  }

  function handleMouseUp(e: React.MouseEvent, node?: GraphNode) {
    let [ex, ey] = cnv.getEventPoint(e);

    if (draggedNode) {
      let x = cnv.grid.xFromScreen(ex, ey, false);
      let y = cnv.grid.yFromScreen(ex, ey, false);

      draggedNode.fx = x;
      draggedNode.fy = y;

      onChange(graph, false);
      setDraggedNode(undefined);
      e.stopPropagation();
      e.preventDefault();
    }

    if (edgeInteraction) {
      if (node) {
        let newEdge: GraphEdge = {
          source: edgeInteraction.fromNode,
          target: node,
          type: EdgeType.Disequality
        };
        graph.edges.push(newEdge);
      }

      onChange(graph, true);
      setEdgeInteraction(undefined);
      e.stopPropagation();
      e.preventDefault();
    }
  }

  function drawGraph(canvas: React.JSX.Element[], labels: React.JSX.Element[]) {
    drawBuckets(cnv, canvas, labels);

    for (let edge of graph.edges) {
      let src = edge.source as GraphNode;
      let tgt = edge.target as GraphNode;

      let [fromX, fromY] = cnv.grid.toScreen(src.x||0, src.y||0);
      let [toX, toY] = cnv.grid.toScreen(tgt.x||0, tgt.y||0);

      let x = (fromX+toX)/2;
      let y = (fromY+toY)/2;

      let proper = (src.color !== tgt.color);
      let color = proper ? midColor : redColor;

      let cursor = "";
      if (tool === "delete") {
        cursor = "cursor-pointer";
      }


      let line = <line className={cursor} key={'edge_'+edge.index} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke={color} strokeWidth={cnv.zoom*2} onMouseDown={e => handleMouseDown(e, undefined, edge)} />;

      canvas.push(line);
    }

    if (edgeInteraction && mousePos) {
      let src = edgeInteraction.fromNode;
      let [fromX, fromY] = cnv.grid.toScreen(src.x||0, src.y||0);

      let line = <line key={"edgeInteract"} x1={fromX} y1={fromY} x2={mousePos[0]} y2={mousePos[1]} stroke="white" strokeOpacity={0.5} strokeWidth={cnv.zoom*4} />;

      canvas.push(line);
    }

    if (tool==="insert" && mousePos) {
      let circ = <circle key="ghostCirc" cx={mousePos[0]} cy={mousePos[1]} r={10} fill={midColor} fillOpacity={0.5} />
      canvas.push(circ);
    }

    let colorScale = bucketScale(cnv.graph);

    for (let node of graph.nodes) {
      let cursor = "";
      if (tool === "drag") {
        cursor = "cursor-grab";
      } else if (tool === "delete" || tool === "paint") {
        cursor = "cursor-pointer";
      } else if (tool === "insert") {
        cursor = "cursor-crosshair";
      }

      let color = triadColorToColor(node.color);
      //color = colorScale(computeNodeBucket(graph, node));

      drawNode(cnv.zoom, cnv.grid, GraphNodeType.Internal, color, node.x || 0, node.y || 0, canvas, labels, {
        className: cursor,
        onMouseDown: (e: React.MouseEvent) => {handleMouseDown(e, node)},
        onMouseUp: (e: React.MouseEvent) => {handleMouseUp(e, node)}
      });
    }
  }

  let graphCanvas: React.JSX.Element[] = [];
  let labels: React.JSX.Element[] = [];
  drawGraph(graphCanvas, labels);

  return genBucketsJsx(cnv, graphCanvas, labels, handleMouseDown, handleMouseUp, handleMouseMove);
}