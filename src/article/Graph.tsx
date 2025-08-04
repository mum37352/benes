// TODO: Deduplicate w/ the construction page.
import { bottomColor, midColor, topColor } from "@/common/Colors";
import { GraphNodeType } from "@/common/NodeDrawing";
import * as d3 from "d3";
import { Graph } from "graphlib";
import { BucketCanvas, computeNodeBucket, randomPointInBucket } from "./buckets";
import { foreachNaryString } from "@/common/mathUtils";
import { createContext } from "react";


export enum TriadColor {
  Col1, Col2, Col3
}

export let triadColorLut = [TriadColor.Col1, TriadColor.Col2, TriadColor.Col3];

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


  // Warning: expensive! Linear in the number of edges.
  hasEdge(a: GraphNode, b: GraphNode) {
    for (let edge of this.edges) {
      if (edge.source === a && edge.target === b) {
        return true;
      }
      if (edge.target === a && edge.source == b) {
        return true;
      }
    }

    return false;
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

export class CompatGraph {
  mkNodeId(bucketIdx: number, coloring: number[]) {
    return bucketIdx.toString() + "-" + coloring.toString();
  }

  constructor(cnv: BucketCanvas) {
    let graph = cnv.graph;
    let result: Graph = new Graph({ multigraph: false, directed: false });

    this.buckets = Array.from({ length: graph.cliqueSize }, () => []);

    for (let node of graph.nodes) {
      let bucketIdx = computeNodeBucket(graph, node);

      if (bucketIdx < 0) {
        continue;
      }

      this.buckets[bucketIdx].push(node);
    }

    // Next, iterate over all possible colorings and add nodes.
    for (let bucketIdx = 0; bucketIdx < graph.cliqueSize; bucketIdx++) {
      let bucket = this.buckets[bucketIdx];

      foreachNaryString(bucket.length, 3, (coloring: number[]) => {
        let [x, y] = randomPointInBucket(cnv, bucketIdx);

        // Check if these ternary string defines a proper 3-coloring.
        let proper = true;
        for (let i = 0; i < bucket.length && proper; i++) {
          for (let j = i + 1; j < bucket.length && proper; j++) {
            if (coloring[i] != coloring[j] && graph.hasEdge(bucket[i], bucket[j])) {
              proper = false;
            }
          }
        }

        result.setNode(this.mkNodeId(bucketIdx, coloring), { x, y, proper, bucketIdx, coloring: [...coloring] });
        return false;
      });
    }

    // Connect up the nodes.
    let nodes = result.nodes();
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let nodeA = nodes[i];
        let nodeB = nodes[j];

        let compatible = true;

        let dataA = result.node(nodeA);
        let dataB = result.node(nodeB);

        if (dataA.bucketIdx === dataB.bucketIdx) {
          compatible = false;
        }

        if (dataA.proper && dataB.proper && compatible) {
          let bucketA = this.buckets[dataA.bucketIdx];
          let bucketB = this.buckets[dataB.bucketIdx];

          for (let i = 0; i < bucketA.length && compatible; i++) {
            for (let j = 0; j < bucketB.length && compatible; j++) {
              if (dataA.coloring[i] != dataB.coloring[j] && graph.hasEdge(bucketA[i], bucketB[j])) {
                compatible = false;
              }
            }
          }
        }

        if (compatible) {
          result.setEdge(nodeA, nodeB);
        }
      }
    }

    this.activeSubgraph = new Array(this.buckets.length).fill(null);
    for (let bucketIdx = 0; bucketIdx < this.buckets.length; bucketIdx++) {
      let coloring = new Array(this.buckets[bucketIdx].length).fill(0);
      this.activeSubgraph[bucketIdx] = this.mkNodeId(bucketIdx, coloring);
    }

    this.graph = result;
  }

  graph: Graph;
  buckets: GraphNode[][];

  // For each bucket, store a selected compatibility node.
  // Contains the node IDs.
  activeSubgraph: string[];
}
