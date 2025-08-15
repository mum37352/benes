import { RefObject, useRef } from "react";
import { Vec2 } from "./mathUtils";
import { useFlushingResizeObserver } from "./resizeObserver";

export type GraphCanvas = {
  ref: RefObject<HTMLDivElement|null>,
  dummyRectRef: RefObject<SVGRectElement|null>,
  screenWidth: number,
  screenHeight: number,
  enableTransition: boolean,
  clientToSvg: (x: number, y: number) => Vec2,
  getEventPoint: (e: React.MouseEvent) => Vec2
}

export function useGraphCanvas() {
  let ref = useRef<HTMLDivElement>(null);
  let dummyRectRef = useRef<SVGRectElement>(null);
  let {size, enableTransition} = useFlushingResizeObserver(ref);

  let screenWidth = size?.width || 0;
  let screenHeight = size?.height || 0;

  function clientToSvg(x: number, y: number): Vec2 {
    let svgPoint = new DOMPoint(x, y);
    svgPoint = svgPoint.matrixTransform(dummyRectRef.current?.getScreenCTM()?.inverse());
    return [svgPoint.x, svgPoint.y];
  }

  function getEventPoint(e: React.MouseEvent) {
    return clientToSvg(e.clientX, e.clientY);
  }

  let cnv: GraphCanvas = {
    clientToSvg,
    getEventPoint,
    ref,
    dummyRectRef,
    screenWidth,
    screenHeight,
    enableTransition
  };

  return cnv;
}