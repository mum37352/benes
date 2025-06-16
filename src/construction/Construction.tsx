import useResizeObserver from "@react-hook/resize-observer";
import * as d3 from "d3";
import { act, useLayoutEffect, useReducer, useRef, useState } from "react";
import Permutation, { correctIdx } from "../common/Permutation";
import { backgroundColor, getColorScale, inputColor, midColor, outputColor, topColor } from "../common/Colors";
import PermWidget from "@/common/PermWidget";
import { Graph, GraphEdge, GraphNode, GraphNodeType, Guideline, height, width } from "./Graph";
import { useFlushingResizeObserver } from "@/common/resizeObserver";
import { ConstructionAction, ConstructionMode } from "./Toolbar";
import { Vec2 } from "@/common/Grid";


type AddEdgeInteraction = {
  fromNode: GraphNode,
};

export default function Construction({
  perm,
  graph,
  onChange = (() => {}),
  mode='nodes',
  action='drag',
  onPermChanged=null
} : {perm: Permutation | undefined, graph: Graph, onChange?: Function, mode?: ConstructionMode, action?: ConstructionAction, onPermChanged?: null | ((newPerm: Permutation) => void)})
{
  let ref = useRef<HTMLDivElement>(null);
  let dummyRectRef = useRef<SVGRectElement>(null);
  
  let {size, enableTransition} = useFlushingResizeObserver(ref);

  let [draggedNode, setDraggedNode] = useState<GraphNode>();
  let [draggedGuideline, setDraggedGuideline] = useState<Guideline>();
  let [edgeInteraction, setEdgeInteraction] = useState<AddEdgeInteraction>();
  let [mousePos, setMousePos] = useState<Vec2>();

  let screenWidth = size?.width || 0;
  let screenHeight = size?.height || 0;


  //let gridWidths = computeGridLayout(width, [marginWidth, subnet.width, marginWidth]);
  //let gridHeights = computeGridLayout(height, [marginHeight, subnet.height, marginHeight]);

  //let gridBox = new Box(gridWidths[0], gridHeights[0], gridWidths[0] + gridWidths[1], gridHeights[0] + gridHeights[1]);

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

  function clientToIdx(x: number, y: number) {
    let [svgX, svgY] = clientToSvg(x, y);
    let scaleY = graph.yScale.invert(svgY);
    return correctIdx(scaleY, height);
  }

  function getEventPoint(e: React.MouseEvent) {
    return clientToSvg(e.clientX, e.clientY);
  }

  function handleMouseDown(e: React.MouseEvent, node?: GraphNode, edge?: GraphEdge, guideline?: Guideline) {
    let [ex, ey] = getEventPoint(e);

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
    } else if (mode === 'guidelines') {
      if (action === 'insert') {
        let newGuideline: Guideline = { x: ex, key: "usrgd_" + graph.getNextId() };

        graph.addGuideline(newGuideline);
        e.stopPropagation();
      } else if (action === 'delete') {
        if (guideline) {
          graph.deleteGuideline(guideline);
        }
      } else if (action === 'drag') {
        if (guideline) {
          setDraggedGuideline(guideline);
          e.stopPropagation();
        }
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    let [ex, ey] = getEventPoint(e);

    if (draggedNode) {
      let guideline = graph.snapToGuideline(ex);
      if (guideline) {
        draggedNode.guideline = guideline;
        draggedNode.fx = guideline ? guideline.x : ex;
        draggedNode.fy = ey;
        onChange();
      }
    } else if (draggedGuideline) {
      graph.setGuidelineX(draggedGuideline, ex);
      onChange();
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
      let guideline = graph.snapToGuideline(ex);
      if (guideline) {
        draggedNode.fy = undefined;
        draggedNode.fx = guideline ? guideline.x : ex;
        draggedNode.guideline = guideline;
        draggedNode.y = ey;
        onChange();
        setDraggedNode(undefined);
        e.stopPropagation();
      }
    }

    if (draggedGuideline) {
      graph.setGuidelineX(draggedGuideline, ex);
      onChange();
      setDraggedGuideline(undefined);
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

      onChange();
      setEdgeInteraction(undefined);
      e.stopPropagation();
    }
  }

  function drawGraph(canvas: React.JSX.Element[]) {
    for (let guideline of graph.guidelines) {
      let className = "";
      if (mode === 'guidelines') {
        if (action === 'drag') {
          className += "cursor-ew-resize";
        } else if (action === 'delete') {
          className += "cursor-pointer";
        }
      }
      let line = <line key={guideline.key} className={className} x1={guideline.x} x2={guideline.x} y1={0} y2={height} stroke={"black"} strokeWidth={4} onMouseDown={e => handleMouseDown(e, undefined, undefined, guideline)} />
      canvas.push(line);
    }

    if (mode === 'guidelines' && action === 'insert' && mousePos) {
      let line = <line x1={mousePos[0]} x2={mousePos[0]} y1={0} y2={height} stroke={"black"} strokeWidth={4} opacity={0.5} />
      canvas.push(line);
    }

    for (let edge of graph.edges) {
      let src = edge.source as GraphNode;
      let tgt = edge.target as GraphNode;

      let line = <line className={mode==='edges'&&action==='delete'?"cursor-pointer":""} key={edge.index} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke="white" strokeWidth={2} onMouseDown={e => handleMouseDown(e, undefined, edge)} />;

      canvas.push(line);
    }

    let paths = perm ? graph.routingLut.get(perm.lut.toString()) : null;
    if (paths) {
      var colorScale = getColorScale(paths.length);
      for (let [pathIdx, path] of paths.entries()) {
        for (let nodeIdx = 0; nodeIdx < path.length - 1; nodeIdx++) {
          let src = path[nodeIdx];
          let tgt = path[nodeIdx + 1];

          let line = <line className="pointer-events-none" x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke={colorScale(pathIdx)} strokeWidth={5} />;
          canvas.push(line);
        }
      }
    }

    if (edgeInteraction && mousePos) {
      let src = edgeInteraction.fromNode;
      let line = <line key={"edgeInteract"} x1={src.x} y1={src.y} x2={mousePos[0]} y2={mousePos[1]} stroke="white" strokeWidth={4} />;

      canvas.push(line);
    }

    if (mode === 'nodes' && action==="insert" && mousePos) {
      let guideline = graph.snapToGuideline(mousePos[0]);
      let circ = <circle key="ghostCirc" cx={guideline ? guideline.x : mousePos[0]} cy={mousePos[1]} r={10} fill={midColor} fillOpacity={0.5} />
      canvas.push(circ);
    }

    for (let node of graph.nodes) {
      let color;
      if (node.type === GraphNodeType.Internal) {
        color = midColor;
      } else if (node.type === GraphNodeType.Input) {
        color = inputColor;
      } else if (node.type === GraphNodeType.Output) {
        color = outputColor;
      }

      let circ = <circle className={mode==="nodes"&&action==='drag'?"cursor-grab":""} key={node.key} cx={node.x} cy={node.y} r={10} fill={color} 
      onMouseDown={
        e => {
          
          handleMouseDown(e, node)
        }
      } onMouseUp={e => handleMouseUp(e, node)}/>

      canvas.push(circ);
    }
  }

  let graphCanvas : React.JSX.Element[] = [];
  drawGraph(graphCanvas);

  let svg = <svg className="absolute" width={screenWidth} height={screenHeight} viewBox={`0 0 ${width} ${height}`} >
    <rect ref={dummyRectRef} opacity={0} x="0" y="0" width="0" height="0" stroke="none" fill="none" />
    {graphCanvas}
  </svg>;

  return <div className="flex items-stretch w-full h-full p-1" style={{ flexDirection: vertical ? "column" : "row"}}>
    <div className="flex grow items-stretch p-1" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div ref={ref} className="relative flex grow p-0 m-0 overflow-hidden" >
        {svg}
        {perm && 
        <PermWidget enableTransition={enableTransition} zoom={1} perm={perm} onPermChanged={onPermChanged} vertical={false} idxToXY={idx => svgToClient(...graph.getOutputPos(idx))} xyToIdx={(x, y) => clientToIdx(x, y)}/>
        }
        </div>
      
    </div>
  </div>
}