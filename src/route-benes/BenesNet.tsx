import { useEffect, useLayoutEffect,useRef, useState } from "react";

import useResizeObserver from "@react-hook/resize-observer";
import * as d3 from "d3";

import { backgroundColor, bottomColor, inputColor, midColor, outputColor, topColor } from "../common/Colors";
import { KI } from "../common/katex";
import Permutation from "../common/Permutation";

type Vec2 = [number, number];

class Box {
  constructor(left: number, top: number, right: number, bottom: number) {
    this.top = top;
    this.bottom = bottom;
    this.left = left;
    this.right = right;
  }

  pad(amount: number) {
    this.left -= amount;
    this.top -= amount;
    this.right += amount;
    this.bottom += amount;
  }

  scale(x: d3.ScaleLinear<number, number>, y:d3.ScaleLinear<number, number>) {
    this.right = x(this.right);
    this.left = x(this.left);
    this.top = y(this.top);
    this.bottom = y(this.bottom);
  }

  width() {
    return this.right - this.left;
  }

  height() {
    return this.bottom - this.top;
  }

  top: number;
  bottom: number;
  left: number;
  right: number;
}



class Subnet {
  constructor(order: number, left: number, top: number, id: string) {
    this.order = order;
    this.width = 2*order;
    this.height = 2**order;
    this.left = left;
    this.top = top;
    this.id = id;
  }

  isInput(localX: number) {
    return localX == 0;
  }

  isOutput(localX: number) {
    return localX == this.width - 1;
  }

  isSubOutput(localX: number) {
    return localX >= this.width/2;
  }

  isTerminal(localX: number) {
    return this.isOutput(localX) || this.isInput(localX);
  }

  globalX(localX: number) {
    return this.left + localX;
  }

  globalY(localY: number) {
    return this.top + localY;
  }

  topSubnet() {
    let result = new Subnet(this.order - 1, this.globalX(1), this.globalY(0), this.id+"0");
    return result;
  }

  bottomSubnet() {
    let result = new Subnet(this.order - 1, this.globalX(1), this.globalY(this.height/2), this.id+"1");
    return result;
  }

  extent() {
    return new Box(this.globalX(0), this.globalY(0), this.globalX(this.width - 1), this.globalY(this.height - 1));
  }

  id: string;

  order: number;

  width: number;
  height: number;

  top: number;
  left: number;
}

class Grid {
  constructor(order: number, vertical: boolean, screenBox: Box) {
    this.rootSubnet = new Subnet(order, 0, 0, "");
    let extent = this.rootSubnet.extent();

    this.vertical = vertical;

    let [xExtent, yExtent] = this.verticalitySwap([extent.left, extent.right], [extent.top, extent.bottom]);
    this.xScale = d3.scaleLinear(xExtent, [screenBox.left, screenBox.right]);
    this.yScale = d3.scaleLinear(yExtent, [screenBox.top, screenBox.bottom]);
  }

  verticalitySwap<T>(x: T, y: T): [T, T] {
    if (this.vertical) {
      return [y, x];
    } else {
      return [x, y];
    }
  }

  toScreen(gridX: number, gridY: number): Vec2 {
    let [swappedX, swappedY] = this.verticalitySwap(gridX, gridY);
    return [this.xScale(swappedX), this.yScale(swappedY)];
  }

  toScreenBox(box: Box): Box {
    let result = new Box(0,0,0,0);
    [result.left, result.top] = this.toScreen(box.left, box.top);
    [result.right, result.bottom] = this.toScreen(box.right, box.bottom);
    return result;
  }

  yFromScreen(screenX: number, screenY: number) {
    let result = this.vertical ? this.xScale.invert(screenX) : this.yScale.invert(screenY);
    result = Math.min(this.rootSubnet.height - 1, Math.max(0, Math.round(result)));
    return result;
  }

  rootSubnet: Subnet;
  vertical: boolean;
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
}
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

function DraggableCircle(props: {onDrag: Function | undefined, onDragStart: Function | undefined, onDragEnd: Function | undefined} & React.SVGProps<SVGCircleElement>) {
  let ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      let drag = d3.drag();
      if (props.onDrag) {
        drag = drag.on("drag", props.onDrag);
      }
      if (props.onDragStart) {
        drag = drag.on("start", props.onDragStart);
      }
      if (props.onDragEnd) {
        drag = drag.on("end", props.onDragEnd);
      }

      drag(d3.select(ref.current));
    }
  });

  return <circle ref={ref} {...props} />
}

