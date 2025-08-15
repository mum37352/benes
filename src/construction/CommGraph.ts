import { foreachNaryString, Vec2 } from "@/common/mathUtils";
import { GraphNodeType } from "@/common/NodeDrawing";
import Permutation, { allPerms } from "@/common/Permutation";
import * as d3 from "d3";

let solver = require('javascript-lp-solver');

export interface CommGraphNode extends d3.SimulationNodeDatum {
  type: GraphNodeType,
  key: string,
  guideline?: number|undefined
}

type LPModel = {
  optimize: string;
  opType: "max" | "min";
  constraints: {
    [constraintName: string]: {
      equal?: number;
      max?: number;
      min?: number;
    };
  };
  variables: {
    [variableName: string]: any;
  };
};

export interface CommGraphEdge extends d3.SimulationLinkDatum<CommGraphNode> {
  key: string
}

export class CommGraph {
  constructor(ioHeight: number) {
    this.numGuidelines = 3;

    this.ioHeight = ioHeight;

    this.inputs = [];
    for (let inputIdx = 0; inputIdx < ioHeight; inputIdx++) {
      let [x, y] = this.getInputPos(inputIdx);
      let node : CommGraphNode = {key: "innd_"+inputIdx, type: GraphNodeType.Input, fx: x, fy: y };
      this.inputs.push(node);
    }

    this.outputs = [];
    for (let outputIdx = 0; outputIdx < ioHeight; outputIdx++) {
      let [x, y] = this.getOutputPos(outputIdx);
      let node : CommGraphNode = {key: "outnd_"+outputIdx, type: GraphNodeType.Output, fx: x, fy: y };
      this.outputs.push(node);
    }

    this.nextId = 0;

    this.nodes = [...this.inputs, ...this.outputs];
    this.edges = [];

    this.useIlp = false;

    // Totally valid since we have no edges.
    this.routingLut = new Map();
  }

  static makeCompleteBipartiteGraph(ioHeight: number) {
    let graph = new CommGraph(ioHeight);

    
    for (let inputIdx = 0; inputIdx < ioHeight; inputIdx++) {
      for (let outputIdx = 0; outputIdx < ioHeight; outputIdx++) {
        let newEdge: CommGraphEdge = {
          source: graph.inputs[inputIdx],
          target: graph.outputs[outputIdx]
        };
        graph.edges.push(newEdge);
      }
    }
    
    graph.routeAllPermutations();

    return graph;
  }

