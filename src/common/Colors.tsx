import * as d3 from "d3";

// Based on https://github.com/vv9k/vim-github-dark
export let backgroundColor = "#161b22";
export let inputColor = "#faa356";
export let outputColor = "#a2d2fb";
export let midColor = "#ecf2f8";
export let topColor = "#7ce38b";
export let bottomColor = "#cea5fb";
export let redColor = "#fa7970";

// https://observablehq.com/@harrystevens/roll-your-own-color-palette-interpolator
function interpolatePalette(palette : string[]) {
  return (t: number) => d3.piecewise(d3.interpolateLab, palette)(Math.min(Math.max(0, t), 1));
}

export function getColorScale(resolution: number) {
  return d3.scaleSequential().domain([0,resolution]).interpolator(interpolatePalette(["#fa7970", "#ecf2f8", "#faa356", "#7ce38b", "#a2d2fb", "#77bdfb", "#cea5fb"]));
}

export function MainGradient({color, id}: {color: string, id: string}) {
  return <linearGradient id={id} x1="10%" y1="100%" x2="90%" y2="0%">
      <stop offset="10%" stopColor={color} stopOpacity={0.8} />
      <stop offset="90%" stopColor={color} stopOpacity={0.2} />
    </linearGradient>;
}