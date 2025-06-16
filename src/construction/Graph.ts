import { Vec2 } from "@/common/Grid";
import * as d3 from "d3";

export let width = 928;
export let height = 680;

export enum GraphNodeType {
  Input,
  Output,
  Internal
}

export type Guideline = {
  x: number,
  key: string
};

export interface GraphNode extends d3.SimulationNodeDatum {
  type: GraphNodeType,
  key: string,
  guideline: Guideline
}

export type GraphEdge = d3.SimulationLinkDatum<GraphNode>;

export class Graph {
  constructor(ioHeight: number) {
    this.xScale = d3.scaleLinear([-6, +6], [0, width]);
    this.yScale = d3.scaleLinear([-1, ioHeight], [0, height]);

    this.ioHeight = ioHeight;

    let inputGuideline: Guideline = {x: this.xScale(-5), key: "ingd"};
    let outputGuideline: Guideline = {x: this.xScale(+5), key: "outgd"};

    this.guidelines = [inputGuideline, outputGuideline];

    this.inputs = [];
    for (let inputIdx = 0; inputIdx < ioHeight; inputIdx++) {
      let [x, y] = this.getInputPos(inputIdx);
      let node : GraphNode = {key: "innd_"+inputIdx, type: GraphNodeType.Input, fx: x, fy: y, guideline: inputGuideline};
      this.inputs.push(node);
    }

    this.outputs = [];
    for (let outputIdx = 0; outputIdx < ioHeight; outputIdx++) {
      let [x, y] = this.getOutputPos(outputIdx);
      let node : GraphNode = {key: "outnd_"+outputIdx, type: GraphNodeType.Output, fx: x, fy: y, guideline: outputGuideline};
      this.outputs.push(node);
    }

    this.nextId = 0;

    this.nodes = [...this.inputs, ...this.outputs];
    this.edges = [];

    // Totally valid since we have no edges.
    this.routingLut = new Map();
  }
  
  centerX() {
    return this.xScale(0);
  }

  centerY() {
    return height/2;
  }

  static makeCompleteBipartiteGraph(ioHeight: number) {
    let graph = new Graph(ioHeight);

    
    for (let inputIdx = 0; inputIdx < ioHeight; inputIdx++) {
      for (let outputIdx = 0; outputIdx < ioHeight; outputIdx++) {
        let newEdge: GraphEdge = {
          source: graph.inputs[inputIdx],
          target: graph.outputs[outputIdx]
        };
        graph.edges.push(newEdge);
      }
    }
    
    graph.routeAllPermutations();

    return graph;
  }

  addGuideline(newGuideline: Guideline) {
    this.guidelines.push(newGuideline);
    // Maybe not the most efficient way, but whatever.
    this.guidelines.sort((a, b) => a.x - b.x);
  }

  deleteGuideline(guideline: Guideline) {
    // Eliminate nodes on this guideline. Might not be the best approach.
    for (;;) {
      // Check if there is a node on the guideline.
      let nodeOnGuideline = null;
      for (let node of this.nodes) {
        if (node.guideline === guideline) {
          nodeOnGuideline = node;
          break;
        }
      }

      if (nodeOnGuideline) {
        this.deleteNode(nodeOnGuideline);
      } else {
        break;
      }
    }

    
    for (let i = this.guidelines.length - 1; i >= 0; i--) {
      if (this.guidelines[i] === guideline) {
        this.guidelines.splice(i, 1);
      }
    }
  }

  setGuidelineX(guideline: Guideline, x: number) {
      guideline.x = x;
      for (let node of this.nodes) {
        if (node.guideline === guideline) {
          node.fx = x;
        }
      }
  }

  snapToGuideline(x: number): Guideline|null {
    let closestDist = Infinity;
    let closestGuideline: Guideline|null = null;

    for (let guideline of this.guidelines) {
      let dist = Math.abs(x - guideline.x);
      if (dist < closestDist) {
        closestDist = dist;
        closestGuideline = guideline;
      }
    }
    
    return closestGuideline;
  }

  getInputPos(outputIdx: number): Vec2 {
    return [this.xScale(-5), this.yScale(outputIdx)];
  }

  getOutputPos(outputIdx: number): Vec2 {
    return [this.xScale(+5), this.yScale(outputIdx)];
  }

  foreachEdgeSubset(doSomething: Function) {
    let binaryCounter = new Array(this.edges.length).fill(false);

    // Foreach subset.
    for (;;) {
      if (doSomething(binaryCounter)) {
        // The operation succeeded, we can stop.
        return true;
      }

      // Try to increment the counter.
      let incSucc = false;
      for (let i = 0; i < binaryCounter.length && !incSucc; i++) {
        if (!binaryCounter[i]) {
          incSucc = true;
        }
        binaryCounter[i] = !binaryCounter[i];
      }
      if (!incSucc) {
        // The counter overflowed, we have seen all subsets.
        return false;
      }
    }
  }

  // If successfull, return the valences, else return null.
  hasNoValence3Nodes(edgeSubset: Array<boolean>) {
    let nodeValences = new Map();

    function bumpValence(node: GraphNode) {
      let current = nodeValences.get(node);
      if (!current) {
        current = 1;
      } else {
        current++;
      }
      nodeValences.set(node, current);

      return current;
    }

    for (let edgeIdx = 0; edgeIdx < edgeSubset.length; edgeIdx++) {
      if (edgeSubset[edgeIdx]) {
        let edge = this.edges[edgeIdx];

        let valenceA = bumpValence(edge.source as GraphNode);
        let valenceB = bumpValence(edge.target as GraphNode);

        if (valenceA > 2 || valenceB > 2) {
          return null;
        }
      }
    }

    return nodeValences;
  }

