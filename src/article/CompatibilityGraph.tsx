import { ToolSel } from "@/common/Toolbar";
import { ColGraph, GraphNode } from "./Graph";
import { useEffect, useRef, useState } from "react";
import { useFlushingResizeObserver } from "@/common/resizeObserver";
import { computeGridMargins } from "@/common/Grid";
import { BucketCanvas, computeNodeBucket, drawBuckets, genBucketsJsx, randomPointInBucket, useBucketCanvas } from "./buckets";
import { Graph } from "graphlib";
import { foreachNaryString } from "@/common/mathUtils";
import { drawNode, GraphNodeType } from "@/common/NodeDrawing";
import { midColor, topColor } from "@/common/Colors";

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

      // Check if these ternary string defines a proper 3-coloring.
      let proper = true;
      for (let i = 0; i < bucket.length && proper; i++) {
        for (let j = i + 1; j < bucket.length && proper; j++) {
          if (coloring[i] != coloring[j] && graph.hasEdge(bucket[i], bucket[j])) {
            proper = false;
          }
        }
      }

      result.setNode(bucketIdx.toString() + "-" + coloring.toString(), {x, y, proper, bucketIdx, coloring});
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

      if (dataA.proper && dataB.proper) {
        let bucketA = buckets[dataA.bucketIdx];
        let bucketB = buckets[dataB.bucketIdx];

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

  return result;
}

export default function CompatibilityGraph({
  graph, graphVersion
} : {graph: ColGraph, graphVersion: number})
{
  let cnv = useBucketCanvas(graph);

  let [compatGraph, setCompatGraph] = useState<Graph>();

  useEffect(() => {
    setCompatGraph(generateCompatGraph(cnv));
  }, [graphVersion]);

  function drawGraph(canvas: React.JSX.Element[], labels: React.JSX.Element[]) {
    drawBuckets(cnv, canvas, labels);

    compatGraph?.edges().forEach(edge => {
      let src = compatGraph.node(edge.v);
      let tgt = compatGraph.node(edge.w);


      let [fromX, fromY] = cnv.grid.toScreen(src.x || 0, src.y || 0);
      let [toX, toY] = cnv.grid.toScreen(tgt.x || 0, tgt.y || 0);

      let color = topColor;

      let line = <line key={'edge_' + edge.v + "-" + edge.w} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke={color} strokeWidth={cnv.zoom * 2} />;
      canvas.push(line);
    })

    compatGraph?.nodes().forEach(nodeId => {
      let node = compatGraph.node(nodeId);

      drawNode(cnv.zoom, cnv.grid, GraphNodeType.Internal, midColor, node.x, node.y, canvas, labels);
    });

  }

  let graphCanvas: React.JSX.Element[] = [];
  let labels: React.JSX.Element[] = [];
  drawGraph(graphCanvas, labels);

  return genBucketsJsx(cnv, graphCanvas, labels);
}
