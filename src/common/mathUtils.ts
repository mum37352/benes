
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

export function foreachNaryString(length: number, base: number, doSomething: (digits: number[])=>boolean): boolean {
  let digits = new Array(length).fill(0);

  // Foreach subset.
  for (;;) {
    if (doSomething(digits)) {
      // The operation succeeded, we can stop.
      return true;
    }

    // Try to increment the counter.
    let incSucc = false;
    for (let i = 0; i < length && !incSucc; i++) {
      digits[i] = (digits[i] + 1) % base;
      if (digits[i] != 0) {
        incSucc = true;
      }
    }
    if (!incSucc) {
      // The counter overflowed, we have seen all subsets.
      return false;
    }
  }
}

export function sampleUniformUnitDisk(): [number, number] {
  let u = Math.random();
  let v = Math.random();

  // The joint cartesian PDF is p'(x,y)=1/pi. After applying
  // a change of variables, the polar PDF is p(r, theta) = r/pi.
  // Therefore, the marginal density is p(r) = 2r and the conditional
  // density is p(theta|r) = 1/(2*pi).
  // The CDFs are therefore P(r) = r^2 and P(theta|r) = theta/(2*pi).
  // Use P^-1(r) to sample r,
  let r = Math.sqrt(u);
  // and use P^-1(theta|r) to sample theta
  let theta = 2*Math.PI*v;

  return [r, theta];
}

// Y down, but counterclockwise (sigh).
export function rotatePoint(x: number, y: number, angleRadians: number): Vec2 {
  const cos = Math.cos(angleRadians);
  const sin = -Math.sin(angleRadians);

  const xNew = x * cos - y * sin;
  const yNew = x * sin + y * cos;

  return [xNew, yNew];
}