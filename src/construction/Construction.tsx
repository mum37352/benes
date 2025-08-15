import { useRef, useState } from "react";
import Permutation, { clipToRange } from "../common/Permutation";
import {  getColorScale, midColor } from "../common/Colors";
import PermWidget from "@/common/PermWidget";
import { CommGraph, CommGraphNode } from "./CommGraph";
import { useFlushingResizeObserver } from "@/common/resizeObserver";
import { ToolSel } from "../common/Toolbar";
import { computeGridLayout as computeWeightedLayout, computeGridMargins, Grid } from "@/common/Grid";
import { applyTerminalBias, drawNode, GraphNodeType, graphNodeTypeToColor } from "@/common/NodeDrawing";
import { Box, Vec2 } from "@/common/mathUtils";
import { useGraphCanvas } from "@/common/GraphCanvas";

type AddEdgeInteraction = {
  fromNode: string,
};

export default function Construction({
  perm,
  commGraph,
  onChange = (() => {}),
  tool,
  onPermChanged=null
} : {perm: Permutation | undefined, commGraph: CommGraph, onChange?: Function, tool: ToolSel, onPermChanged?: null | ((newPerm: Permutation) => void)})
{
  let cnv = useGraphCanvas();

  let [draggedNode, setDraggedNode] = useState<string>();
  let [edgeInteraction, setEdgeInteraction] = useState<AddEdgeInteraction>();
  let [mousePos, setMousePos] = useState<Vec2>();

  let margin = computeGridMargins(true, false);

  // For fence post reasons, we add 1 to the numGuidelines instead of adding 2. Same for inputs
  let graphWidth = 1 + commGraph.numGuidelines;
  let graphHeight = commGraph.ioHeight - 1;
  let gridWidths = computeWeightedLayout(cnv.screenWidth, [margin.left, graphWidth, margin.right]);
  let gridHeights = computeWeightedLayout(cnv.screenHeight, [margin.top, graphHeight, margin.bottom]);

  let graphBox = new Box(gridWidths[0], gridHeights[0], gridWidths[0] + gridWidths[1], gridHeights[0] + gridHeights[1]);
  let grid = new Grid(new Box(0, 0, graphWidth, graphHeight), false, graphBox);

  let zoom = Math.min(gridWidths[1]/graphWidth, gridHeights[1]/graphHeight) / 100;

  let vertical = false;

  // NOTE: Calling e.preventDefault is necessary in the mouse handlers, to avoid
  // Firefox from removing the keyboard focus from the parent interceptor.

  function handleMouseDown(e: React.MouseEvent, node?: string, edge?: string) {
    let [ex, ey] = cnv.getEventPoint(e);
    let type = node ? commGraph.graph.getNodeAttribute(node, "type") : undefined;

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
        let x = clipToRange(grid.xFromScreen(ex, ey, true), 1, commGraph.numGuidelines);
        let y = grid.yFromScreen(ex, ey, false);

        let id = "usrnd_" + commGraph.getNextId();

        commGraph.graph.addNode(id, { type: GraphNodeType.Internal, x, y, guideline: x - 1 });
        commGraph.routeAllPermutations();

        onChange(commGraph);
        e.stopPropagation();
        e.preventDefault();
      }
    } else if (tool === 'delete') {
      if (type === GraphNodeType.Internal) {
        commGraph.graph.dropNode(node);
        commGraph.routeAllPermutations();
        onChange(commGraph);
        e.stopPropagation();
        e.preventDefault();
      } else if (edge) {
        commGraph.graph.dropEdge(edge);
        commGraph.routeAllPermutations();
        onChange(commGraph);
        e.stopPropagation();
        e.preventDefault();
      }
    } else if (tool === 'drag') {
      if (type === GraphNodeType.Internal) {
        setDraggedNode(node);
        e.stopPropagation();
        e.preventDefault();
      }
    }
  }

  function reassignNodePosition(e: React.MouseEvent) {
    let [ex, ey] = cnv.getEventPoint(e);

      let x = clipToRange(grid.xFromScreen(ex, ey, true), 1, commGraph.numGuidelines);
      let y = grid.yFromScreen(ex, ey, false);

      let draggedAttr = commGraph.graph.getNodeAttributes(draggedNode);
      draggedAttr.guideline = x - 1;
      draggedAttr.x = x;
      draggedAttr.y = y;
      onChange(commGraph);
  }


  function handleMouseMove(e: React.MouseEvent) {
    let [ex, ey] = cnv.getEventPoint(e);

    if (draggedNode) {
      reassignNodePosition(e);
    } else if (edgeInteraction) {
      setEdgeInteraction({
        fromNode: edgeInteraction.fromNode
      });
      e.stopPropagation();
      e.preventDefault();
    }

    setMousePos([ex, ey]);
  }

  function handleMouseUp(e: React.MouseEvent, node?: string) {
    if (draggedNode) {
      reassignNodePosition(e);
      setDraggedNode(undefined);
      e.stopPropagation();
      e.preventDefault();
    }

    if (edgeInteraction) {
      if (node) {
        // Prevent self-loops.
        if (edgeInteraction.fromNode !== node) {
          commGraph.graph.addEdge(edgeInteraction.fromNode, node);
          commGraph.routeAllPermutations();
          onChange(commGraph);
        }
      }

      setEdgeInteraction(undefined);
      e.stopPropagation();
      e.preventDefault();
    }
  }

  function drawGraph(canvas: React.JSX.Element[], labels: React.JSX.Element[]) {
    for (let guidelineIdx = 0; guidelineIdx < commGraph.numGuidelines; guidelineIdx++) {
      let [fromX, fromY] = grid.toScreen(guidelineIdx+1, grid.extent.top-1);
      let [toX, toY] = grid.toScreen(guidelineIdx+1, grid.extent.bottom+1);
      let line = <line key={`gdln_${guidelineIdx}`} x1={fromX} x2={toX} y1={fromY} y2={toY} stroke={"black"} strokeWidth={zoom*4} onMouseDown={e => handleMouseDown(e, undefined, undefined)} />
      canvas.push(line);
    }

    commGraph.graph.forEachEdge((edgeId, attributes, source, target) => {
      let src = commGraph.graph.getNodeAttributes(source);
      let tgt = commGraph.graph.getNodeAttributes(target);
      let [fromX, fromY] = grid.toScreen(src.x || 0, src.y || 0);
      let [toX, toY] = grid.toScreen(tgt.x || 0, tgt.y || 0);

      let line = <line className={tool === 'delete' ? "cursor-pointer" : ""} key={edgeId} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="white" strokeWidth={zoom * 2} onMouseDown={e => handleMouseDown(e, undefined, edgeId)} />;

      canvas.push(line);
    });

    let paths = perm ? commGraph.routingLut.get(perm.lut.toString()) : null;
    if (paths) {
      var colorScale = getColorScale(paths.length);
      for (let [pathIdx, path] of paths.entries()) {
        for (let nodeIdx = 0; nodeIdx < path.length - 1; nodeIdx++) {
          let src = commGraph.graph.getNodeAttributes(path[nodeIdx]);
          let tgt = commGraph.graph.getNodeAttributes(path[nodeIdx + 1]);

          let [fromX, fromY] = grid.toScreen(src.x || 0, src.y || 0);
          let [toX, toY] = grid.toScreen(tgt.x || 0, tgt.y || 0);

          let line = <line className="pointer-events-none" key={`path-${pathIdx}-${nodeIdx}`} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke={colorScale(pathIdx)} strokeWidth={zoom*5} />;
          canvas.push(line);
        }
      }
    }

    if (edgeInteraction && mousePos) {
      let src = commGraph.graph.getNodeAttributes(edgeInteraction.fromNode);
      let [fromX, fromY] = grid.toScreen(src.x||0, src.y||0);

      let line = <line key={"edgeInteract"} x1={fromX} y1={fromY} x2={mousePos[0]} y2={mousePos[1]} stroke="white" strokeOpacity={0.5} strokeWidth={zoom*4} />;

      canvas.push(line);
    }

    if (tool==="insert" && mousePos) {
      let circ = <circle key="ghostCirc" cx={mousePos[0]} cy={mousePos[1]} r={10} fill={midColor} fillOpacity={0.5} />
      canvas.push(circ);
    }

    commGraph.graph.forEachNode((node, attrs) => {
      let cursor = "";
      if (tool === "drag") {
        cursor = "cursor-grab";
      } else if (tool === "delete") {
        cursor = "cursor-pointer"
      } else if (tool === "insert") {
        cursor = "cursor-crosshair"
      }
      drawNode(zoom, grid, attrs.type, graphNodeTypeToColor(attrs.type), attrs.x || 0, attrs.y || 0, canvas, labels, {
        className: cursor,
        onMouseDown: (e: React.MouseEvent) => {handleMouseDown(e, node)},
        onMouseUp: (e: React.MouseEvent) => {handleMouseUp(e, node)}
      });
    });
  }

  let graphCanvas: React.JSX.Element[] = [];
  let labels: React.JSX.Element[] = [];
  drawGraph(graphCanvas, labels);

  let svg = <svg className="absolute" width={cnv.screenWidth} height={cnv.screenHeight} >
    <rect ref={cnv.dummyRectRef} opacity={0} x="0" y="0" width="0" height="0" stroke="none" fill="none" />
    {graphCanvas}
  </svg>;
  
  
  let permWidget = perm && <PermWidget
      onHover={() => {}} onLeave={() => {}}
      zoom={zoom} enableTransition={cnv.enableTransition} perm={perm} onPermChanged={onPermChanged} vertical={vertical} 
      xyToIdx={(x, y) => grid.yFromScreen(x, y)} idxToXY={idx => applyTerminalBias(zoom, grid, ...grid.toScreen(grid.extent.right, idx), false)} />

  return <div className="flex items-stretch w-full h-full p-1" style={{ flexDirection: vertical ? "column" : "row"}}>
    <div className="flex grow items-stretch p-1" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div ref={cnv.ref} className="relative flex grow p-0 m-0 overflow-hidden" >
        {svg}
        {labels}
        {permWidget}
      </div>
    </div>
  </div>
}