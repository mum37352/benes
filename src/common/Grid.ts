export type Vec2 = [number, number];
import * as d3 from "d3";
import { correctIdx } from "./Permutation";
import { GraphNodeType } from "./NodeDrawing";

export class Box {
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



export class Subnet {
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

  type(localX: number) {
    if (this.isInput(localX)) {
      return GraphNodeType.Input;
    } else if (this.isOutput(localX)) {
      return GraphNodeType.Output; 
    } else {
      return GraphNodeType.Internal;
    }
  }

  isSubOutput(localX: number) {
    return localX >= this.width/2;
  }

  subType(localX: number) {
    return this.isSubOutput(localX) ? GraphNodeType.Input : GraphNodeType.Output;
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

export class Grid {
  constructor(extent: Box, vertical: boolean, screenBox: Box) {
    this.vertical = vertical;
    this.extent = extent;

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

  xFromScreen(screenX: number, screenY: number, roundToInt: boolean = true) {
    let result = !this.vertical ? this.xScale.invert(screenX) : this.yScale.invert(screenY);
    if (roundToInt) {
      // TODO: This fails if extent.left is not 0.
      result = correctIdx(result, this.extent.right + 1)
    }
    return result;
  }

  yFromScreen(screenX: number, screenY: number, roundToInt: boolean = true) {
    let result = this.vertical ? this.xScale.invert(screenX) : this.yScale.invert(screenY);
    if (roundToInt) {
      // TODO: This fails if extent.top is not 0.
      result = correctIdx(result, this.extent.bottom + 1);
    }

    console.log(screenY);
    return result;
  }

  cellWidth() {
    return this.xScale(1) - this.xScale(0);
  }

  cellHeight() {
    return this.yScale(1) - this.yScale(0);
  }

  extent: Box;
  vertical: boolean;
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
}

export class BenesGrid extends Grid {
  constructor(order: number, vertical: boolean, screenBox: Box) {
    let rootSubnet = new Subnet(order, 0, 0, "");
    super(rootSubnet.extent(), vertical, screenBox);
    this.rootSubnet = rootSubnet;
  }

  rootSubnet: Subnet;
}

export function computeGridLayout(totalSize: number, relativeSizes: number[]): number[] {
  let sum = relativeSizes.reduce((acc, addend) => {
    return acc + addend;
  }, 0);

  let ratio = totalSize / sum;

  let result = relativeSizes.map(x => x * ratio);
  return result;
}

export type Margin = {
  left: number,
  right: number,
  top: number,
  bottom: number
};

// Compute the size of the margin relative to the cell size.
export function computeGridMargins(doRouting: boolean, vertical: boolean): Margin {
  let margin = {
    left: 0.5,
    top: 1.0,
    right: 0.5,
    bottom: 1.0
  }

  if (doRouting) {
    if (vertical) {
      margin.bottom += 0.5;
    } else {
      margin.right += 0.5;
    }
  }

  return margin;
}