import useResizeObserver from "@react-hook/resize-observer";
import * as d3 from "d3";
import { act, MouseEvent, useLayoutEffect, useReducer, useRef, useState } from "react";
import Permutation, { clipToRange, correctIdx } from "../common/Permutation";
import { backgroundColor, getColorScale, inputColor, midColor, outputColor, topColor } from "../common/Colors";
import PermWidget from "@/common/PermWidget";
import { Graph, GraphEdge, GraphNode } from "./Graph";
import { useFlushingResizeObserver } from "@/common/resizeObserver";
import { ConstructionAction, ConstructionMode, ToolSel } from "./Toolbar";
import { Box, computeGridLayout as computeWeightedLayout, computeGridMargins, Vec2, Grid } from "@/common/Grid";
import { applyTerminalBias, drawNode, GraphNodeType } from "@/common/NodeDrawing";

type AddEdgeInteraction = {
  fromNode: GraphNode,
};

export default function Construction({
  perm,
  graph,
  onChange = (() => {}),
  tool,
  onPermChanged=null
} : {perm: Permutation | undefined, graph: Graph, onChange?: Function, tool: ToolSel, onPermChanged?: null | ((newPerm: Permutation) => void)})
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

  // For fence post reasons, we add 1 to the numGuidelines instead of adding 2. Same for inputs
  let gridWidths = computeWeightedLayout(screenWidth, [margin.left, 1+graph.numGuidelines, margin.right]);
  let gridHeights = computeWeightedLayout(screenHeight, [margin.top, graph.inputs.length-1, margin.bottom]);

  let graphBox = new Box(gridWidths[0], gridHeights[0], gridWidths[0] + gridWidths[1], gridHeights[0] + gridHeights[1]);
  let grid = new Grid(new Box(0, 0, graph.numGuidelines+1, graph.inputs.length-1), false, graphBox);

  let zoom = Math.min(gridWidths[1]/(graph.numGuidelines+1), gridHeights[1]/(graph.inputs.length-1)) / 100;

  let vertical = false;


  function svgToClient(x: number, y: number) : Vec2 {
    let svgPoint = new DOMPoint(x, y);
    let xform = dummyRectRef.current?.getScreenCTM();
    if (!xform) {
      return [0, 0];
    }

    svgPoint = svgPoint.matrixTransform(xform);
    let clientRect = ref.current?.getBoundingClientRect();
    if (clientRect) {
      svgPoint.x -= clientRect.left;
      svgPoint.y -= clientRect.top;
    }

    return [svgPoint.x, svgPoint.y];
  }

  function clientToSvg(x: number, y: number) {
    let svgPoint = new DOMPoint(x, y);
    //console.log("client", svgPoint);
    svgPoint = svgPoint.matrixTransform(dummyRectRef.current?.getScreenCTM()?.inverse());
    //console.log("xform", svgPoint);
    //svgPoint.x = graph.xScale.invert(svgPoint.x);
    //svgPoint.y = graph.yScale.invert(svgPoint.y);
    //console.log("scale", svgPoint);
    return [svgPoint.x, svgPoint.y];
  }

  function getEventPoint(e: React.MouseEvent) {
    return clientToSvg(e.clientX, e.clientY);
  }

  function handleMouseDown(e: React.MouseEvent, node?: GraphNode, edge?: GraphEdge) {
    let [ex, ey] = getEventPoint(e);

    if (tool === 'insert') {
      if (node) {
        // Add an edge
        setEdgeInteraction({
          fromNode: node
        });
        e.stopPropagation();
      } else {
        // Add a node.
        let x = clipToRange(grid.xFromScreen(ex, ey, true), 1, graph.numGuidelines);
        let y = grid.yFromScreen(ex, ey, false);
        let newNode: GraphNode = { type: GraphNodeType.Internal, key: "usrnd_" + graph.getNextId(), fy: y, fx: x, guideline: x - 1 };

        graph.nodes.push(newNode);
        graph.routeAllPermutations();
        onChange(graph);
        e.stopPropagation();
      }
    } else if (tool === 'delete') {
      if (node?.type === GraphNodeType.Internal) {
        graph.deleteNode(node);
        graph.routeAllPermutations();
        onChange(graph);
        e.stopPropagation();
      } else if (edge) {
        graph.deleteEdge(edge);
        graph.routeAllPermutations();
        onChange(graph);
        e.stopPropagation();
      }
    } else if (tool === 'drag') {
      if (node?.type === GraphNodeType.Internal) {
        setDraggedNode(node);
        e.stopPropagation();
      }
    }

    /*
    if (mode === 'nodes') {
      if (action === 'insert') {
        let guideline = graph.snapToGuideline(ex);
        if (guideline !== null) {
          
          let newNode: GraphNode = { type: GraphNodeType.Internal, key: "usrnd_" + graph.getNextId(), y: ey, fx: guideline?.x, guideline };

          graph.nodes.push(newNode);
          graph.routeAllPermutations();
          onChange();
          e.stopPropagation();
        }
      } else if (action === 'drag') {
        if (node?.type === GraphNodeType.Internal) {
          setDraggedNode(node);
          e.stopPropagation();
        }
      } else if (action === 'delete') {
        if (node?.type === GraphNodeType.Internal) {
          graph.deleteNode(node);
          graph.routeAllPermutations();
          onChange();
          e.stopPropagation();
        }
      }
    } else if (mode === 'edges') {
      if (action === 'insert') {
        if (node) {
          setEdgeInteraction({
            fromNode: node
          });
          e.stopPropagation();
        }
      } else if (action === 'delete') {
        if (edge) {
          graph.deleteEdge(edge);
          graph.routeAllPermutations();
          onChange();
          e.stopPropagation();
        }
      }
    }*/
  }

  function handleMouseMove(e: React.MouseEvent) {
    let [ex, ey] = getEventPoint(e);

      console.log(draggedNode);
    if (draggedNode) {
      let x = clipToRange(grid.xFromScreen(ex, ey, true), 1, graph.numGuidelines);
      let y = grid.yFromScreen(ex, ey, false);

      draggedNode.guideline = x - 1;
      draggedNode.fx = x;
      draggedNode.fy = y;
      onChange(graph);
    } else if (edgeInteraction) {
      setEdgeInteraction({
        fromNode: edgeInteraction.fromNode
      });
      e.stopPropagation();
    }

    setMousePos([ex, ey]);
  }

  function handleMouseUp(e: React.MouseEvent, node?: GraphNode) {
    let [ex, ey] = getEventPoint(e);

    if (draggedNode) {
      let x = clipToRange(grid.xFromScreen(ex, ey, true), 1, graph.numGuidelines);
      let y = grid.yFromScreen(ex, ey, false);

      draggedNode.guideline = x - 1;
      draggedNode.fx = x;
      draggedNode.fy = y;

      onChange(graph);
      setDraggedNode(undefined);
      e.stopPropagation();
    }

    if (edgeInteraction) {
      if (node) {
        let newEdge: GraphEdge = {
          source: edgeInteraction.fromNode,
          target: node
        };
        graph.edges.push(newEdge);
        graph.routeAllPermutations();
      }

      onChange(graph);
      setEdgeInteraction(undefined);
      e.stopPropagation();
    }
  }

  function drawGraph(canvas: React.JSX.Element[], labels: React.JSX.Element[]) {
    for (let guidelineIdx = 0; guidelineIdx < graph.numGuidelines; guidelineIdx++) {
      let [fromX, fromY] = grid.toScreen(guidelineIdx+1, grid.extent.top-1);
      let [toX, toY] = grid.toScreen(guidelineIdx+1, grid.extent.bottom+1);
      let line = <line key={`gdln_${guidelineIdx}`} x1={fromX} x2={toX} y1={fromY} y2={toY} stroke={"black"} strokeWidth={zoom*4} onMouseDown={e => handleMouseDown(e, undefined, undefined)} />
      canvas.push(line);
    }

    for (let edge of graph.edges) {
      let src = edge.source as GraphNode;
      let tgt = edge.target as GraphNode;

      let [fromX, fromY] = grid.toScreen(src.x||0, src.y||0);
      let [toX, toY] = grid.toScreen(tgt.x||0, tgt.y||0);

      let line = <line className={tool==='delete'?"cursor-pointer":""} key={edge.index} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="white" strokeWidth={zoom*2} onMouseDown={e => handleMouseDown(e, undefined, edge)} />;

      canvas.push(line);
    }

    let paths = perm ? graph.routingLut.get(perm.lut.toString()) : null;
    if (paths) {
      var colorScale = getColorScale(paths.length);
      for (let [pathIdx, path] of paths.entries()) {
        for (let nodeIdx = 0; nodeIdx < path.length - 1; nodeIdx++) {
          let src = path[nodeIdx];
          let tgt = path[nodeIdx + 1];

          let [fromX, fromY] = grid.toScreen(src.x || 0, src.y || 0);
          let [toX, toY] = grid.toScreen(tgt.x || 0, tgt.y || 0);

          let line = <line className="pointer-events-none" x1={fromX} y1={fromY} x2={toX} y2={toY} stroke={colorScale(pathIdx)} strokeWidth={zoom*5} />;
          canvas.push(line);
        }
      }
    }

    if (edgeInteraction && mousePos) {
      let src = edgeInteraction.fromNode;
      let [fromX, fromY] = grid.toScreen(src.x||0, src.y||0);

      let line = <line key={"edgeInteract"} x1={fromX} y1={fromY} x2={mousePos[0]} y2={mousePos[1]} stroke="white" strokeOpacity={0.5} strokeWidth={zoom*4} />;

      canvas.push(line);
    }

    if (tool==="insert" && mousePos) {
      let guideline = graph.snapToGuideline(mousePos[0]);
      let circ = <circle key="ghostCirc" cx={guideline ? 0 : mousePos[0]} cy={mousePos[1]} r={10} fill={midColor} fillOpacity={0.5} />
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
      drawNode(zoom, grid, node.type, node.type, node.x || 0, node.y || 0, canvas, labels, {
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
  
  
  let permWidget = perm && <PermWidget 
      zoom={zoom} enableTransition={enableTransition} perm={perm} onPermChanged={onPermChanged} vertical={vertical} 
      xyToIdx={(x, y) => grid.yFromScreen(x, y)} idxToXY={idx => applyTerminalBias(zoom, grid, ...grid.toScreen(grid.extent.right, idx), false)} />

  return <div className="flex items-stretch w-full h-full p-1" style={{ flexDirection: vertical ? "column" : "row"}}>
    <div className="flex grow items-stretch p-1" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div ref={ref} className="relative flex grow p-0 m-0 overflow-hidden" >
        {svg}
        {labels}
        {permWidget}
      </div>
    </div>
  </div>
}