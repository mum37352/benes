// Imagine a vertical ice cone at the origin (more precisely, a V shape in 2D)
// Given the left edge of the cone as a unit vector (Y up), find
// the radius of a ball around (0, 1) that is inscribed precisely by the cone.

import { computeGridLayout, computeGridMargins, Grid } from "@/common/Grid";
import { useFlushingResizeObserver } from "@/common/resizeObserver";
import { MouseEventHandler, RefObject, useRef } from "react";
import { ColGraph, GraphNode } from "./Graph";
import { backgroundColor, getColorScale, MainGradient } from "@/common/Colors";
import { CenteredKI } from "@/common/NodeDrawing";
import { Box, mod, normalize2d, rotatePoint, sampleUniformUnitDisk, Vec2 } from "@/common/mathUtils";

// I think we had to do this using rulers and compasses in Gymnasium.
function fitCircleIntoIceCone(coneX: number, coneY: number) {
  // Compute cosine using the dot product.
  let cosine = coneY;

  return Math.sqrt(1 - cosine*cosine);
}

// Just like the circle fitting, except our ellipse now has an aspect ratio.
// Returns rx and ry of the ellipse. 
export function fitEllipseIntoIceCone(asp: number, angle: number): Vec2 {
  // First, compute the unit normal vector representation for the
  // left side of the V shape.
  let coneX = -Math.sin(angle);
  let coneY = Math.cos(angle);

  // Stretch the problem vertically so it reduces to the familiar circle problem.
  coneY *= asp;

  let rx = fitCircleIntoIceCone(...normalize2d(coneX, coneY));

  return [rx, rx/asp];
}

export type BucketCanvas = {
  clientToSvg: (x: number, y: number) => Vec2,
  getEventPoint: (e: React.MouseEvent) => Vec2,
  grid: Grid,
  coreCircleDiam: number,
  zoom: number,
  screenWidth: number,
  screenHeight: number,
  ref: RefObject<HTMLDivElement|null>,
  dummyRectRef: RefObject<SVGRectElement|null>,
  vertical: boolean,
  graph: ColGraph
}

export function useBucketCanvas(graph: ColGraph) {

  let ref = useRef<HTMLDivElement>(null);
  let dummyRectRef = useRef<SVGRectElement>(null);
  
  let {size, enableTransition} = useFlushingResizeObserver(ref);

  let screenWidth = size?.width || 0;
  let screenHeight = size?.height || 0;

  let coreCircleDiam = graph.coreCircleDiam();

  let margin = computeGridMargins(false, false);

  // For fence post reasons, we add 1 to the numGuidelines instead of adding 2. Same for inputs
  let gridWidths = computeGridLayout(screenWidth, [margin.left, 2*coreCircleDiam, margin.right]);
  let gridHeights = computeGridLayout(screenHeight, [margin.top, 2*coreCircleDiam, margin.bottom]);

  let graphBox = new Box(gridWidths[0], gridHeights[0], gridWidths[0] + gridWidths[1], gridHeights[0] + gridHeights[1]);

  let grid = new Grid(new Box(-1.5*coreCircleDiam, -1.5*coreCircleDiam, 1.5*coreCircleDiam, 1.5*coreCircleDiam), false, graphBox);

  let zoom = Math.min(gridWidths[1]/(2*coreCircleDiam), gridHeights[1]/(2*coreCircleDiam)) / 100;

  let vertical = false;

  function clientToSvg(x: number, y: number): Vec2 {
    let svgPoint = new DOMPoint(x, y);
    svgPoint = svgPoint.matrixTransform(dummyRectRef.current?.getScreenCTM()?.inverse());
    return [svgPoint.x, svgPoint.y];
  }

  function getEventPoint(e: React.MouseEvent) {
    return clientToSvg(e.clientX, e.clientY);
  }

  let cnv: BucketCanvas = {
    clientToSvg,
    getEventPoint,
    grid,
    coreCircleDiam,
    zoom,
    screenWidth,
    screenHeight,
    ref,
    dummyRectRef,
    vertical,
    graph
  };

  return cnv;
}