  setNumGuidelines(newNum: number) {
    this.numGuidelines = newNum;

    for (let [i, node] of this.inputs.entries()) {
      [node.fx, node.fy] = this.getInputPos(i);
    }
    for (let [i, node] of this.outputs.entries()) {
      [node.fx, node.fy] = this.getOutputPos(i);
    }
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      let node = this.nodes[i];
      if (node.type === GraphNodeType.Internal && node.guideline && node.guideline >= newNum) {
        this.deleteNode(node);
      }
    }
    this.routeAllPermutations();
  }

  getInputPos(inputIdx: number): Vec2 {
    return [0, inputIdx];
  }

  getOutputPos(outputIdx: number): Vec2 {
    return [this.numGuidelines+1, outputIdx];
  }

  centerX() {
    return (this.numGuidelines+1)/2;
  }

  centerY() {
    return (this.ioHeight-1)/2;
  }

  // If successful, return the valences, else return null.
  hasNoValence3Nodes(edgeSubset: Array<number>) {
    let nodeValences = new Map();

    function bumpValence(node: CommGraphNode) {
      let current = nodeValences.get(node);
      if (!current) {
        current = 1;
      } else {
        current++;
      }
      nodeValences.set(node, current);

      return current;
    }

    for (let edgeIdx = 0; edgeIdx < edgeSubset.length; edgeIdx++) {
      if (edgeSubset[edgeIdx] != 0) {
        let edge = this.edges[edgeIdx];

        let valenceA = bumpValence(edge.source as CommGraphNode);
        let valenceB = bumpValence(edge.target as CommGraphNode);

        if (valenceA > 2 || valenceB > 2) {
          return null;
        }
      }
    }

    return nodeValences;
  }

  printLPModel(model: LPModel): void {
    const { optimize, opType, constraints, variables } = model;

    // Build objective function
    const objectiveTerms = Object.entries(variables)
      .map(([varName, coeffs]) => {
        const c = coeffs[optimize] ?? 0;
        return c !== 0 ? `${c}*${varName}` : null;
      })
      .filter(Boolean)
      .join(" + ");

    console.log(`${opType === "max" ? "Maximize" : "Minimize"}: ${objectiveTerms}`);

    console.log("Subject to:");

    for (const [constraintName, bounds] of Object.entries(constraints)) {
      const terms = Object.entries(variables)
        .map(([varName, coeffs]) => {
          const coef = coeffs[constraintName] ?? 0;
          return coef !== 0 ? `${coef}*${varName}` : null;
        })
        .filter(Boolean)
        .join(" + ");

      if (bounds.hasOwnProperty("equal")) {
        console.log(`  ${terms} = ${bounds.equal}   (${constraintName})`);
      }
      if (bounds.hasOwnProperty("max")) {
        console.log(`  ${terms} ≤ ${bounds.max}   (${constraintName})`);
      }
      if (bounds.hasOwnProperty("min")) {
        console.log(`  ${terms} ≥ ${bounds.min}   (${constraintName})`);
      }
    }

    // List non-negativity constraints
    const varNames = Object.keys(variables);
    console.log(`${varNames.join(", ")} ≥ 0`);
  }

  routePermutationIlp(perm: Permutation): CommGraphNode[][] | null {
    let variables: {[key: string]: {[key: string]: number}} = {};
    let constraints: {[key: string]: {"equal"?: number, "max"?: number, "min"?: number}} = {};
    let ints:  {[key: string]: 1} = {};


    function pathMod(key: string, pathIdx: number) {
      return "p" + pathIdx.toString() + "-" + key;
    }

    function mkEdgeVarKey(edgeIdx: number, pathIdx: number) {
      return pathMod(edgeIdx.toString() + "-var", pathIdx);
    }
    
    for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
      let inputNode = this.inputs[inputIdx];
      let outputNode = this.outputs[perm.lut[inputIdx]];

      function isTerminal(node: CommGraphNode) {
        return node === inputNode || node === outputNode;
      }

      for (let edgeIdx = 0; edgeIdx < this.edges.length; edgeIdx++) {
        let edgeKey = mkEdgeVarKey(edgeIdx, inputIdx);
        let binEqnKey = pathMod(edgeIdx.toString() + "-b-eqn", inputIdx);

        variables[edgeKey] = { "objective": 0 };
        variables[edgeKey][binEqnKey] = 1;

        ints[edgeKey] = 1;
        constraints[binEqnKey] = { "max": 1 };
      }

      // Add the edge inequalities.
      let doIncidentCoeffs = (eqnKey: string, edgeIdx: number, node: CommGraphNode) => {
        if (isTerminal(node)) {
          constraints[eqnKey]["min"]!--;
        }

        let inc = this.incidentEdgeIndices(node);
        for (let incEdgeIdx of inc) {
          if (incEdgeIdx === edgeIdx) {
            continue;
          }

          let incEdgeKey = mkEdgeVarKey(incEdgeIdx, inputIdx);
          if (!variables[incEdgeKey][eqnKey]) {
            variables[incEdgeKey][eqnKey] = 0;
          }
          variables[incEdgeKey][eqnKey]++;
        }
      }

      for (let edgeIdx = 0; edgeIdx < this.edges.length; edgeIdx++) {
        let edgeKey = mkEdgeVarKey(edgeIdx, inputIdx);
        let eqnKey = pathMod(edgeIdx.toString() + "-e-eqn", inputIdx);
        variables[edgeKey][eqnKey] = -2;
        constraints[eqnKey] = { "min": 0 };

        let edge = this.edges[edgeIdx];

        doIncidentCoeffs(eqnKey, edgeIdx, edge.source as CommGraphNode);
        doIncidentCoeffs(eqnKey, edgeIdx, edge.target as CommGraphNode);
      }

      // Add the cycle-valence bounds for the nodes.
      function mkVertEqnKey(node: CommGraphNode) {
        return pathMod(node.key + "-v-eqn", inputIdx);
      }

      for (let node of this.nodes) {
        let eqnKey = mkVertEqnKey(node);

        constraints[eqnKey] = { "max": isTerminal(node) ? 1 : 2 };
        let inc = this.incidentEdgeIndices(node);

        for (let edgeIdx of inc) {
          let edgeKey = mkEdgeVarKey(edgeIdx, inputIdx);
          variables[edgeKey][eqnKey] = 1;
        }
      }

      // Add equations for the augmentation edge. These n equations are the only part of
      // the system that are sensitive to the permutation.
      for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
        let eqnKey = pathMod(inputIdx.toString() + "-perm-eqn", inputIdx);

        let inputNode = this.inputs[inputIdx];
        let outputNode = this.outputs[perm.lut[inputIdx]];

        constraints[eqnKey] = { "min": 0 };
        doIncidentCoeffs(eqnKey, -1, inputNode);
        doIncidentCoeffs(eqnKey, -1, outputNode);
        constraints[eqnKey] = { "min": 2 };
      }
    }

    // Add vertex-disjointness constraints for all the paths.
    for (let node of this.nodes) {
      let eqnKey = node.key + "-dj-eqn";

      constraints[eqnKey] = { "max": node.type === GraphNodeType.Internal ? 2 : 1 };

      let inc = this.incidentEdgeIndices(node);
      for (let incIdx of inc) {
        for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
          let edgeKey = mkEdgeVarKey(incIdx, inputIdx);
          variables[edgeKey][eqnKey] = 1;
        }
      }
    }

    const model = {
      optimize: 'objective',
      opType: 'min',
      constraints,
      variables,
      ints
    };

    this.printLPModel(model as LPModel);

    const result = solver.Solve(model);
    console.log(result);

    if (!result.feasible) {
      return null;
    }

    // Else, reconstruct the paths in a more user-friendly format.

    let permutationPaths = [];
    for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
      let path: CommGraphNode[] = [this.inputs[inputIdx]];
      // Each iteration of the loop adds one node to the path.
      for (;;) {
        // Find all edges incident w/ the last node in the path.
        let lastNode = path.at(-1) as CommGraphNode;

        if (lastNode.type === GraphNodeType.Output) {
          break;
        }

        let penultimateNode = path.at(-2);
        let incidentEdgeIndices = this.incidentEdgeIndices(lastNode);

        for (let incidentEdgeIdx of incidentEdgeIndices) {
          let edgeKey = mkEdgeVarKey(incidentEdgeIdx, inputIdx);

          // Check if the incident edge is in the subset.
          if (result[edgeKey] === 1) {
            let edge = this.edges[incidentEdgeIdx];
            let adjNode = this.getOppositeEdgeNode(edge, lastNode);
            // Don't go back.
            if (adjNode !== penultimateNode) {
              path.push(adjNode);
              break;
            }
          }
        }

      }
      permutationPaths.push(path);
    }

    console.log(permutationPaths);

    return permutationPaths;
  }

  routeAllPermutations(): Map<string, CommGraphNode[][]> {
    if (this.useIlp) {
      return this.routeAllPermutationsIlp();
    } else {
      return this.routeAllPermutationsBruteForce();
    }
  }

  routeAllPermutationsIlp(): Map<string, CommGraphNode[][]> {
    let routingLut = new Map<string, CommGraphNode[][]>();
    let perms = allPerms(this.ioHeight);

    for (let perm of perms) {
      let routing = this.routePermutationIlp(perm);
      if (routing) {
        routingLut.set(perm.lut.toString(), routing);
      }
      
      break;
    }

    this.routingLut = routingLut;
    return routingLut;
  }

  routeAllPermutationsBruteForce(): Map<string, CommGraphNode[][]> {
    // Indexed by stringified permutation luts.
    let routingLut = new Map<string, CommGraphNode[][]>();
    foreachNaryString(this.edges.length, 2, (edgeSubset: Array<number>) => {
      let isVertical = true;
      for (let edgeIdx = 0; edgeIdx < edgeSubset.length; edgeIdx++) {
        let edgeBool = edgeSubset[edgeIdx] > 0;
        if (edgeBool !== ((edgeIdx % this.ioHeight) === Math.floor(edgeIdx / this.ioHeight))) {
          isVertical = false;
        }
      }

      // TODO(optimize): We don't need a full recomputation of the valences here.
      let valences = this.hasNoValence3Nodes(edgeSubset);
      if (!valences) {
        return false;
      }

      // This is a special subgraph, it is a collection of vertex-disjoint paths.

      // Make sure the input and output nodes are terminal and being connected.
      for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
        if (valences.get(this.inputs[inputIdx]) !== 1) {
          return false;
        }
      }

      for (let outputIdx = 0; outputIdx < this.ioHeight; outputIdx++) {
        if (valences.get(this.outputs[outputIdx]) !== 1) {
          return false;
        }
      }

      // Let's simultaneously record the route in a more user-friendly format, and find out
      // if it corresponds to a permutation. (We still have the possibility of input paths not reaching outputs)
      let permutationLut = [];
      let permutationPaths = [];
      for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
        let path: CommGraphNode[] = [this.inputs[inputIdx]];
        // Each iteration of the loop adds one node to the path.
        for (;;) {
          // Find all edges incident w/ the last node in the path.
          let lastNode = path.at(-1) as CommGraphNode;
          let penultimateNode = path.at(-2);
          let incidentEdgeIndices = this.incidentEdgeIndices(lastNode);

          let foundNewPathNode = false;
          for (let incidentEdgeIdx of incidentEdgeIndices) {
            // Check if the incident edge is in the subset.
            if (edgeSubset[incidentEdgeIdx]) {
              let edge = this.edges[incidentEdgeIdx];
              let adjNode = this.getOppositeEdgeNode(edge, lastNode);
              // Don't go back.
              if (adjNode !== penultimateNode) {
                path.push(adjNode);
                // There is at most one incident edge in the subset.
                foundNewPathNode = true;
                break;
              }
            }
          }

          if (!foundNewPathNode) {
            // We have retraced the entirety of the path.
            break;
          }
        }

        // Now check if the path terminates at an output node.
        let pathIsSane = false;
        for (let outputIdx = 0; outputIdx < this.ioHeight; outputIdx++) {
          let node = this.outputs[outputIdx];
          let lastNode = path.at(-1) as CommGraphNode;
          if (lastNode === node) {
            permutationLut.push(outputIdx);
            pathIsSane = true;
            break;
          }
        }

        if (!pathIsSane) {
          // Ditch the entire subset.
          return false;
        }

        permutationPaths.push(path);
      }

      routingLut.set(permutationLut.toString(), permutationPaths);

      // Return false, since we want to route all permutations.
      return false;
    });

    this.routingLut = routingLut;
    return routingLut;
  }

  getOppositeEdgeNode(edge: CommGraphEdge, node: CommGraphNode): CommGraphNode {
    if (edge.source === node) {
      return edge.target as CommGraphNode;
    } else {
      return edge.source as CommGraphNode;
    }
  }

  // WARNING: Expensive, linear in the # of edges.
  adjacentVerts(node: CommGraphNode) : CommGraphNode[] {
    let result: CommGraphNode[] = [];

    for (let edge of this.edges) {
      if (edge.source === node) {
        result.push(edge.source);
      } else if (edge.target === node) {
        result.push(edge.target);
      }
    }

    return result;
  }

  // WARNING: Expensive, linear in the # of edges.
  incidentEdgeIndices(node: CommGraphNode) : number[] {
    let result: number[] = [];

    for (let edgeIdx = 0; edgeIdx < this.edges.length; edgeIdx++) {
      let edge = this.edges[edgeIdx];
      if (edge.source === node) {
        result.push(edgeIdx);
      } else if (edge.target === node) {
        result.push(edgeIdx);
      }
    }

    return result;
  }

  getNextId() {
    return this.nextId++;
  }

  deleteNode(node: CommGraphNode) {
    // Delete edges containing the node.
    // Remove all elements greater than 3, in-place
    for (let i = this.edges.length - 1; i >= 0; i--) {
      if (this.edges[i].target === node || this.edges[i].source === node) {
        this.edges.splice(i, 1);
      }
    }
    
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      if (this.nodes[i] === node) {
        this.nodes.splice(i, 1);
      }
    }
  }

  deleteEdge(edge: CommGraphEdge) {
    for (let i = this.edges.length - 1; i >= 0; i--) {
      if (this.edges[i] === edge) {
        this.edges.splice(i, 1);
      }
    }
  }

  nextId: number;

  ioHeight: number;
  inputs: CommGraphNode[];
  outputs: CommGraphNode[];
  nodes: CommGraphNode[];
  edges: CommGraphEdge[];

  // Vertical lines.
  //guidelines: Guideline[];
  numGuidelines: number;

  routingLut: Map<string, CommGraphNode[][]>;

  useIlp: boolean;
}
