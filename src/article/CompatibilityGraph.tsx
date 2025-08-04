import { ToolSel } from "@/common/Toolbar";
import { ColGraph, GraphNode } from "./Graph";
import { useEffect, useReducer, useRef, useState } from "react";
import { useFlushingResizeObserver } from "@/common/resizeObserver";
import { computeGridMargins } from "@/common/Grid";
import { BucketCanvas, computeNodeBucket, drawBuckets, genBucketsJsx, randomPointInBucket, useBucketCanvas } from "./buckets";
import { Graph } from "graphlib";
import { foreachNaryString } from "@/common/mathUtils";
import { drawNode, GraphNodeType } from "@/common/NodeDrawing";
import { bottomColor, midColor, topColor } from "@/common/Colors";


class CompatGraph {
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

        result.setNode(this.mkNodeId(bucketIdx, coloring), { x, y, proper, bucketIdx, coloring });
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

export default function CompatibilityGraph({
  graph, graphVersion
} : {graph: ColGraph, graphVersion: number})
{
  let cnv = useBucketCanvas(graph);

  let [compatGraph, setCompatGraph] = useState<CompatGraph>();
  let [compatGraphVersion, bumpCompatGraphVersion] = useReducer(x => x + 1, 0);

  useEffect(() => {
    setCompatGraph(new CompatGraph(cnv));
  }, [graphVersion]);

  function handleMouseDown(e: React.MouseEvent, nodeId: string) {
    let node = compatGraph?.graph.node(nodeId);
    if (node && compatGraph) {
      compatGraph.activeSubgraph[node.bucketIdx] = nodeId;
      bumpCompatGraphVersion();
    }
  }

  function drawGraph(canvas: React.JSX.Element[], labels: React.JSX.Element[]) {
    drawBuckets(cnv, canvas, labels);

    compatGraph?.graph.edges().forEach(edge => {
      let src = compatGraph.graph.node(edge.v);
      let tgt = compatGraph.graph.node(edge.w);


      let [fromX, fromY] = cnv.grid.toScreen(src.x || 0, src.y || 0);
      let [toX, toY] = cnv.grid.toScreen(tgt.x || 0, tgt.y || 0);

      let color = topColor;

      let line = <line key={'edge_' + edge.v + "-" + edge.w} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke={"gray"} strokeOpacity={0.3} strokeWidth={cnv.zoom * 2} />;
      canvas.push(line)
    })

    compatGraph?.graph.nodes().forEach(nodeId => {
      let node = compatGraph.graph.node(nodeId);
      let color = midColor;

      if (compatGraph.activeSubgraph[node.bucketIdx] === nodeId) {
        color = bottomColor;
      }

      drawNode(cnv.zoom, cnv.grid, GraphNodeType.Internal, color, node.x, node.y, canvas, labels, {onMouseDown: e => handleMouseDown(e, nodeId)});
    });

  }

  let graphCanvas: React.JSX.Element[] = [];
  let labels: React.JSX.Element[] = [];
  drawGraph(graphCanvas, labels);

  return genBucketsJsx(cnv, graphCanvas, labels);
}
