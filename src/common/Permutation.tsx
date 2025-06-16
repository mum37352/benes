export default class Permutation {
  constructor(lut: number[]) {
    this.lut = [...lut];

    // Compute the inverse.
    this.invLut = Array<number>(lut.length)
    for (let i = 0; i < lut.length; i++) {
      this.invLut[lut[i]] = i;
    }
  }

  invert() {
    let swap = this.invLut;
    this.invLut = this.lut;
    this.lut = swap;
  }

  toLatex() {
    let domain = this.lut.map((_, i) => i + 1);
    let image = this.lut.map(i => i + 1);

    let topRow = domain.join(' & ');
    let bottomRow = image.join(' & ');

    return `\\begin{pmatrix}\n${topRow} \\\\\n${bottomRow}\n\\end{pmatrix}`;
  }

  lut: number[];
  invLut: number[];
}

export function correctIdx(rawIdx: number, height: number) {
  return Math.min(height - 1, Math.max(0, Math.round(rawIdx)));
}

function allPerms_recurse(unusedNums: Set<number>, lut: number[], n: number, perms: Permutation[]) {
  if (lut.length === n) {
    perms.push(new Permutation(lut));
    return;
  }

  let unusedList = Array.from(unusedNums).toSorted();

  for (let unusedNum of unusedList) {
    lut.push(unusedNum);
    unusedNums.delete(unusedNum);
    allPerms_recurse(unusedNums, lut, n, perms);
    unusedNums.add(unusedNum);
    lut.pop();
  }
}

export function allPerms(n: number) {
  let unusedNums = new Set<number>();

  for (let i = 0; i < n; i++) {
    unusedNums.add(i);
  }

  let result: Permutation[] = [];

  allPerms_recurse(unusedNums, [], n, result);

  return result;
}
