// TODO: Deduplicate w/ the construction page.
import { bottomColor, midColor, topColor } from "@/common/Colors";
import { Vec2 } from "@/common/Grid";
import { GraphNodeType } from "@/common/NodeDrawing";
import * as d3 from "d3";

export enum TriadColor {
  Col1, Col2, Col3
}

export function triadColorToColor(col: TriadColor) {
  let color = "";

  // TODO: Cannibalizes the existing vars, not very clean.
  if (col === TriadColor.Col1) {
    color = topColor;
  } else if (col === TriadColor.Col2) {
    color = midColor;
  } else if (col === TriadColor.Col3) {
    color = bottomColor;
  }
  
  return color;
}

export interface GraphNode extends d3.SimulationNodeDatum {
  color: TriadColor,
  key: string
}

export enum EdgeType {
  Equality,
  Disequality
};

export interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  type: EdgeType
}

export class Graph {
  constructor(cliqueSize: number) {
    this.nextId = 0;

    this.nodes = [];
    this.edges = [];

    this.cliqueSize = cliqueSize;
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

  getOppositeEdgeNode(edge: GraphEdge, node: GraphNode): GraphNode {
    if (edge.source === node) {
      return edge.target as GraphNode;
    } else {
      return edge.source as GraphNode;
    }
  }

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

  cliqueSize: number;

  nodes: GraphNode[];
  edges: GraphEdge[];
}
