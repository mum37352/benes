import { ToolSel } from "@/common/Toolbar";
import { ColGraph, GraphNode } from "./Graph";
import { useRef, useState } from "react";
import { useFlushingResizeObserver } from "@/common/resizeObserver";
import { computeGridMargins } from "@/common/Grid";
import { BucketCanvas, computeNodeBucket, drawBuckets, genBucketsJsx, randomPointInBucket, useBucketCanvas } from "./buckets";
import { Graph } from "graphlib";
import { foreachNaryString } from "@/common/mathUtils";
import { drawNode, GraphNodeType } from "@/common/NodeDrawing";
import { midColor } from "@/common/Colors";

function generateCompatGraph(cnv: BucketCanvas) {
  let graph = cnv.graph;
  let result: Graph = new Graph({multigraph: false, directed: false});

  let buckets: GraphNode[][] = Array.from({ length: graph.cliqueSize }, () => []);

  for (let node of graph.nodes) {
    let bucketIdx = computeNodeBucket(graph, node);

    if (bucketIdx < 0) {
      continue;
    }

    buckets[bucketIdx].push(node);
  }

  // Next, iterate over all possible colorings and add nodes.
  for (let bucketIdx = 0; bucketIdx < graph.cliqueSize; bucketIdx++) {
    let bucket = buckets[bucketIdx];

    
    foreachNaryString(bucket.length, 3, (coloring: number[]) => {
      let [x, y] = randomPointInBucket(cnv, bucketIdx);
      result.setNode(bucketIdx.toString() + "-" + coloring.toString(), {x, y});
      return false;
    });
  }

  // Connect up the nodes.
  return result;
}

export default function CompatibilityGraph({
  graph
} : {graph: ColGraph})
{
  let cnv = useBucketCanvas(graph);

  function drawGraph(canvas: React.JSX.Element[], labels: React.JSX.Element[]) {
    let compatGraph = generateCompatGraph(cnv);

    compatGraph.nodes().forEach(nodeId => {
      let node = compatGraph.node(nodeId);

      drawNode(cnv.zoom, cnv.grid, GraphNodeType.Internal, midColor, node.x, node.y, canvas, labels);
    });

    drawBuckets(cnv, canvas, labels);
  }

  let graphCanvas: React.JSX.Element[] = [];
  let labels: React.JSX.Element[] = [];
  drawGraph(graphCanvas, labels);

  return genBucketsJsx(cnv, graphCanvas, labels);
}
