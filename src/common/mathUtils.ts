
export type Vec2 = [number, number];

export function length2d(x: number, y: number) {
  return Math.sqrt(x*x+y*y);
}

export function normalize2d(x: number, y: number): Vec2 {
  let length = length2d(x, y);
  return [x/length, y/length];
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}


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