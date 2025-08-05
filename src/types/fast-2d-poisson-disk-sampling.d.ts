declare module 'fast-2d-poisson-disk-sampling' {
  interface Options {
    shape: [number, number];
    radius: number;
    tries?: number;
  }

  export default class FastPoissonDiskSampling {
    constructor(options: Options, rng?: () => number);
    fill(): [number, number][];
    next(): [number, number] | null;
    addPoint(point: [number, number]): [number, number] | null;
    addRandomPoint(): [number, number];
    getAllPoints(): [number, number][];
    reset(): void;
  }
}