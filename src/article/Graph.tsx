// TODO: Deduplicate w/ the construction page.
import { bottomColor, midColor, topColor } from "@/common/Colors";
import { GraphNodeType } from "@/common/NodeDrawing";
import * as d3 from "d3";
import { Graph } from "graphlib";


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

export class ColGraph {
  constructor(cliqueSize: number) {
    this.nextId = 0;

    this.nodes = [];
    this.edges = [];

    this.cliqueSize = cliqueSize;
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
