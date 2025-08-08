// TODO: Deduplicate w/ the construction page.
import { bottomColor, midColor, topColor } from "@/common/Colors";
import { computeCanonicalBucketEllipse, computeNodeBucket, ellipticPoissonDiskSet, mapCanonicalEllipseToBucketArea, randomPointInBucket } from "./buckets";
import { foreachNaryString } from "@/common/mathUtils";
import Graph from "graphology";


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

export interface ColGraphNode {
  color: TriadColor,
  x: number,
  y: number
}

export enum EdgeType {
  Equality,
  Disequality
};

export interface ColGraphEdge {
  type: EdgeType
}

export class ColGraph {
  constructor(cliqueSize: number) {
    this.nextId = 0;

    this.graph = new Graph({ type: 'undirected' });

    this.cliqueSize = cliqueSize;
  }

  getNextId() {
    return this.nextId++;
  }


  coreCircleDiam() {
    return Math.max(1, (Math.sqrt(this.cliqueSize*1.6)));
  }

  nextId: number;

  cliqueSize: number;

  graph: Graph<ColGraphNode, ColGraphEdge>;
}

type CompatGraphNode = {
  x: number,
  y: number,
  coloring: number[],
  proper: boolean,
  bucketIdx: number
}

export class CompatGraph {
  mkNodeId(bucketIdx: number, coloring: number[]) {
    return bucketIdx.toString() + "-" + coloring.toString();
  }

  constructor(colGraph: ColGraph) {
    this.colGraph = colGraph;
    let result: Graph<CompatGraphNode> = new Graph({ type: 'undirected' });

    this.buckets = Array.from({ length: colGraph.cliqueSize }, () => []);

    colGraph.graph.forEachNode((nodeId, attributes) => {
      let bucketIdx = computeNodeBucket(colGraph, nodeId);

      if (bucketIdx >= 0) {
        this.buckets[bucketIdx].push(nodeId);
      }
    });

    // Next, iterate over all possible colorings and add nodes.
    let [rx, ry] = computeCanonicalBucketEllipse(colGraph);
    for (let bucketIdx = 0; bucketIdx < colGraph.cliqueSize; bucketIdx++) {
      let bucket = this.buckets[bucketIdx];

      let points = ellipticPoissonDiskSet(3**bucket.length, rx, ry);

      foreachNaryString(bucket.length, 3, (coloring: number[]) => {
        let [x, y] = points.pop()!;
        [x, y] = mapCanonicalEllipseToBucketArea(colGraph, bucketIdx, x, y);

        // Check if these ternary string defines a proper 3-coloring.
        let proper = true;
        for (let i = 0; i < bucket.length && proper; i++) {
          for (let j = i + 1; j < bucket.length && proper; j++) {
            if (coloring[i] === coloring[j] && colGraph.graph.hasEdge(bucket[i], bucket[j])) {
              proper = false;
            }
          }
        }

        result.addNode(this.mkNodeId(bucketIdx, coloring), { x, y, proper, bucketIdx, coloring: [...coloring] });
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

        let dataA = result.getNodeAttributes(nodeA);
        let dataB = result.getNodeAttributes(nodeB);

        if (dataA.bucketIdx === dataB.bucketIdx) {
          compatible = false;
        }

        if (!dataA.proper || !dataB.proper) {
          compatible = false;
        }

        if (compatible) {
          let bucketA = this.buckets[dataA.bucketIdx];
          let bucketB = this.buckets[dataB.bucketIdx];

          for (let i = 0; i < bucketA.length && compatible; i++) {
            for (let j = 0; j < bucketB.length && compatible; j++) {
              if (dataA.coloring[i] === dataB.coloring[j] && colGraph.graph.hasEdge(bucketA[i], bucketB[j])) {
                compatible = false;
              }
            }
          }
        }

        if (compatible) {
          result.addEdge(nodeA, nodeB);
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

  recomputeActiveSubgraph(bucketIdx: number) {
    let bucket = this.buckets[bucketIdx];

    let coloring: number[] = new Array(bucket.length).fill(0);
    for (let i = 0; i < bucket.length; i++) {
      coloring[i] = this.colGraph.graph.getNodeAttributes(bucket[i]).color;
    }
    this.activeSubgraph[bucketIdx] = this.mkNodeId(bucketIdx, coloring);
  }

  colGraph: ColGraph;
  graph: Graph<CompatGraphNode>;
  buckets: string[][];

  // For each bucket, store a selected compatibility node.
  // Contains the node IDs.
  activeSubgraph: string[];
}
