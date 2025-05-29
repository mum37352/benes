import useResizeObserver from "@react-hook/resize-observer";
import * as d3 from "d3";
import { useLayoutEffect, useReducer, useRef, useState } from "react";
import Permutation from "../common/Permutation";
import { assert } from "console";
import { backgroundColor, inputColor, midColor, outputColor } from "../common/Colors";

let width = 928;
let height = 680;

enum GraphNodeType {
  Input,
  Output,
  Internal
}

interface GraphNode extends d3.SimulationNodeDatum {
  type: GraphNodeType,
  key: string
}

type GraphEdge = d3.SimulationLinkDatum<GraphNode>;

class Graph {
  constructor(ioHeight: number) {
    this.xScale = d3.scaleLinear([-6, +6], [0, width]);
    this.yScale = d3.scaleLinear([-1, ioHeight], [0, height]);

    this.ioHeight = ioHeight;

    this.inputs = [];
    for (let inputIdx = 0; inputIdx < ioHeight; inputIdx++) {
      let node : GraphNode = {key: "in_"+inputIdx, type: GraphNodeType.Input, fy: this.yScale(inputIdx), fx: this.xScale(-5)};
      this.inputs.push(node);
    }
    this.outputs = [];
    for (let outputIdx = 0; outputIdx < ioHeight; outputIdx++) {
      let node : GraphNode = {key: "out_"+outputIdx, type: GraphNodeType.Output, fy: this.yScale(outputIdx), fx: this.xScale(+5)};
      this.outputs.push(node);
    }

    this.nextId = 0;

    let nodeA : GraphNode = {key: "r", type: GraphNodeType.Internal};
    let nodeB : GraphNode = {key: "j", type: GraphNodeType.Internal};
    this.nodes = [...this.inputs, ...this.outputs, nodeA, nodeB, {key: "k", type: GraphNodeType.Internal}];
    this.edges = [{source: nodeA, target: nodeB}];
  }

  routePermutation(perm: Permutation) {
    let paths: GraphNode[][] = [];
    let visitedVerts = new Set<GraphNode>();
    let success = this.routePermutation_recurse(perm, 0, paths, visitedVerts);

    return success ? paths : null;
  }

  routePermutation_recurse(perm: Permutation, pathIdx: number, paths: GraphNode[][], visitedVerts: Set<GraphNode>) {
    let dst = this.outputs[perm.lut[pathIdx]];

    let newPath : GraphNode[] = [];
    type StackEntry = {node: GraphNode, pathIdx: number};
    let stack : StackEntry[] = [{node: this.inputs[pathIdx], pathIdx: 0}];

    for (;;) {
      let atEntry = stack.pop();

      if (!atEntry) {
        break;
      }

      // Truncate.
      newPath.length = atEntry.pathIdx;
      newPath.push(atEntry.node);

      if (visitedVerts.has(atEntry.node)) {
        continue;
      }

      visitedVerts.add(atEntry.node);

      if (atEntry.node === dst) {
        paths.push(newPath);

        if (pathIdx < this.ioHeight - 1) {
          if (this.routePermutation_recurse(perm, pathIdx + 1, paths, visitedVerts)) {
            return true;
          }

          paths.pop();
        } else {
          return true;
        }
      }

      newPath.push();

      let neighbors = this.adjacentVerts(atEntry.node);
      for (let neighbor of neighbors) {
        stack.push({node: neighbor, pathIdx: newPath.length});
      }
    }

    // Could not find a path.
    return false;
  }

  adjacentVerts(node: GraphNode) {
    let result = [];

    for (let edge of this.edges) {
      if (edge.source === node) {
        result.push(edge.source);
      } else if (edge.target === node) {
        result.push(edge.target);
      }
    }

    return result;
  }

  getNextId() {
    return this.nextId++;
  }

  nextId: number;

  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;

  ioHeight: number;
  inputs: GraphNode[];
  outputs: GraphNode[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

type AddEdgeInteraction = {
  fromNode: GraphNode,
  toX: number,
  toY: number
};

export default function Construction({
  ioHeight
} : {ioHeight: number})
{
  let ref = useRef<HTMLDivElement>(null);
  let dummyRectRef = useRef<SVGRectElement>(null);
  let [size, setSize] = useState<DOMRect|undefined>();

  let [draggedNode, setDraggedNode] = useState<GraphNode>();
  let [edgeInteraction, setEdgeInteraction] = useState<AddEdgeInteraction>();

  // TODO: This will execute the constructor every time we render.
  let [graph, setGraph] = useState<Graph>(new Graph(ioHeight));

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

  function getEventPoint(e: React.MouseEvent) {
    let svgPoint = new DOMPoint(e.clientX, e.clientY);
    //console.log("client", svgPoint);
    svgPoint = svgPoint.matrixTransform(dummyRectRef.current?.getScreenCTM()?.inverse());
    //console.log("xform", svgPoint);
    //svgPoint.x = graph.xScale.invert(svgPoint.x);
    //svgPoint.y = graph.yScale.invert(svgPoint.y);
    //console.log("scale", svgPoint);
    return [svgPoint.x, svgPoint.y];
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
        console.log("Adding new edge");
        let newEdge: GraphEdge = {
          source: edgeInteraction.fromNode,
          target: node
        };
        graph.edges.push(newEdge);
        console.log(graph.edges);
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

      let line = <line key={edge.index} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke="white" strokeWidth={4} />;

      canvas.push(line);
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

  let svg = <svg className="absolute" width={screenWidth} height={screenHeight} viewBox={`0 0 ${width} ${height}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
    <rect ref={dummyRectRef} opacity={0} x="0" y="0" width="0" height="0" stroke="none" fill="none" />
    {graphCanvas}
  </svg>;

  return <div className="flex items-stretch w-full h-full p-1" style={{ background: backgroundColor, flexDirection: vertical ? "column" : "row"}}>
    <div className="flex grow items-stretch p-1">
      <div ref={ref} className="relative flex grow p-0 m-0 overflow-hidden" >
        {svg}
      </div>
    </div>
  </div>
}