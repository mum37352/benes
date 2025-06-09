import useResizeObserver from "@react-hook/resize-observer";
import * as d3 from "d3";
import { useLayoutEffect, useReducer, useRef, useState } from "react";
import Permutation, { correctIdx } from "../common/Permutation";
import { backgroundColor, getColorScale, inputColor, midColor, outputColor } from "../common/Colors";
import PermWidget, { Vec2 } from "@/common/PermWidget";
import { Graph, GraphEdge, GraphNode, GraphNodeType, height, width } from "./Graph";


type AddEdgeInteraction = {
  fromNode: GraphNode,
  toX: number,
  toY: number
};

export default function Construction({
  ioHeight,
  perm
} : {ioHeight: number, perm: Permutation | null})
{
  let ref = useRef<HTMLDivElement>(null);
  let dummyRectRef = useRef<SVGRectElement>(null);
  let [size, setSize] = useState<DOMRect|undefined>();

  let [draggedNode, setDraggedNode] = useState<GraphNode>();
  let [edgeInteraction, setEdgeInteraction] = useState<AddEdgeInteraction>();

  // TODO: This will execute the constructor every time we render.
  let [graph, setGraph] = useState<Graph>(new Graph(ioHeight));
  
  // HACK: Have some default value for our graph.
  if (graph.edges.length === 0) {
    let graph = Graph.makeCompleteBipartiteGraph(ioHeight);
    setGraph(graph);
  }

  let [editPerm, setEditPerm] = useState<Permutation>(new Permutation([...Array(ioHeight).keys()]));

  if (perm == null) {
    perm = editPerm;
  }

  let [simulation, setSimulation] = useState<d3.Simulation<GraphNode, undefined>>();
  let [, forceUpdate] = useReducer(x => x + 1, 0);
  
  let screenWidth = size?.width || 0;
  let screenHeight = size?.height || 0;

  let vertical = false;

  function ticked() {
    forceUpdate();
  }
  
  useLayoutEffect(() => {
    setSize(ref.current?.getBoundingClientRect());

    let sim = d3.forceSimulation(graph.nodes)

    sim.on("tick", ticked);
    sim.force("charge", d3.forceManyBody());
    sim.force("springs", d3.forceLink(graph.edges))

    setSimulation(sim);
  }, [ref]);

  if (typeof window !== "undefined") {
    useResizeObserver(ref, entry => setSize(entry.contentRect));
  }

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

  function reheat() {
    simulation?.nodes(graph.nodes).alpha(1).restart();
    forceUpdate();
  }

  function handleMouseDown(e: React.MouseEvent, node?: GraphNode) {
    let [ex, ey] = getEventPoint(e);

    if (e.ctrlKey) {
      let newNode: GraphNode = { type: GraphNodeType.Internal, key: "usrnd_" + graph.getNextId(), y: ey, x: ex };

      graph.nodes.push(newNode);
      graph.routeAllPermutations();
      reheat();
      e.stopPropagation();
    } else if (e.altKey) {
      if (node) {
        setEdgeInteraction({
          fromNode: node,
          toX: ex,
          toY: ey
        });
        e.stopPropagation();
      }
    } else {
      if (node?.type === GraphNodeType.Internal) {
        setDraggedNode(node);
        e.stopPropagation();
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    let [ex, ey] = getEventPoint(e);

    if (draggedNode) {
      draggedNode.fx = ex;
      draggedNode.fy = ey;
      reheat();
    } else if (edgeInteraction) {
      setEdgeInteraction({
        fromNode: edgeInteraction.fromNode,
        toX: ex,
        toY: ey
      });
      e.stopPropagation();
    }
  }

  function handleMouseUp(e: React.MouseEvent, node?: GraphNode) {
    let [ex, ey] = getEventPoint(e);

    if (draggedNode) {
      draggedNode.fx = draggedNode.fy = undefined;
      draggedNode.x = ex;
      draggedNode.y = ey;
      reheat();
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

      reheat();
      setEdgeInteraction(undefined);
      e.stopPropagation();
    }
  }

  function drawGraph(canvas: React.JSX.Element[]) {
    for (let edge of graph.edges) {
      let src = edge.source as GraphNode;
      let tgt = edge.target as GraphNode;

      let line = <line key={edge.index} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke="white" strokeWidth={2} />;

      canvas.push(line);
    }

    var colorScale = getColorScale(ioHeight);
    let paths = graph.routingLut.get(perm.lut.toString());
    if (paths) {
      for (let [pathIdx, path] of paths.entries()) {
        for (let nodeIdx = 0; nodeIdx < path.length - 1; nodeIdx++) {
          let src = path[nodeIdx];
          let tgt = path[nodeIdx + 1];

          let line = <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke={colorScale(pathIdx)} strokeWidth={5} />;
          canvas.push(line);
        }
      }
    }

    if (edgeInteraction) {
      let src = edgeInteraction.fromNode;
      let line = <line key={"edgeInteract"} x1={src.x} y1={src.y} x2={edgeInteraction.toX} y2={edgeInteraction.toY} stroke="white" strokeWidth={4} />;

      canvas.push(line);
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

      let circ = <circle key={node.key} cx={node.x} cy={node.y} r={10} fill={color} onMouseDown={e => handleMouseDown(e, node)} onMouseUp={e => handleMouseUp(e, node)}/>

      canvas.push(circ);
    }
  }

  let graphCanvas : React.JSX.Element[] = [];
  drawGraph(graphCanvas);

  let svg = <svg className="absolute" width={screenWidth} height={screenHeight} viewBox={`0 0 ${width} ${height}`} >
    <rect ref={dummyRectRef} opacity={0} x="0" y="0" width="0" height="0" stroke="none" fill="none" />
    {graphCanvas}
  </svg>;

  function handlePermChange(newPerm: Permutation) {
    setEditPerm(newPerm);
  }

  return <div className="flex items-stretch w-full h-full p-1" style={{ background: backgroundColor, flexDirection: vertical ? "column" : "row"}}>
    <div className="flex grow items-stretch p-1" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div ref={ref} className="relative flex grow p-0 m-0 overflow-hidden" >
        {svg}
        <PermWidget perm={perm} onPermChanged={handlePermChange} vertical={false} idxToXY={idx => svgToClient(...graph.getOutputPos(idx))} xyToIdx={(x, y) => clientToIdx(x, y)}/>
      </div>
      
    </div>
  </div>
}