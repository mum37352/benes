// TODO: Deduplicate with construction site.

import useResizeObserver from "@react-hook/resize-observer";
import * as d3 from "d3";
import { act, MouseEvent, useLayoutEffect, useReducer, useRef, useState } from "react";
import Permutation, { clipToRange, correctIdx } from "../common/Permutation";
import { backgroundColor, getColorScale, inputColor, midColor, outputColor, topColor } from "../common/Colors";
import PermWidget from "@/common/PermWidget";
import { useFlushingResizeObserver } from "@/common/resizeObserver";
import { Box, computeGridLayout as computeWeightedLayout, computeGridMargins, Vec2, Grid } from "@/common/Grid";
import { applyTerminalBias, CenteredKI, drawNode, GraphNodeType } from "@/common/NodeDrawing";
import { EdgeType, Graph, GraphEdge, GraphNode, TriadColor, triadColorToColor } from "./Graph";
import { ToolSel } from "@/common/Toolbar";

type AddEdgeInteraction = {
  fromNode: GraphNode,
};

export default function GraphEditor({
  graph,
  onChange = (() => {}),
  tool
} : {graph: Graph, onChange?: Function, tool: ToolSel})
{
  let ref = useRef<HTMLDivElement>(null);
  let dummyRectRef = useRef<SVGRectElement>(null);
  
  let {size, enableTransition} = useFlushingResizeObserver(ref);

  let [draggedNode, setDraggedNode] = useState<GraphNode>();
  let [edgeInteraction, setEdgeInteraction] = useState<AddEdgeInteraction>();
  let [mousePos, setMousePos] = useState<Vec2>();

  let screenWidth = size?.width || 0;
  let screenHeight = size?.height || 0;

  let margin = computeGridMargins(true, false);

  let gridSquareSize = Math.max(1, Math.ceil(Math.sqrt(graph.nodes.length)));

  // For fence post reasons, we add 1 to the numGuidelines instead of adding 2. Same for inputs
  let gridWidths = computeWeightedLayout(screenWidth, [margin.left, gridSquareSize, margin.right]);
  let gridHeights = computeWeightedLayout(screenHeight, [margin.top, gridSquareSize, margin.bottom]);

  let graphBox = new Box(gridWidths[0], gridHeights[0], gridWidths[0] + gridWidths[1], gridHeights[0] + gridHeights[1]);

  let grid = new Grid(new Box(0, 0, gridSquareSize, gridSquareSize), false, graphBox);

  let zoom = Math.min(gridWidths[1]/gridSquareSize, gridHeights[1]/gridSquareSize) / 100;

  let vertical = false;

  function clientToSvg(x: number, y: number) {
    let svgPoint = new DOMPoint(x, y);
    svgPoint = svgPoint.matrixTransform(dummyRectRef.current?.getScreenCTM()?.inverse());
    return [svgPoint.x, svgPoint.y];
  }

  function getEventPoint(e: React.MouseEvent) {
    return clientToSvg(e.clientX, e.clientY);
  }

  // NOTE: Calling e.preventDefault is necessary in the mouse handlers, to avoid
  // Firefox from removing the keyboard focus from the parent interceptor.

  function handleMouseDown(e: React.MouseEvent, node?: GraphNode, edge?: GraphEdge) {
    let [ex, ey] = getEventPoint(e);

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
        let x = grid.xFromScreen(ex, ey, false);
        let y = grid.yFromScreen(ex, ey, false);
        let newNode: GraphNode = { color: TriadColor.Col1, key: "usrnd_" + graph.getNextId(), fy: y, fx: x };

        graph.nodes.push(newNode);
        onChange(graph);
        e.stopPropagation();
        e.preventDefault();
      }
    } else if (tool === 'delete') {
      if (node) {
        graph.deleteNode(node);
        onChange(graph);
        e.stopPropagation();
        e.preventDefault();
      } else if (edge) {
        graph.deleteEdge(edge);
        onChange(graph);
        e.stopPropagation();
        e.preventDefault();
      }
    } else if (tool === 'drag') {
      if (node) {
        setDraggedNode(node);
        e.stopPropagation();
        e.preventDefault();
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    let [ex, ey] = getEventPoint(e);

      console.log(draggedNode);
    if (draggedNode) {
      let x = grid.xFromScreen(ex, ey, false);
      let y = grid.yFromScreen(ex, ey, false);

      draggedNode.fx = x;
      draggedNode.fy = y;
      onChange(graph);
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
    let [ex, ey] = getEventPoint(e);

    if (draggedNode) {
      let x = grid.xFromScreen(ex, ey, false);
      let y = grid.yFromScreen(ex, ey, false);

      draggedNode.fx = x;
      draggedNode.fy = y;

      onChange(graph);
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

      onChange(graph);
      setEdgeInteraction(undefined);
      e.stopPropagation();
      e.preventDefault();
    }
  }

  function drawGraph(canvas: React.JSX.Element[], labels: React.JSX.Element[]) {
    for (let edge of graph.edges) {
      let src = edge.source as GraphNode;
      let tgt = edge.target as GraphNode;

      let [fromX, fromY] = grid.toScreen(src.x||0, src.y||0);
      let [toX, toY] = grid.toScreen(tgt.x||0, tgt.y||0);

      let x = (fromX+toX)/2;
      let y = (fromY+toY)/2;

      let color = edge.type===EdgeType.Equality ? midColor : topColor;

      let line = <line className={tool==='delete'?"cursor-pointer":""} key={'edge_'+edge.index} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke={color} strokeWidth={zoom*2} onMouseDown={e => handleMouseDown(e, undefined, edge)} />;

      canvas.push(line);
      labels.push(<CenteredKI color="white" zoom={zoom} x={x} y={y} key={'edgelab'+edge.index}>{edge.type===EdgeType.Equality ? '=' : '\\neq'}</CenteredKI>)
    }

    if (edgeInteraction && mousePos) {
      let src = edgeInteraction.fromNode;
      let [fromX, fromY] = grid.toScreen(src.x||0, src.y||0);

      let line = <line key={"edgeInteract"} x1={fromX} y1={fromY} x2={mousePos[0]} y2={mousePos[1]} stroke="white" strokeOpacity={0.5} strokeWidth={zoom*4} />;

      canvas.push(line);
    }

    if (tool==="insert" && mousePos) {
      let circ = <circle key="ghostCirc" cx={mousePos[0]} cy={mousePos[1]} r={10} fill={midColor} fillOpacity={0.5} />
      canvas.push(circ);
    }

    for (let node of graph.nodes) {
      let cursor = "";
      if (tool === "drag") {
        cursor = "cursor-grab";
      } else if (tool === "delete") {
        cursor = "cursor-pointer"
      } else if (tool === "insert") {
        cursor = "cursor-crosshair"
      }

      drawNode(zoom, grid, GraphNodeType.Internal, triadColorToColor(node.color), node.x || 0, node.y || 0, canvas, labels, {
        className: cursor,
        onMouseDown: (e: React.MouseEvent) => {handleMouseDown(e, node)},
        onMouseUp: (e: React.MouseEvent) => {handleMouseUp(e, node)}
      });
    }
  }

  let graphCanvas: React.JSX.Element[] = [];
  let labels: React.JSX.Element[] = [];
  drawGraph(graphCanvas, labels);

  let svg = <svg className="absolute" width={screenWidth} height={screenHeight} >
    <rect ref={dummyRectRef} opacity={0} x="0" y="0" width="0" height="0" stroke="none" fill="none" />
    {graphCanvas}
  </svg>;
  
  return <div className="flex items-stretch w-full h-full p-1" style={{ flexDirection: vertical ? "column" : "row"}}>
    <div className="flex grow items-stretch p-1" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div ref={ref} className="relative flex grow p-0 m-0 overflow-hidden" >
        {svg}
        {labels}
      </div>
    </div>
  </div>
}