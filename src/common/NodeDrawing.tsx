import { backgroundColor, inputColor, midColor, outputColor } from "./Colors";
import { Grid } from "./Grid";
import { KI } from "./katex";

// Connecting the lines to the center of the circle makes them hard to follow (our terminal nodes are big),
// so we offset the input and output circles by a small terminal bias.
export function applyTerminalBias(zoom: number, grid: Grid, screenX: number, screenY: number, isInput: boolean) {
  let [x, y] = grid.verticalitySwap(screenX, screenY);
  x += (isInput ? -6 : 6) * zoom;
  return grid.verticalitySwap(x, y);
}


export enum GraphNodeType {
  Input,
  Output,
  Internal
}

export function graphNodeTypeToColor(colorType: GraphNodeType) {
  let color = midColor;
  if (colorType === GraphNodeType.Input) {
    color = inputColor;
  } else if (colorType === GraphNodeType.Output) {
    color = outputColor;
  }

  return color;
}

export function CenteredKI({x, y, key, zoom, children, color}: 
  {x: number, y: number, key: string, zoom: number, children: React.ReactNode, color?: string, transform?: string}) {
  return <div
        key={"lab_" + key}
        className="absolute pointer-events-none"
        style={{
          fontSize: 15 * zoom,
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
          color: color
        }}>
        <KI>{children}</KI>
      </div>;
}

export function drawNode(zoom: number, grid: Grid, type: GraphNodeType, color: string, gridX: number, gridY: number, svgList: any[], overlayList: any[], props: object = {}) {
  let [screenX, screenY] = grid.toScreen(gridX, gridY);
  let isTerminal = (type !== GraphNodeType.Internal);

  if (isTerminal) {
    [screenX, screenY] = applyTerminalBias(zoom, grid, screenX, screenY, type === GraphNodeType.Input);
  }


  let key = gridX + ',' + gridY;

  svgList.push(<circle {...props}
    key={key}
    cx={screenX} cy={screenY}
    stroke="none"
    r={(isTerminal ? 15 : 8) * zoom} fill={color} />);

  if (isTerminal) {
    let number = gridY + 1;
    overlayList.push(<CenteredKI color={backgroundColor} x={screenX} y={screenY} key={"lab_" + key} zoom={zoom}>{`${number}`}</CenteredKI>);
  }
}
