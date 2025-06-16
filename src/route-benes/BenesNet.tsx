import { useEffect, useLayoutEffect,useRef, useState } from "react";

import useResizeObserver from "@react-hook/resize-observer";
import * as d3 from "d3";

import { backgroundColor, bottomColor, getColorScale, inputColor, midColor, outputColor, topColor } from "../common/Colors";
import { KI } from "../common/katex";
import Permutation, { correctIdx } from "../common/Permutation";
import { useFlushingResizeObserver } from "@/common/resizeObserver";
import { BenesGrid, Box, computeGridLayout, Subnet } from "@/common/Grid";
import PermWidget, { refFontSize } from "@/common/PermWidget";


function benesTwin(k: number, idx: number) {
  let modulus = 2 ** (k-1);
  let result = idx;
  if (idx >= modulus) {
    result -= modulus;
  } else {
    result += modulus;
  }
  return result;
}

enum EdgeColor {
  Top = 0,
  Bottom = 1,
  None = 2
}

type BenesPath = {
  edgeColors: EdgeColor[],
  // Vertex indices (not coords!) as indexed from the whole net.
  verts: number[]
}

function routePermutation(k: number, perm: Permutation): BenesPath[] {
  // Bottom case.
  if (k === 1) {
    if (perm.lut[0] === 0) {
      // Identity permutation.
      return [{edgeColors: [EdgeColor.None], verts: [0, 0]}, {edgeColors: [EdgeColor.None], verts: [1, 1]}];
    } else {
      // (1 2)
      return [{edgeColors: [EdgeColor.None], verts: [0, 1]}, {edgeColors: [EdgeColor.None], verts: [1, 0]}];
    }
  }

  // Generic case.

  let netHeight = 2 ** k;

  let paths: BenesPath[] = Array(netHeight);

  let unexplored = new Set(Array(netHeight).keys());

  // Color in the vertices. Each loop iteration corresponds to a component
  // of the routing graph.
  while (unexplored.size > 0) {
    // Pop any element from the set. Apparently the APIs don't allow 
    // for this without a for loop.
    let root: number = -1;
    for (let el of unexplored) {
      root = el;
      break;
    }
    if (root < 0) {
      // Done.
      break;
    }

    // Do a BFS starting from the root.
    let queue: number[] = [];
    unexplored.delete(root);
    queue.push(root);
    paths[root] = {
      edgeColors: [EdgeColor.Top],
      verts: [root]
    };
    for (;;) {
      let atVert = queue.shift();
      if (atVert === undefined) {
        break;
      }

      let atColor = paths[atVert].edgeColors[0];
      let neighborColor = 1-atColor;

      let inputNeighbor = benesTwin(k, atVert);
      let outputNeighbor = perm.invLut[benesTwin(k, perm.lut[atVert])];

      for (let neighbor of [inputNeighbor, outputNeighbor]) {
        if (unexplored.has(neighbor)) {
          unexplored.delete(neighbor);
          paths[neighbor] = {
            edgeColors: [neighborColor],
            verts: [neighbor]
          };
          queue.push(neighbor);
        }
      }
    }
  }

  let luts = [Array(netHeight/2), Array(netHeight/2)];
  for (let inputIdx = 0; inputIdx < netHeight; inputIdx++) {
    let subInputIdx = inputIdx % (netHeight/2);
    luts[paths[inputIdx].edgeColors[0]][subInputIdx] = perm.lut[inputIdx] % (netHeight/2);
  }

  let subRoutings = luts.map(lut => routePermutation(k-1, new Permutation(lut)));

  for (let globalIdx = 0; globalIdx < netHeight; globalIdx++) {
    let subInputIdx = globalIdx % (netHeight/2);
    let globalPath = paths[globalIdx];
    let edgeColor = globalPath.edgeColors[0];
    let idxShift = edgeColor*netHeight/2;

    globalPath.edgeColors.push(...subRoutings[edgeColor][subInputIdx].edgeColors);
    globalPath.verts.push(...subRoutings[edgeColor][subInputIdx].verts.map(v => v + idxShift));
  }

  // Add the final edges.
  for (let inputIdx = 0; inputIdx < netHeight; inputIdx++) {
    let path = paths[inputIdx];
    path.edgeColors.push(path.edgeColors[0]);
    path.verts.push(perm.lut[inputIdx]);
  }

  return paths;
}