// https://observablehq.com/@harrystevens/roll-your-own-color-palette-interpolator
function interpolatePalette(palette : string[]) {
  return (t: number) => d3.piecewise(d3.interpolateLab, palette)(Math.min(Math.max(0, t), 1));
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
  let [size, setSize] = useState<DOMRect|undefined>();
  let [perm, setPerm] = useState(new Permutation([...Array(numInputs).keys()]));
  let [activeDropIndicator, setActiveDropIndicator] = useState<number>(-1);
  let [dragSource, setDragSource] = useState<number>(-1);
  
  let marginTop = 50,
  marginRight = 50,
  marginBottom = 50,
  marginLeft = 50;

  if (doRouting) {
    if (vertical) {
      marginBottom += 50;
    } else {
      marginRight += 50;
    }
  }

  let [prevK, setPrevK] = useState(order);
  if (prevK != order) {
    setPrevK(order);
    setPerm(new Permutation([...Array(numInputs).keys()]));
    return <></>;
  }

  let width = size?.width || 0;
  let height = size?.height || 0;

  useLayoutEffect(() => {
    setSize(ref.current?.getBoundingClientRect());
  }, [ref]);

  if (typeof window !== "undefined") {
    useResizeObserver(ref, entry => setSize(entry.contentRect));
  }

  let screenBox = new Box(marginLeft, marginTop, width - marginRight, height - marginBottom);
  let grid = new Grid(order, vertical, screenBox);

  let circles: any[] = [];

  function applyTerminalBias(screenX: number, screenY: number, isInput: boolean) {
    let [x, y] = grid.verticalitySwap(screenX, screenY);
    x += isInput ? -15 : 15;
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
        r={isTerminal ? 15 : 8} fill={color}  />)
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
      lines.push(<line key={prefix+postfix} {...{ x1, y1, x2, y2 }} strokeOpacity={0.5} stroke={stroke} strokeWidth={2} />);
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
      let padAmount = 20;

      let topBox = grid.toScreenBox(topSubnet.extent());
      let bottomBox = grid.toScreenBox(bottomSubnet.extent());

      topBox.pad(padAmount);
      bottomBox.pad(padAmount);

      //benesRects.push(<rect key={"ar"+topSubnet.id} rx={10} ry={10} x={topBox.left} y={topBox.top} width={topBox.right - topBox.left} height={topBox.bottom - topBox.top} stroke={"none"} fill={backgroundColor} fillOpacity={0.8} />)
      //benesRects.push(<rect key={"ar"+bottomSubnet.id} rx={10} ry={10} x={bottomBox.left} y={bottomBox.top} width={bottomBox.right - bottomBox.left} height={bottomBox.bottom - bottomBox.top} stroke={"none"} fill={backgroundColor} fillOpacity={0.8} />)

      benesRects.push(<rect key={"br"+topSubnet.id} rx={10} ry={10} x={topBox.left} y={topBox.top} width={topBox.right - topBox.left} height={topBox.bottom - topBox.top} stroke={"none"} fill={"url('#topGrad')"} fillOpacity={0.2} />)
      benesRects.push(<rect key={"br"+bottomSubnet.id} rx={10} ry={10} x={bottomBox.left} y={bottomBox.top} width={bottomBox.right - bottomBox.left} height={bottomBox.bottom - bottomBox.top} stroke={"none"} fill={"url('#botGrad')"} fillOpacity={0.2} />)

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
    var colorScale = d3.scaleSequential().domain([0,netHeight-1]).interpolator(interpolatePalette(["#fa7970", "#ecf2f8", "#faa356", "#7ce38b", "#a2d2fb", "#77bdfb", "#cea5fb"]));
  
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
          key={`rt_${inputIdx}_${edgeIdx}`}
          x1={x1} y1={y1} x2={x2} y2={y2}
          fill="none"
          strokeWidth="6"
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

  let labelOffset = 20;

  function drawInputLabels(inputLabels: any[]) {
    for (let inputIdx = 0; inputIdx < grid.rootSubnet.height; inputIdx++) {
      let [x, y] = applyTerminalBias(...grid.toScreen(0, inputIdx), true);

      inputLabels.push(
        <div 
        className="absolute pointer-events-none bold"
        key={"il_" + inputIdx}
        style={{
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
          color: backgroundColor
        }}>
          <KI>{`${inputIdx+1}`}</KI>
        </div>);
    }
  }

  function drawOutputLabels(outputLabels: any[], prescriptions: any[]) {
    for (let preimage = 0; preimage < grid.rootSubnet.height; preimage++) {
      let outputIdx = perm.lut[preimage];
      let [x, y] = applyTerminalBias(...grid.toScreen(grid.rootSubnet.extent().right, outputIdx), false);


      outputLabels.push(
        <div 
        key={"ol_" + preimage.toString()}
        className="absolute pointer-events-none" 
        style={{
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
          color: backgroundColor
        }}>
          <KI>{`${outputIdx+1}`}</KI>
        </div>);

      let dropIdx = (outputIdx===0 ? 0 : grid.rootSubnet.height);
      let dropStyle: React.CSSProperties = {
        opacity: (activeDropIndicator === dropIdx) ? 1 : 0
      };

      dropStyle[vertical?"left":"top"] = `${outputIdx===0?"-":""}10px`;

      let drop = <div className="relative w-0 h-0">
        <div
          key={`drop_${dropIdx}`} 
          className={`absolute transition bg-cyan-400 shrink-0 ${vertical ? "h-12" : "w-12"} ${vertical ? "w-0.5" : "h-0.5"}`}
          style={dropStyle}
        />
      </div>;


      let predrop = undefined;
      let postdrop = undefined;

      // Both of these cannot occur at the same time because we have at least two outputs.
      if (outputIdx === 0) {
        predrop = drop;
      } else if (outputIdx === grid.rootSubnet.height - 1) {
        postdrop = drop;
      }

      function labelStyle(x: number, y: number): React.CSSProperties {
        return {
          transform: vertical ? `translate(-50%, 0) translate(${x}px, ${y + labelOffset}px)` :
          `translate(0, -50%) translate(${x + labelOffset}px, ${y}px)`,
          flexDirection: vertical ? "row" : "column"
        };  
      }

      prescriptions.push(
        <div
          key={"ob_" + preimage.toString()}
          className="absolute flex transition-transform duration-200"
          style={labelStyle(x, y)}>
          {predrop}
          <div
            className="flex items-center bg-white/0 hover:bg-white/30 pushed:bg-white/50 transition rounded-sm cursor-grab p-1 active:cursor-grabbing"
            draggable="true"
            onDragStart={(e: any) => {
              setDragSource(outputIdx);
            }}
            style={{ flexDirection: vertical ? "column" : "row" }}>
            <div className={`px-1 ${vertical ? "-rotate-90" : "rotate-180"}`}><KI>{`\\mapsto`}</KI></div>
            <KI>{`${preimage + 1}`}</KI>
          </div>
          {postdrop}
        </div>
      );

      // Drop indicator
      if (outputIdx < grid.rootSubnet.height - 1) {
        [x, y] = applyTerminalBias(...grid.toScreen(grid.rootSubnet.extent().right, outputIdx + 0.5), false);
        dropIdx = outputIdx+1;
        outputLabels.push(<div key={`drop_${dropIdx}`} data-before={outputIdx}
          className={`absolute transition bg-cyan-400 shrink-0 ${vertical ? "h-12" : "w-12"} ${vertical ? "w-0.5" : "h-0.5"}`}

          style={{opacity: activeDropIndicator === outputIdx+1 ? 1 : 0, ...labelStyle(x, y)}}
        />);
      }
    }
  }

  let labels: any[] = [];
  let prescriptions: any[] = [];
  drawInputLabels(labels);
  drawOutputLabels(labels, prescriptions);
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


  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    setActiveDropIndicator(-1);

    let fromIdx = dragSource;
    let toIdx = grid.yFromScreen(e.clientX, e.clientY);
    let invLut = [...perm.invLut];
    let move = invLut[fromIdx];
    invLut.splice(fromIdx, 1);
    invLut.splice(toIdx, 0, move);
    let newPerm = new Permutation(invLut);
    newPerm.invert();
    setPerm(newPerm);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    let fromIdx = dragSource;
    let toIdx = grid.yFromScreen(e.clientX, e.clientY);

    console.log(e.dataTransfer.getData("outputIdx"), "is", fromIdx, toIdx);
    e.preventDefault();
    e.clientY;

    if (toIdx < fromIdx) {
      setActiveDropIndicator(toIdx);
    } else if (toIdx > fromIdx) {
      setActiveDropIndicator(toIdx + 1);
    } else {
      setActiveDropIndicator(-1);
    }
  }

  return <div className="flex items-stretch w-full h-full p-1" style={{ background: backgroundColor, flexDirection: vertical ? "column" : "row"}}>
    <div className="flex grow items-stretch p-1">
      <div ref={ref} className="relative flex grow p-0 m-0 overflow-hidden" onDragOver={handleDragOver} onDragLeave={() => setActiveDropIndicator(-1)} onDrop={handleDrop}>
        {svg}
        {labels}
      </div>
    </div>
  </div>
    ;
}