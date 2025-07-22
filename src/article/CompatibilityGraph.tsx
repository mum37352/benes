import { ToolSel } from "@/common/Toolbar";
import { Graph, GraphNode } from "./Graph";
import { useRef, useState } from "react";
import { useFlushingResizeObserver } from "@/common/resizeObserver";
import { computeGridMargins } from "@/common/Grid";
import { drawBuckets, genBucketsJsx, useBucketCanvas } from "./buckets";

export default function CompatibilityGraph({
  graph
} : {graph: Graph})
{
  let cnv = useBucketCanvas(graph);

  function drawGraph(canvas: React.JSX.Element[], labels: React.JSX.Element[]) {
    drawBuckets(cnv, canvas, labels);

    
  }

  let graphCanvas: React.JSX.Element[] = [];
  let labels: React.JSX.Element[] = [];
  drawGraph(graphCanvas, labels);

  return genBucketsJsx(cnv, graphCanvas, labels);
}
