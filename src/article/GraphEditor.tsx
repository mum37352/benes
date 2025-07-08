// TODO: Deduplicate with construction site.

import useResizeObserver from "@react-hook/resize-observer";
import * as d3 from "d3";
import { act, MouseEvent, useLayoutEffect, useReducer, useRef, useState } from "react";
import Permutation, { clipToRange, correctIdx } from "../common/Permutation";
import { backgroundColor, getColorScale, inputColor, MainGradient, midColor, outputColor, topColor } from "../common/Colors";
import PermWidget from "@/common/PermWidget";
import { useFlushingResizeObserver } from "@/common/resizeObserver";
import { Box, computeGridLayout as computeWeightedLayout, computeGridMargins, Vec2, Grid, normalize2d } from "@/common/Grid";
import { applyTerminalBias, CenteredKI, drawNode, GraphNodeType } from "@/common/NodeDrawing";
import { EdgeType, Graph, GraphEdge, GraphNode, TriadColor, triadColorToColor } from "./Graph";
import { ToolSel } from "@/common/Toolbar";

type AddEdgeInteraction = {
  fromNode: GraphNode,
};

// Imagine a vertical ice cone at the origin (more precisely, a V shape in 2D)
// Given the left edge of the cone as a unit vector (Y up), find
// the radius of a ball around (0, 1) that is inscribed precisely by the cone.
// I think we had to do this using rulers and compasses in Gymnasium.
function fitCircleIntoIceCone(coneX: number, coneY: number) {
  // Compute cosine using the dot product.
  let cosine = coneY;

  return Math.sqrt(1 - cosine*cosine);
}

// Just like the circle fitting, except our ellipse now has an aspect ratio.
// Returns rx and ry of the ellipse. 
function fitEllipseIntoIceCone(asp: number, angle: number): Vec2 {
  // First, compute the unit normal vector representation for the
  // left side of the V shape.
  let coneX = -Math.sin(angle);
  let coneY = Math.cos(angle);

  // Stretch the problem vertically so it reduces to the familiar circle problem.
  coneY *= asp;

  let rx = fitCircleIntoIceCone(...normalize2d(coneX, coneY));

  return [rx, rx/asp];
}

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

  let coreCircleDiam = Math.max(1, (Math.sqrt(graph.cliqueSize*1.6)));

  let margin = computeGridMargins(false, false);

  // For fence post reasons, we add 1 to the numGuidelines instead of adding 2. Same for inputs
  let gridWidths = computeWeightedLayout(screenWidth, [margin.left, 2*coreCircleDiam, margin.right]);
  let gridHeights = computeWeightedLayout(screenHeight, [margin.top, 2*coreCircleDiam, margin.bottom]);

  let graphBox = new Box(gridWidths[0], gridHeights[0], gridWidths[0] + gridWidths[1], gridHeights[0] + gridHeights[1]);

  let grid = new Grid(new Box(-1.5*coreCircleDiam, -1.5*coreCircleDiam, 1.5*coreCircleDiam, 1.5*coreCircleDiam), false, graphBox);

  let zoom = Math.min(gridWidths[1]/(2*coreCircleDiam), gridHeights[1]/(2*coreCircleDiam)) / 100;

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
    function gradientId(cliqueIdx: number) {
      return "grad_"+cliqueIdx;
    }
    let colorScale = getColorScale(graph.cliqueSize);

    //canvas.push(<rect x={graphBox.left} y={graphBox.top} width={graphBox.width()} height={graphBox.height()} />)
    { // Draw the core circle/ellipse
      let [x, y] = grid.toScreen(0, 0);
      let [rx, ry] = grid.toScreenDims(coreCircleDiam, coreCircleDiam);
      //canvas.push(<ellipse cx={x} cy={y} rx={rx} ry={ry} strokeWidth={1} stroke="white" fill="none" />);
    }

    let mainAngle = 2*Math.PI / graph.cliqueSize;
    let ellipseAsp = 2.0;
    let coneAngle = Math.min(mainAngle*0.8, 0.3*Math.PI);
    let [rx, ry] = fitEllipseIntoIceCone(ellipseAsp, coneAngle);
    rx *= coreCircleDiam;
    ry *= coreCircleDiam;

    for (let i = 0; i < graph.cliqueSize; i++) {
      let centerAngle = i*mainAngle;

      canvas.push(<MainGradient id={gradientId(i)} color={colorScale(i)} />);

      let rotString = `rotate(${(centerAngle*180)/Math.PI})`;
      let [x, y] = grid.toScreen(coreCircleDiam*Math.sin(centerAngle), -coreCircleDiam*Math.cos(centerAngle));

      canvas.push(<ellipse cx={0} cy={-coreCircleDiam} rx={rx} ry={ry} fill={`url('#${gradientId(i)}')`} transform={`${grid.toScreenCss()} ${rotString}`} />);
      labels.push(<CenteredKI key={"bucketlab_"+i} zoom={zoom} color={backgroundColor} x={x} y={y}>{`V_{${i+1}}`}</CenteredKI>)
    }

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