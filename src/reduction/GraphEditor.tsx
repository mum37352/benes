// TODO: Deduplicate with construction site.

import { Vec2 } from "@/common/mathUtils";
import { drawNode, GraphNodeType } from "@/common/NodeDrawing";
import { ToolSel } from "@/common/Toolbar";
import { useState } from "react";
import { midColor, redColor } from "../common/Colors";
import { bucketScale, computeNodeBucket, drawBuckets, genBucketsJsx, useBucketCanvas } from "./buckets";
import { ColGraph, ColGraphEdge, ColGraphNode, CompatGraph, EdgeType, TriadColor, triadColorToColor } from "./Graph";

type AddEdgeInteraction = {
  fromNode: string,
};

export default function GraphEditor({
  colGraph,
  compatGraph,
  onChange = (() => {}),
  tool
} : {colGraph: ColGraph, compatGraph: CompatGraph, onChange?: (colGraph: ColGraph, structuralChange: boolean) => void, tool: ToolSel})
{
  let cnv = useBucketCanvas(colGraph);

  let [draggedNode, setDraggedNode] = useState<string>();
  let [edgeInteraction, setEdgeInteraction] = useState<AddEdgeInteraction>();
  let [mousePos, setMousePos] = useState<Vec2>();

  // NOTE: Calling e.preventDefault is necessary in the mouse handlers, to avoid
  // Firefox from removing the keyboard focus from the parent interceptor.

  function handleMouseDown(e: React.MouseEvent, nodeId?: string, edgeId?: string) {
    let [ex, ey] = cnv.getEventPoint(e);

    if (tool === 'insert') {
      if (nodeId) {
        // Add an edge
        setEdgeInteraction({
          fromNode: nodeId
        });
        e.stopPropagation();
        e.preventDefault();
      } else {
        // Add a node.
        let x = cnv.grid.xFromScreen(ex, ey, false);
        let y = cnv.grid.yFromScreen(ex, ey, false);
        let id = "usrnd_" + colGraph.getNextId();

        let data: ColGraphNode = { color: TriadColor.Col1, x: x, y: y };

        colGraph.graph.addNode(id, data);
        onChange(colGraph, true);
        e.stopPropagation();
        e.preventDefault();
      }
    } else if (tool === 'delete') {
      if (nodeId) {
        colGraph.graph.dropNode(nodeId);
        onChange(colGraph, true);
        e.stopPropagation();
        e.preventDefault();
      } else if (edgeId) {
        colGraph.graph.dropEdge(edgeId);
        onChange(colGraph, true);
        e.stopPropagation();
        e.preventDefault();
      }
    } else if (tool === 'drag') {
      if (nodeId) {
        setDraggedNode(nodeId);
        e.stopPropagation();
        e.preventDefault();
      }
    } else if (tool === 'paint') {
      if (nodeId) {
        let node = colGraph.graph.getNodeAttributes(nodeId);
        node.color = (node.color + 1) % 3;
        let bucketIdx = computeNodeBucket(colGraph, nodeId);
        compatGraph.recomputeActiveSubgraph(bucketIdx);
        onChange(colGraph, false);
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    let [ex, ey] = cnv.getEventPoint(e);

    console.log(draggedNode);
    if (draggedNode) {
      let x = cnv.grid.xFromScreen(ex, ey, false);
      let y = cnv.grid.yFromScreen(ex, ey, false);

      let draggedData = colGraph.graph.getNodeAttributes(draggedNode);
      draggedData.x = x;
      draggedData.y = y;
      onChange(colGraph, false);
    } else if (edgeInteraction) {
      setEdgeInteraction({
        fromNode: edgeInteraction.fromNode
      });
      e.stopPropagation();
      e.preventDefault();
    }

    setMousePos([ex, ey]);
  }

  function handleMouseUp(e: React.MouseEvent, nodeId?: string) {
    let [ex, ey] = cnv.getEventPoint(e);

    if (draggedNode) {
      let x = cnv.grid.xFromScreen(ex, ey, false);
      let y = cnv.grid.yFromScreen(ex, ey, false);

      let draggedData = colGraph.graph.getNodeAttributes(draggedNode);
      draggedData.x = x;
      draggedData.y = y;

      onChange(colGraph, false);
      setDraggedNode(undefined);
      e.stopPropagation();
      e.preventDefault();
    }

    if (edgeInteraction) {
      if (nodeId) {
        let newEdge: ColGraphEdge = {
          type: EdgeType.Disequality
        };
        // Prevent self-loops
        if (edgeInteraction.fromNode !== nodeId) {
          colGraph.graph.addEdge(edgeInteraction.fromNode, nodeId, newEdge);
        }
      }

      onChange(colGraph, true);
      setEdgeInteraction(undefined);
      e.stopPropagation();
      e.preventDefault();
    }
  }

  function drawGraph(canvas: React.JSX.Element[], labels: React.JSX.Element[]) {
    drawBuckets(cnv, canvas, labels);

    colGraph.graph.forEachEdge((edgeId, attributes, source, target) => {
      let src = colGraph.graph.getNodeAttributes(source);
      let tgt = colGraph.graph.getNodeAttributes(target);

      let [fromX, fromY] = cnv.grid.toScreen(src.x||0, src.y||0);
      let [toX, toY] = cnv.grid.toScreen(tgt.x||0, tgt.y||0);

      let proper = (src.color !== tgt.color);
      let color = proper ? midColor : redColor;

      let cursor = "";
      if (tool === "delete") {
        cursor = "cursor-pointer";
      }


      let line = <line className={cursor} key={'edge_'+edgeId} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke={color} strokeWidth={cnv.zoom*2} onMouseDown={e => handleMouseDown(e, undefined, edgeId)} />;

      canvas.push(line);
    });

    if (edgeInteraction && mousePos) {
      let src = colGraph.graph.getNodeAttributes(edgeInteraction.fromNode);
      let [fromX, fromY] = cnv.grid.toScreen(src.x, src.y);

      let line = <line key={"edgeInteract"} x1={fromX} y1={fromY} x2={mousePos[0]} y2={mousePos[1]} stroke="white" strokeOpacity={0.5} strokeWidth={cnv.zoom*4} />;

      canvas.push(line);
    }

    if (tool==="insert" && mousePos) {
      let circ = <circle key="ghostCirc" cx={mousePos[0]} cy={mousePos[1]} r={10} fill={midColor} fillOpacity={0.5} />
      canvas.push(circ);
    }

    colGraph.graph.forEachNode((nodeId, attributes) => {
      let cursor = "";
      if (tool === "drag") {
        cursor = "cursor-grab";
      } else if (tool === "delete" || tool === "paint") {
        cursor = "cursor-pointer";
      } else if (tool === "insert") {
        cursor = "cursor-crosshair";
      }

      let color = triadColorToColor(attributes.color);

      drawNode(cnv.zoom, cnv.grid, GraphNodeType.Internal, color, attributes.x || 0, attributes.y || 0, canvas, labels, {
        className: cursor,
        onMouseDown: (e: React.MouseEvent) => {handleMouseDown(e, nodeId)},
        onMouseUp: (e: React.MouseEvent) => {handleMouseUp(e, nodeId)}
      });
    });
  }

  let graphCanvas: React.JSX.Element[] = [];
  let labels: React.JSX.Element[] = [];
  drawGraph(graphCanvas, labels);

  return genBucketsJsx(cnv, graphCanvas, labels, handleMouseDown, handleMouseUp, handleMouseMove);
}