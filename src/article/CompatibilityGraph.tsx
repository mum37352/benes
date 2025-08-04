import { ToolSel } from "@/common/Toolbar";
import { ColGraph, CompatGraph, GraphNode, triadColorLut } from "./Graph";
import { useEffect, useReducer, useRef, useState } from "react";
import { useFlushingResizeObserver } from "@/common/resizeObserver";
import { computeGridMargins } from "@/common/Grid";
import { BucketCanvas, computeNodeBucket, drawBuckets, genBucketsJsx, randomPointInBucket, useBucketCanvas } from "./buckets";
import { Graph } from "graphlib";
import { foreachNaryString } from "@/common/mathUtils";
import { drawNode, GraphNodeType } from "@/common/NodeDrawing";
import { bottomColor, midColor, topColor } from "@/common/Colors";

export default function CompatibilityGraph({
  graph, graphVersion, onColoringChanged
} : {graph: ColGraph, graphVersion: number, onColoringChanged: () => void})
{
  let cnv = useBucketCanvas(graph);

  let [compatGraph, setCompatGraph] = useState<CompatGraph>();
  let [, bumpCompatGraphVersion] = useReducer(x => x + 1, 0);

  useEffect(() => {
    setCompatGraph(new CompatGraph(cnv));
  }, [graphVersion]);

  function handleMouseDown(e: React.MouseEvent, nodeId: string) {
    let node = compatGraph?.graph.node(nodeId);
    if (node && compatGraph) {
      compatGraph.activeSubgraph[node.bucketIdx] = nodeId;
      let bucket = compatGraph.buckets[node.bucketIdx];

      for (let nodeIdx = 0; nodeIdx < bucket.length; nodeIdx++) {
        bucket[nodeIdx].color = triadColorLut[node.coloring[nodeIdx]];
      }
      onColoringChanged();

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

      let isActive = (compatGraph.activeSubgraph[src.bucketIdx] === edge.v) && (compatGraph.activeSubgraph[tgt.bucketIdx] === edge.w);

      let color = "gray";
      let opacity = 0.3;

      if (isActive) {
        color = bottomColor;
        opacity = 1.0;
      }

      let line = <line key={'edge_' + edge.v + "-" + edge.w} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke={color} strokeOpacity={opacity} strokeWidth={cnv.zoom * 2} />;
      canvas.push(line)
    })

    compatGraph?.graph.nodes().forEach(nodeId => {
      let node = compatGraph.graph.node(nodeId);
      let color = midColor;

      if (compatGraph.activeSubgraph[node.bucketIdx] === nodeId) {
        color = bottomColor;
      }

      drawNode(cnv.zoom, cnv.grid, GraphNodeType.Internal, color, node.x, node.y, canvas, labels, {
        onMouseDown: (e: React.MouseEvent) => handleMouseDown(e, nodeId),
        className: "cursor-pointer"
      });
    });

  }

  let graphCanvas: React.JSX.Element[] = [];
  let labels: React.JSX.Element[] = [];
  drawGraph(graphCanvas, labels);

  return genBucketsJsx(cnv, graphCanvas, labels);
}