export default function BenesNet({
  order,
  vertical = true,
  doRouting = true,
  bipartiteColors = false,
  drawBoxes = true,
  dottedLines = false
} : {order: number, vertical?: boolean, doRouting?: boolean, drawBoxes?: boolean, bipartiteColors?: boolean, dottedLines?: boolean})
{
  let numInputs = 2**order;
  let ref = useRef<HTMLDivElement>(null);
  let [perm, setPerm] = useState(new Permutation([...Array(numInputs).keys()]));

  let {size, enableTransition} = useFlushingResizeObserver(ref);

  let width = size?.width || 0;
  let height = size?.height || 0;

  // The size of the margin relative to the cell size.
  let marginWidth = 0.5;
  let marginHeight = 1.0;

  let subnet = new Subnet(order, 0, 0, "dummy");
  let gridWidths = computeGridLayout(width, [marginWidth, subnet.width, marginWidth + (doRouting&&!vertical ? 0.5 : 0)]);
  let gridHeights = computeGridLayout(height, [marginHeight, subnet.height, marginHeight + (doRouting&&vertical ? 0.5 : 0)]);

  let gridBox = new Box(gridWidths[0], gridHeights[0], gridWidths[0] + gridWidths[1], gridHeights[0] + gridHeights[1]);


  //let screenBox = new Box(marginLeft, marginTop, width - marginRight, height - marginBottom);
  let grid = new BenesGrid(order, vertical, gridBox);

  let zoom = Math.min(grid.cellWidth(), grid.cellHeight()) / 100;

  let [prevK, setPrevK] = useState(order);
  if (prevK != order) {
    setPrevK(order);
    setPerm(new Permutation([...Array(numInputs).keys()]));
    return <></>;
  }

  let circles: any[] = [];

  // Connecting the lines to the center of the circle makes them hard to follow,
  // so we offset the input and output circles by a small terminal bias.
  function applyTerminalBias(screenX: number, screenY: number, isInput: boolean) {
    let [x, y] = grid.verticalitySwap(screenX, screenY);
    x += (isInput ? -13 : 13)*zoom;
    return grid.verticalitySwap(x, y);
  }


  // Draw grid circles.
  for (let gridX = 0; gridX < grid.rootSubnet.width; gridX++) {
    let isInput = grid.rootSubnet.isInput(gridX);
    let isTerminal = grid.rootSubnet.isTerminal(gridX);

    let color = grid.rootSubnet.isSubOutput(gridX) ? outputColor : inputColor;
    for (let gridY = 0; gridY < grid.rootSubnet.height; gridY++) {
      let [screenX, screenY] = grid.toScreen(gridX, gridY);

      if (isTerminal) {
        [screenX, screenY] = applyTerminalBias(screenX, screenY, isInput);
      }

      circles.push(<circle
        key={gridX + ',' + gridY}
        cx={screenX} cy={screenY}
        stroke="none"
        r={(isTerminal ? 15 : 8)*zoom} fill={color}  />)
    }
  }

  function connectButterfly(lines: any[], prefix: string, extent: Box, topColor: string, bottomColor: string, isRight: boolean) {
    let colTop, colBot, colFall, colRise = "";
    if (isRight) {
      colTop = colFall = topColor;
      colBot = colRise = bottomColor;
    } else {
      colTop = colRise = topColor;
      colBot = colFall = bottomColor;
    }

    function putLine(postfix: string, fromX: number, fromY: number, toX: number, toY: number, stroke: string) {
      let [x1, y1] = grid.toScreen(fromX, fromY), [x2, y2] = grid.toScreen(toX, toY);
      lines.push(<line key={prefix+postfix} {...{ x1, y1, x2, y2 }} strokeOpacity={0.5} stroke={stroke} strokeWidth={zoom*2} />);
    }

    // Top line.
    putLine("t", extent.left, extent.top, extent.right, extent.top, colTop);
    // Bottom line.
    putLine("b", extent.left, extent.bottom, extent.right, extent.bottom, colBot);
    // Falling line.
    putLine("f", extent.left, extent.top, extent.right, extent.bottom, colFall);
    // Rising line.
    putLine("r", extent.left, extent.bottom, extent.right, extent.top, colRise);
  }

  function connectBenes(benesLines: any[], benesRects: any[], subnet: Subnet) {
    if (subnet.order === 1) {
      connectButterfly(benesLines, subnet.id+"but", subnet.extent(), midColor, midColor, false);
    } else {
      let topSubnet = subnet.topSubnet();
      let bottomSubnet = subnet.bottomSubnet();

      // TODO: Scale this adaptively.
      let padAmount = zoom*20;

      let topBox = grid.toScreenBox(topSubnet.extent());
      let bottomBox = grid.toScreenBox(bottomSubnet.extent());

      topBox.pad(padAmount);
      bottomBox.pad(padAmount);

      //benesRects.push(<rect key={"ar"+topSubnet.id} rx={10} ry={10} x={topBox.left} y={topBox.top} width={topBox.right - topBox.left} height={topBox.bottom - topBox.top} stroke={"none"} fill={backgroundColor} fillOpacity={0.8} />)
      //benesRects.push(<rect key={"ar"+bottomSubnet.id} rx={10} ry={10} x={bottomBox.left} y={bottomBox.top} width={bottomBox.right - bottomBox.left} height={bottomBox.bottom - bottomBox.top} stroke={"none"} fill={backgroundColor} fillOpacity={0.8} />)

      benesRects.push(<rect key={"br"+topSubnet.id} rx={zoom*10} ry={zoom*10} x={topBox.left} y={topBox.top} width={topBox.right - topBox.left} height={topBox.bottom - topBox.top} stroke={"none"} fill={"url('#topGrad')"} fillOpacity={0.2} />)
      benesRects.push(<rect key={"br"+bottomSubnet.id} rx={zoom*10} ry={zoom*10} x={bottomBox.left} y={bottomBox.top} width={bottomBox.right - bottomBox.left} height={bottomBox.bottom - bottomBox.top} stroke={"none"} fill={"url('#botGrad')"} fillOpacity={0.2} />)

      // Top subnet.
      connectBenes(benesLines, benesRects, topSubnet);
      // Bottom subnet.
      connectBenes(benesLines, benesRects, bottomSubnet);

      // Draw the butterflies.

      for (let subLocalY = 0; subLocalY < topSubnet.height; subLocalY++) {
        // Both butterflies have the same vertical extents.
        let butterfly = new Box(0, 0, 0, 0);
        butterfly.top = topSubnet.globalY(subLocalY);
        butterfly.bottom = bottomSubnet.globalY(subLocalY);

        // Left butterfly
        butterfly.left = subnet.extent().left;
        butterfly.right = topSubnet.extent().left;
        connectButterfly(benesLines, subnet.id+"_butt_"+subLocalY+"_", butterfly, topColor, bottomColor, false);

        // Right butterfly
        butterfly.right = subnet.extent().right;
        butterfly.left = topSubnet.extent().right;
        connectButterfly(benesLines, subnet.id+"_butb_"+subLocalY+"_", butterfly, topColor, bottomColor, true);
      }
    }
  }


  let benesLines: any[] = [];
  let benesRects: any[] = [];
  connectBenes(benesLines, benesRects, grid.rootSubnet);
  
  function drawRouting(routingLines: any[], routing: BenesPath[], k: number) {
    let netHeight = 2 ** k;
    var colorScale = getColorScale(netHeight);
  
    for (let inputIdx = 0; inputIdx < netHeight; inputIdx++) {
      let pathColor = colorScale(inputIdx);

      let path = routing[inputIdx];

      for (let edgeIdx = 0; edgeIdx < path.edgeColors.length; edgeIdx++) {
        let [x1, y1] = grid.toScreen(edgeIdx, path.verts[edgeIdx]);
        let [x2, y2] = grid.toScreen(edgeIdx+1, path.verts[edgeIdx+1]);

        let edgeColor = path.edgeColors[edgeIdx];
        let lineColor = midColor;
        if (!bipartiteColors) {
          lineColor = pathColor.toString();
        } else if (edgeColor === EdgeColor.Top) {
          lineColor = topColor;
        } else if (edgeColor === EdgeColor.Bottom) {
          lineColor = bottomColor;
        }

        routingLines.push(<line
          stroke-linecap="round"
          key={`rt_${inputIdx}_${edgeIdx}`}
          x1={x1} y1={y1} x2={x2} y2={y2}
          fill="none"
          strokeWidth={6*zoom}
          strokeDasharray={dottedLines ? "10,30" : ""}
          stroke={lineColor}
        >
          {dottedLines &&
            <animate
              attributeName="stroke-dashoffset"
              values="40;0"
              dur="3s"
              calcMode="linear"
              repeatCount="indefinite" />
          }
        </line>);
      }
    }
  }


  let routing = routePermutation(order, perm);

  let routingLines: any[] = [];
  drawRouting(routingLines, routing, order);

  function drawInputLabels(inputLabels: any[]) {
    for (let inputIdx = 0; inputIdx < grid.rootSubnet.height; inputIdx++) {
      let [x, y] = applyTerminalBias(...grid.toScreen(0, inputIdx), true);

      inputLabels.push(
        <div 
        className="absolute pointer-events-none bold"
        key={"il_" + inputIdx}
        style={{
          fontSize: refFontSize*zoom,
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
          color: backgroundColor
        }}>
          <KI>{`${inputIdx+1}`}</KI>
        </div>);
    }
  }

  function drawOutputLabels(outputLabels: any[]) {
    for (let preimage = 0; preimage < grid.rootSubnet.height; preimage++) {
      let outputIdx = perm.lut[preimage];
      let [x, y] = applyTerminalBias(...grid.toScreen(grid.rootSubnet.extent().right, outputIdx), false);


      outputLabels.push(
        <div 
        key={"ol_" + preimage.toString()}
        className="absolute pointer-events-none" 
        style={{
          fontSize: 15*zoom,
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
          color: backgroundColor
        }}>
          <KI>{`${outputIdx+1}`}</KI>
        </div>);
    }
  }

  let labels: any[] = [];
  let prescriptions: any[] = [];
  drawInputLabels(labels);
  drawOutputLabels(labels);
  if (doRouting) {
    labels.push(...prescriptions);
  }

  let svg = <svg className="absolute" width={width} height={height}>
    <filter id='noiseFilter'>
      <feTurbulence
        type='fractalNoise'
        baseFrequency='3.76'
        numOctaves='3'
        stitchTiles='stitch' />
    </filter>
    <defs>
    <linearGradient id="topGrad" x1="10%" y1="100%" x2="90%" y2="0%">
      <stop offset="10%" stopColor={topColor} stopOpacity={0.8} />
      <stop offset="90%" stopColor={topColor} stopOpacity={0.2} />
    </linearGradient>
    <linearGradient id="botGrad" x1="10%" y1="100%" x2="90%" y2="0%">
      <stop offset="10%" stopColor={bottomColor} stopOpacity={0.8} />
      <stop offset="90%" stopColor={bottomColor} stopOpacity={0.2} />
    </linearGradient>
  </defs>

    {drawBoxes && benesRects}
    {benesLines}
    {doRouting && routingLines}
    <g fill="white" stroke="currentColor" strokeWidth="1.5">
      {circles}
    </g>
  </svg>;

  return <div className="flex items-stretch w-full h-full p-1" style={{ background: backgroundColor, flexDirection: vertical ? "column" : "row"}}>
    <div className="flex grow items-stretch p-1">
      <div ref={ref} className="relative flex grow p-0 m-0 overflow-hidden">
        {svg}
        {labels}
        {doRouting &&
        <PermWidget zoom={zoom} enableTransition={enableTransition} perm={perm} onPermChanged={setPerm} vertical={vertical} xyToIdx={(x, y) => grid.yFromScreen(x, y)} idxToXY={idx => applyTerminalBias(...grid.toScreen(grid.rootSubnet.extent().right, idx), false)} />
        }
        </div>
    </div>
  </div>
    ;
}