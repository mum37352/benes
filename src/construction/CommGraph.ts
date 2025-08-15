import { foreachNaryString, Vec2 } from "@/common/mathUtils";
import { GraphNodeType } from "@/common/NodeDrawing";
import Permutation, { allPerms } from "@/common/Permutation";
import * as d3 from "d3";
import Graph from "graphology";

let solver = require('javascript-lp-solver');

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

function printLPModel(model: LPModel): void {
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

export type CommGraphNode = {
  x: number,
  y: number,
  type: GraphNodeType,
  guideline?: number|undefined;
};


export class CommGraph {
  constructor(ioHeight: number) {
    this.numGuidelines = 3;

    this.ioHeight = ioHeight;

    this.graph = new Graph({ type: 'undirected' });

    for (let inputIdx = 0; inputIdx < ioHeight; inputIdx++) {
      let [x, y] = this.getInputPos(inputIdx);
      this.graph.addNode(CommGraph.mkInputKey(inputIdx), {type: GraphNodeType.Input, x, y});
    }

    for (let outputIdx = 0; outputIdx < ioHeight; outputIdx++) {
      let [x, y] = this.getOutputPos(outputIdx);
      this.graph.addNode(CommGraph.mkOutputKey(outputIdx), {type: GraphNodeType.Output, x, y});
    }

    this.nextId = 0;

    this.useIlp = false;

    // Totally valid since we have no edges.
    this.routingLut = new Map();
  }

  static mkInputKey(inputIdx: number) {
    return "innd-" + inputIdx;
  }

  static mkOutputKey(inputIdx: number) {
    return "outnd-" + inputIdx;
  }

  static makeCompleteBipartiteGraph(ioHeight: number) {
    let commGraph = new CommGraph(ioHeight);

    for (let inputIdx = 0; inputIdx < ioHeight; inputIdx++) {
      for (let outputIdx = 0; outputIdx < ioHeight; outputIdx++) {
        commGraph.graph.addEdge(CommGraph.mkInputKey(inputIdx), CommGraph.mkOutputKey(outputIdx));
      }
    }
    
    commGraph.routeAllPermutations();

    return commGraph;
  }

  setNumGuidelines(newNum: number) {
    this.numGuidelines = newNum;

    // Update terminal positions.
    for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
      this.graph.setNodeAttribute(CommGraph.mkInputKey(inputIdx), "x", this.getInputPos(inputIdx)[0]);
    }
    for (let outputIdx = 0; outputIdx < this.ioHeight; outputIdx++) {
      this.graph.setNodeAttribute(CommGraph.mkOutputKey(outputIdx), "x", this.getOutputPos(outputIdx)[0]);
    }

    // Delete nodes on deleted guidelines.
    let aboutToDie = this.graph.filterNodes((node, attributes) => (attributes.type === GraphNodeType.Internal && !!attributes.guideline && attributes.guideline >= newNum));
    aboutToDie.forEach(node => this.graph.dropNode(node));

    // Reroute.
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

  // Used for the brute force router.
  // If successful, return the valences, else return null.
  hasNoValence3Nodes(edges: string[], edgeSubset: Array<number>) {
    let nodeValences = new Map();

    function bumpValence(node: string) {
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
        let edge = edges[edgeIdx];

        let valenceA = bumpValence(this.graph.source(edge));
        let valenceB = bumpValence(this.graph.target(edge));

        if (valenceA > 2 || valenceB > 2) {
          return null;
        }
      }
    }

    return nodeValences;
  }

  // string[] = Array of nodes.
  routePermutationIlp(perm: Permutation): string[][] | null {
    let variables: {[key: string]: {[key: string]: number}} = {};
    let constraints: {[key: string]: {"equal"?: number, "max"?: number, "min"?: number}} = {};
    let ints:  {[key: string]: 1} = {};


    function pathMod(key: string, pathIdx: number) {
      return "p" + pathIdx.toString() + "-" + key;
    }

    function mkEdgeVarKey(edge: string, pathIdx: number) {
      // TODO: Should escape the edge key?
      return pathMod(edge + "-var", pathIdx);
    }
    
    for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
      let inputNode = CommGraph.mkInputKey(inputIdx);
      let outputNode = CommGraph.mkOutputKey(perm.lut[inputIdx]);

      function isInTermPair(node: string) {
        return node === inputNode || node === outputNode;
      }

      this.graph.forEachEdge((edge, attribs) => {
        let edgeKey = mkEdgeVarKey(edge, inputIdx);
        let binEqnKey = pathMod(edge + "-b-eqn", inputIdx);

        variables[edgeKey] = { "objective": 0 };
        variables[edgeKey][binEqnKey] = 1;

        ints[edgeKey] = 1;
        constraints[binEqnKey] = { "max": 1 };
      });

      // Add the edge inequalities.
      let doIncidentCoeffs = (eqnKey: string, edge: string|undefined, node: string) => {
        if (isInTermPair(node)) {
          constraints[eqnKey]["min"]!--;
        }

        this.graph.forEachEdge(node, (atEdge, atAttrs, atSource, atTarget) => {
          if (edge !== atEdge) {
            let incEdgeKey = mkEdgeVarKey(atEdge, inputIdx);
            if (!variables[incEdgeKey][eqnKey]) {
              variables[incEdgeKey][eqnKey] = 0;
            }
            variables[incEdgeKey][eqnKey]++;
          }
        });
      }

      this.graph.forEachEdge((edge, attrs, source, target) => {
        let edgeKey = mkEdgeVarKey(edge, inputIdx);
        let eqnKey = pathMod(edge + "-e-eqn", inputIdx);
        variables[edgeKey][eqnKey] = -2;
        constraints[eqnKey] = { "min": 0 };

        doIncidentCoeffs(eqnKey, edge, source);
        doIncidentCoeffs(eqnKey, edge, target);
      });

      // Add the cycle-valence bounds for the nodes.
      function mkVertEqnKey(node: string) {
        return pathMod(node + "-v-eqn", inputIdx);
      }

      this.graph.forEachNode((node, attribs) => {
        let eqnKey = mkVertEqnKey(node);

        constraints[eqnKey] = { "max": isInTermPair(node) ? 1 : 2 };

        this.graph.forEachEdge(node, (atEdge, atAttrs, atSource, atTarget) => {
          let edgeKey = mkEdgeVarKey(atEdge, inputIdx);
          variables[edgeKey][eqnKey] = 1;
        });
      });

      // Add equations for the augmentation edge. These n equations are the only part of
      // the system that are sensitive to the permutation.
      for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
        let eqnKey = pathMod(inputIdx.toString() + "-perm-eqn", inputIdx);

        constraints[eqnKey] = { "min": 0 };
        doIncidentCoeffs(eqnKey, undefined, inputNode);
        doIncidentCoeffs(eqnKey, undefined, outputNode);
        constraints[eqnKey] = { "min": 2 };
      }
    }

    // Add vertex-disjointness constraints for all the paths.
    this.graph.forEachNode((node, attribs) => {
      let eqnKey = node + "-dj-eqn";

      constraints[eqnKey] = { "max": attribs.type === GraphNodeType.Internal ? 2 : 1 };

      this.graph.forEachEdge(node, (atEdge, atAttrs, atSource, atTarget) => {
        for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
          let edgeKey = mkEdgeVarKey(atEdge, inputIdx);
          variables[edgeKey][eqnKey] = 1;
        }
      });
    });

    const model = {
      optimize: 'objective',
      opType: 'min',
      constraints,
      variables,
      ints
    };

    printLPModel(model as LPModel);

    const result = solver.Solve(model);
    console.log(result);

    if (!result.feasible) {
      return null;
    }

    // Else, reconstruct the paths in a more user-friendly format.

    let permutationPaths = [];
    for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
      let path: string[] = [CommGraph.mkInputKey(inputIdx)];
      // Each iteration of the loop adds one node to the path.
      for (;;) {
        // Find all edges incident w/ the last node in the path.
        let lastNode = path.at(-1) as string;

        if (this.graph.getNodeAttribute(lastNode, "type") === GraphNodeType.Output) {
          break;
        }

        let penultimateNode = path.at(-2);

        for (let atEdge of this.graph.edges(lastNode)) {
          let edgeKey = mkEdgeVarKey(atEdge, inputIdx);

          // Check if the incident edge is in the subset.
          if (result[edgeKey] === 1) {
            let adjNode = this.graph.opposite(lastNode, atEdge);
            // Don't go back.
            if (adjNode !== penultimateNode) {
              path.push(adjNode);
              break;
            }
          }
        };
      }
      permutationPaths.push(path);
    }

    console.log(permutationPaths);

    return permutationPaths;
  }

  // string[] = Array of nodes.
  routeAllPermutations(): Map<string, string[][]> {
    if (this.useIlp) {
      return this.routeAllPermutationsIlp();
    } else {
      return this.routeAllPermutationsBruteForce();
    }
  }

  routeAllPermutationsIlp(): Map<string, string[][]> {
    let routingLut = new Map<string, string[][]>();
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

  routeAllPermutationsBruteForce(): Map<string, string[][]> {
    // Indexed by stringified permutation luts.
    let routingLut = new Map<string, string[][]>();
    let edges = this.graph.edges();
    // Build a mapping from edgeKey → index
    let edgeIndexMap: Map<string, number> = new Map();
    edges.forEach((edgeKey, idx) => {
      edgeIndexMap.set(edgeKey, idx);
    });
    foreachNaryString(edges.length, 2, (edgeSubset: Array<number>) => {
      // TODO(optimize): We don't need a full recomputation of the valences here.
      let valences = this.hasNoValence3Nodes(edges, edgeSubset);
      if (!valences) {
        return false;
      }

      // This is a special subgraph, it is a collection of vertex-disjoint paths.

      // Make sure the input and output nodes are terminal and being connected.
      for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
        if (valences.get(CommGraph.mkInputKey(inputIdx)) !== 1) {
          return false;
        }
      }

      for (let outputIdx = 0; outputIdx < this.ioHeight; outputIdx++) {
        if (valences.get(CommGraph.mkOutputKey(outputIdx)) !== 1) {
          return false;
        }
      }

      // Let's simultaneously record the route in a more user-friendly format, and find out
      // if it corresponds to a permutation. (We still have the possibility of input paths not reaching outputs)
      let permutationLut = [];
      let permutationPaths = [];
      for (let inputIdx = 0; inputIdx < this.ioHeight; inputIdx++) {
        let path: string[] = [CommGraph.mkInputKey(inputIdx)];
        // Each iteration of the loop adds one node to the path.
        for (;;) {
          // Find all edges incident w/ the last node in the path.
          let lastNode = path.at(-1) as string;
          let penultimateNode = path.at(-2);

          let foundNewPathNode = false;
          for (let incidentEdge of this.graph.edges(lastNode)) {
            // Check if the incident edge is in the subset.
            if (edgeSubset[edgeIndexMap.get(incidentEdge)!]) {
              let adjNode = this.graph.opposite(lastNode, incidentEdge);
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
          let node = CommGraph.mkOutputKey(outputIdx);
          let lastNode = path.at(-1) as string;
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

  getNextId() {
    return this.nextId++;
  }

  /*
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
  }*/

  nextId: number;

  ioHeight: number;

  graph: Graph<CommGraphNode>;

  numGuidelines: number;

  // For every perm.lut.toString(), we get a table mapping input indices to node arrays.
  routingLut: Map<string, string[][]>;

  useIlp: boolean;
}