export function genBucketsJsx(cnv: BucketCanvas, graphCanvas: React.ReactElement<SVGElement>[], labels: React.ReactElement[],
  onMouseDown?: MouseEventHandler<HTMLDivElement>, onMouseUp?: MouseEventHandler<HTMLDivElement>, onMouseMove?: MouseEventHandler<HTMLDivElement>
) {
  let svg = <svg className="absolute" width={cnv.screenWidth} height={cnv.screenHeight} >
    <rect ref={cnv.dummyRectRef} opacity={0} x="0" y="0" width="0" height="0" stroke="none" fill="none" />
    {graphCanvas}
  </svg>;
  
  return <div className="flex items-stretch w-full h-full p-1" style={{ flexDirection: cnv.vertical ? "column" : "row"}}>
    <div className="flex grow items-stretch p-1" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <div ref={cnv.ref} className="relative flex grow p-0 m-0 overflow-hidden" >
        {svg}
        {labels}
      </div>
    </div>
  </div>;
}

function bucketAngle(graph: ColGraph) {
  return 2 * Math.PI / graph.cliqueSize;
}

export function computeCanonicalBucketEllipse(graph: ColGraph): Vec2 {
  let mainAngle = bucketAngle(graph);
  let ellipseAsp = 2.0;
  let coneAngle = Math.min(mainAngle * 0.8, 0.3 * Math.PI);
  let [rx, ry] = fitEllipseIntoIceCone(ellipseAsp, coneAngle);
  let coreCircleDiam = graph.coreCircleDiam();
  rx *= coreCircleDiam;
  ry *= coreCircleDiam;

  return [rx, ry]
}

export function bucketScale(graph: ColGraph) {
  let colorScale = getColorScale(graph.cliqueSize);
  return colorScale;
}

export function drawBuckets(cnv: BucketCanvas, canvas: React.ReactElement<SVGElement>[], labels: React.ReactElement[]) {
  let colorScale = bucketScale(cnv.graph);
  function gradientId(cliqueIdx: number) {
    return "grad_" + cliqueIdx;
  }

  let [rx, ry] = computeCanonicalBucketEllipse(cnv.graph)
  let sectorAngle = bucketAngle(cnv.graph);

  for (let i = 0; i < cnv.graph.cliqueSize; i++) {
    let centerAngle = i * sectorAngle;

    canvas.push(<MainGradient id={gradientId(i)} color={colorScale(i)} />);

    let rotString = `rotate(${(centerAngle * 180) / Math.PI})`;
    let [x, y] = cnv.grid.toScreen(cnv.coreCircleDiam * Math.sin(centerAngle), -cnv.coreCircleDiam * Math.cos(centerAngle));

    canvas.push(<ellipse cx={0} cy={-cnv.coreCircleDiam} rx={rx} ry={ry} fill={`url('#${gradientId(i)}')`} transform={`${cnv.grid.toScreenCss()} ${rotString}`} />);
    labels.push(<CenteredKI key={"bucketlab_" + i} zoom={cnv.zoom} color={backgroundColor} x={x} y={y}>{`V_{${i + 1}}`}</CenteredKI>)
  }
}

export function computeNodeBucket(graph: ColGraph, node: GraphNode) {
  let x: number = node.x!;
  let y: number = node.y!;

  let angle = Math.atan2(-y, x);

  let sectorAngle = bucketAngle(graph);

  let firstBoundary = Math.PI/2 + sectorAngle/2;

  let sectorIdx = mod(Math.floor(-(angle - firstBoundary)/sectorAngle), graph.cliqueSize);

  return sectorIdx;
}

export function randomPointInBucket(graph: ColGraph, bucketIdx: number) {
  let [rx, ry] = computeCanonicalBucketEllipse(graph);

  let [r, theta] = sampleUniformUnitDisk();
  let x = rx*r*Math.cos(theta);
  let y = -ry*r*Math.sin(theta);

  y -= graph.coreCircleDiam();

  let sectorAngle = bucketAngle(graph);
  return rotatePoint(x, y, -bucketIdx*sectorAngle);
}