  routeAllPermutations(): Map<string, GraphNode[][]> {
    // Indexed by stringified permutation luts.
    let routingLut = new Map<string, GraphNode[][]>();
    this.foreachEdgeSubset((edgeSubset: Array<boolean>) => {
      let isVertical = true;
      for (let edgeIdx = 0; edgeIdx < edgeSubset.length; edgeIdx++) {
        
        if (edgeSubset[edgeIdx] !== ((edgeIdx % this.ioHeight) === Math.floor(edgeIdx / this.ioHeight))) {
          isVertical = false;
        }
      }
      if (isVertical) {
        //debugger;
      } else {
        //return false;
      }

      // TODO(optimize): We don't need a full recomputation of the valences here.
      let valences = this.hasNoValence3Nodes(edgeSubset);
      if (!valences) {
        return false;
      }

      // This is a special subgraph, it is a collection of vertex-disjoint paths.

      // Make sure the input and output nodes are terminal and being connected.
      for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
        if (valences.get(this.inputs[inputIdx]) !== 1) {
          return false;
        }
      }

      for (let outputIdx = 0; outputIdx < this.ioHeight; outputIdx++) {
        if (valences.get(this.outputs[outputIdx]) !== 1) {
          return false;
        }
      }

      // Let's simultaneously record the route in a more user-friendly format, and find out
      // if it corresponds to a permutation. (We still have the possibility of input paths not reaching outputs)
      let permutationLut = [];
      let permutationPaths = [];
      for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
        let path: GraphNode[] = [this.inputs[inputIdx]];
        // Each iteration of the loop adds one node to the path.
        for (;;) {
          // Find all edges incident w/ the last node in the path.
          let lastNode = path.at(-1) as GraphNode;
          let penultimateNode = path.at(-2);
          let incidentEdgeIndices = this.incidentEdgeIndices(lastNode);

          let foundNewPathNode = false;
          for (let incidentEdgeIdx of incidentEdgeIndices) {
            // Check if the incident edge is in the subset.
            if (edgeSubset[incidentEdgeIdx]) {
              let edge = this.edges[incidentEdgeIdx];
              let adjNode = this.getOppositeEdgeNode(edge, lastNode);
              // Don't go back.
              if (adjNode !== penultimateNode) {
                path.push(adjNode);
                // There is at most one incident edge in the subset.
                foundNewPathNode = true;
                break;
              }
            }
          }

          if (!foundNewPathNode) {
            // We have retraced the entirety of the path.
            break;
          }
        }

        // Now check if the path terminates at an output node.
        let pathIsSane = false;
        for (let outputIdx = 0; outputIdx < this.ioHeight; outputIdx++) {
          let node = this.outputs[outputIdx];
          let lastNode = path.at(-1) as GraphNode;
          if (lastNode === node) {
            permutationLut.push(outputIdx);
            pathIsSane = true;
            break;
          }
        }

        if (!pathIsSane) {
          // Ditch the entire subset.
          return false;
        }

        permutationPaths.push(path);
      }

      routingLut.set(permutationLut.toString(), permutationPaths);

      // Return false, since we want to route all permutations.
      return false;
    });

    this.routingLut = routingLut;
    return routingLut;
  }

  getOppositeEdgeNode(edge: GraphEdge, node: GraphNode): GraphNode {
    if (edge.source === node) {
      return edge.target as GraphNode;
    } else {
      return edge.source as GraphNode;
    }
  }


  // Old implementation (using a backtracking approach), does not yet seem to work. Abandoned following discussions w/ Prof RC.
  /*
  routePermutation(perm: Permutation) {
    let paths: GraphNode[][] = [];
    let visitedVerts = new Set<GraphNode>();
    let success = this.routePermutation_recurse(perm, 0, paths, visitedVerts);

    return success ? paths : undefined;
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
    */

  // WARNING: Expensive, linear in the # of edges.
  adjacentVerts(node: GraphNode) : GraphNode[] {
    let result: GraphNode[] = [];

    for (let edge of this.edges) {
      if (edge.source === node) {
        result.push(edge.source);
      } else if (edge.target === node) {
        result.push(edge.target);
      }
    }

    return result;
  }

  // WARNING: Expensive, linear in the # of edges.
  incidentEdgeIndices(node: GraphNode) : number[] {
    let result: number[] = [];

    for (let edgeIdx = 0; edgeIdx < this.edges.length; edgeIdx++) {
      let edge = this.edges[edgeIdx];
      if (edge.source === node) {
        result.push(edgeIdx);
      } else if (edge.target === node) {
        result.push(edgeIdx);
      }
    }

    return result;
  }

  getNextId() {
    return this.nextId++;
  }

  deleteNode(node: GraphNode) {
    // Delete edges containing the node.
    // Remove all elements greater than 3, in-place
    for (let i = this.edges.length - 1; i >= 0; i--) {
      if (this.edges[i].target === node || this.edges[i].source === node) {
        this.edges.splice(i, 1);
      }
    }
    
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      if (this.nodes[i] === node) {
        this.nodes.splice(i, 1);
      }
    }
  }

  deleteEdge(edge: GraphEdge) {
    for (let i = this.edges.length - 1; i >= 0; i--) {
      if (this.edges[i] === edge) {
        this.edges.splice(i, 1);
      }
    }
  }

  nextId: number;

  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;

  ioHeight: number;
  inputs: GraphNode[];
  outputs: GraphNode[];
  nodes: GraphNode[];
  edges: GraphEdge[];

  // Vertical lines.
  guidelines: Guideline[];

  routingLut: Map<string, GraphNode[][]>;
}