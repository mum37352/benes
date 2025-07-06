import React, { useLayoutEffect, useReducer, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import '@/styles/index.css';
import { useState } from "react";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { PrimeReactProvider } from 'primereact/api';
import "primereact/resources/themes/lara-dark-teal/theme.css";
import { InputSwitch, InputSwitchChangeEvent } from "primereact/inputswitch";
import { SelectButton } from "primereact/selectbutton";
import { initMacros, KI } from "../common/katex";
import Construction from "../construction/Construction";
import Permutation, { allPerms } from "../common/Permutation";
import { inputColor, outputColor } from "../common/Colors";
import { Toolbar } from 'primereact/toolbar';
import { ConstructionAction, ConstructionMode, GraphToolbar, ToolSel } from '../construction/Toolbar';
import { Graph, GraphNode } from '../construction/Graph';
import * as d3 from "d3";
import { Card } from 'primereact/card';
import { Check, Frame, X } from 'lucide-react';
import { ProgressBar } from 'primereact/progressbar';

type Config = {
  ioHeight: number,
  perms: Permutation[],
  selPerm: Permutation,
  graph: Graph
}

function configFromIoHeight(ioHeight: number): Config {
  return {
    ioHeight,
    perms: allPerms(ioHeight),
    selPerm: new Permutation([...Array(ioHeight).keys()]),
    graph: new Graph(ioHeight)// Graph.makeCompleteBipartiteGraph(ioHeight) ///
  }
}

function PermLists({config, setConfig}: {config: Config, setConfig: Function} ) {
  let selPerm = config.selPerm;

  function drawPermList(perm: Permutation, perms: Permutation[]) {
    let items = perms.map((atPerm) => (
      <div className={`text-center w-full cursor-pointer rounded-lg p-1 shadow-md hover:shadow-xl active:bg-gray-900 hover:bg-gray-400/10 transition text-white
            ${atPerm.lut.toString() === perm.lut.toString()
          ? "bg-gray-700"
          : "bg-gray-700/10"}
            ${config.graph.routingLut.get(atPerm.lut.toString()) ? "" : "border border-red-500"}
          `}
        onClick={() => setConfig({...config, selPerm: atPerm})}
        key={atPerm.lut.toString()}>
        <KI>{atPerm.toLatex()}</KI>
      </div>));

      return <div className="grid grid-cols-[repeat(auto-fit,_minmax(150px,_1fr))] gap-4 p-4">
        {items}
      </div>
  }
  
  let goodPerms = [];
  let badPerms = [];
  for (let atPerm of config.perms) {
    let routing = config.graph.routingLut.get(atPerm.lut.toString());

    if (routing) {
      goodPerms.push(atPerm);
    } else {
      badPerms.push(atPerm);
    }
  }

  return <>
    <span className="text-sm mb-1 flex row font-bold">
      <X className="text-red-500" /> Unroutable permutations:
    </span>
    {selPerm && badPerms.length > 0 ? drawPermList(selPerm, badPerms) : "None!"}

    <span className="text-sm flex row mb-1 font-bold">
      <Check className="text-green-500" /> Routable permutations:
    </span>
    <div className="relative w-full">
      <ProgressBar value={100 * goodPerms.length / config.perms.length} className="h-6" showValue={false} />
      <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white drop-shadow-[0_0_2px_black]">
        <KI>{`${goodPerms.length} / ${config.perms.length}=${config.ioHeight}!`}</KI>
      </span>
    </div>
    {selPerm && goodPerms.length > 0 ? drawPermList(selPerm, goodPerms) : "None, get to work!"}
  </>;
}

function Main()
{
  let [config, setConfig] = useState<Config>(() => configFromIoHeight(3));
  let graph = config.graph;

  let [tool, setTool] = useState<ToolSel>('insert');

  let [simulation, setSimulation] = useState<d3.Simulation<GraphNode, undefined>>();

  let [, forceUpdate] = useReducer(x => x + 1, 0);

  let ref = useRef(null);

  function ticked() {
    forceUpdate();
  }

  useLayoutEffect(() => {
    let sim = d3.forceSimulation(graph.nodes)

    sim.on("tick", ticked);
    sim.force("charge", d3.forceManyBody());
    sim.force("springs", d3.forceLink(graph.edges));
    sim.force("x", d3.forceX(graph.centerX()));
    sim.force("y", d3.forceY(graph.centerY()));

    setSimulation(sim);
  }, [ref]);

  function reheat(graph: Graph) {
    simulation?.nodes(graph.nodes).alpha(1).restart();
    forceUpdate();
  }

  // Old card rendering code (drew the entire graph).
  /*
  let permCards: React.JSX.Element[] = [];

  for (let atPerm of perms) {
    permCards.push(
      <div className={`h-64 cursor-pointer rounded-lg p-1 shadow-md hover:shadow-xl active:bg-gray-900 hover:bg-gray-400/10 transition text-white
            ${atPerm.lut.toString() === selPerm.lut.toString()
              ? "bg-gray-700"
              : "bg-gray-700/10"}
            ${graph.routingLut.get(atPerm.lut.toString()) ? "":"border border-red-500"}
          `}
          onClick={() => setSelPerm(atPerm)}
          key={atPerm.lut.toString()}>
        <Construction graph={graph} ioHeight={ioHeight} perm={atPerm} />
      </div>
    );
  }
    */
let divRef = useRef<HTMLDivElement>(null);

  return <Splitter className="h-dvh w-full" ref={ref}>
    <SplitterPanel size={60} className="overflow-hidden">
      <div ref={divRef} className="flex flex-col w-full h-full"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Control') {setTool("drag"); e.preventDefault();}
        if (e.key === 'Alt') {setTool("delete"); e.preventDefault();}
      }}
      onKeyUp={(e) => { setTool("insert");e.preventDefault();}}
      onMouseEnter={() => divRef.current?.focus()}
      onMouseLeave={() => divRef.current?.blur()}>
        <GraphToolbar activeTool={tool} onChange={setTool} />

        <div className="flex-1">
          <Construction tool={tool} graph={graph} perm={config.selPerm} onChange={reheat} onPermChanged={(newPerm) => setConfig({ ...config, selPerm: newPerm })} />
        </div>
      </div>
    </SplitterPanel>
    <SplitterPanel size={40} className="">
      <div className="pl-7 pr-7 space-y-4 overflow-auto">
        <h1 className="text-xl font-bold my-4 font-italic">Cliques</h1>

        <p>
        Now, we transform such a assignment problem instance <KI>G</KI> into an equivalent <KI>k</KI>-clique instance <KI>G'</KI> with approximately <KI>{"3^{n / k}"}</KI> vertices. An <KI>{"n^{o(k)}"}</KI>-time algorithm for $k$-clique would then imply a <KI>{"2^{o(n)}"}</KI>-time algorithm for the assignment problem, which is too fast in view of the lower bound above. We obtain <KI>G'</KI> as follows from <KI>G</KI>:
        
        </p>
        <ul>
          <li>
            <KI>V(G)</KI> is divided equitably into <em>blocks</em> <KI>V_1, \ldots, V_k</KI> of size at most <KI>\lceil n/k\rceil</KI> each. The resulting graph depends on our choice of blocks, but any choice is fine.
          </li>
          <li>
            For each proper <KI>3</KI>-assignment of <KI>V_i</KI>, we add a vertex of color <KI>i</KI> to the graph <KI>G'</KI>.
          </li>
          <li>
            Two vertices in <KI>G'</KI> are connected by an edge if their colorings are compatible, meaning they come from different blocks and together form a proper assignment.
          </li>
        </ul>
        
        <p>
In other words, we have created a <em>compatibility graph</em> <KI>G'</KI> on the partial assignments to individual blocks of <KI>G</KI>. This graph has at most  <KI>k 3^b</KI> vertices, where <KI>{"b = \\lceil n/k \\rceil"}</KI> is the maximum block size. The key observation is:
        </p>
        
        <div>
          The colorful <KI>k</KI>-cliques <KI>K</KI> in the compatibility graph <KI>G'</KI> correspond bijectively to proper assignments of the original graph <KI>G</KI>.
          </div>

<p>
Indeed, consider a clique <KI>K</KI> in the compatibility graph <KI>G'</KI>: Its vertices <KI>{"v_1,\\ldots,v_k"}</KI> provide a valid assignment for each block
 in <KI>G</KI>. Moreover, the presence of all edges <KI>{"v_i v_j"}</KI> with <KI>{"i \\neq j"}</KI> in <KI>K</KI> ensures 
 that the union of these partial assignments is a valid assignment of <KI>G</KI> as a whole. If there was a conflict in the union, then it would 
 stem from an edge between two different blocks in <KI>G</KI>, but our compatibility relation in <KI>G'</KI> rules this out. Conversely, every proper 
 assignment to <KI>G</KI> specifies a unique clique in <KI>G'</KI>.
</p>
        </div>
    </SplitterPanel>
  </Splitter>;
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Disable for now. My macros break KaTeX's \neq (eyeroll), no idea why
//initMacros();
root.render(
  <React.StrictMode>
      <PrimeReactProvider>
        {/* A fixed pos seems to be necessary to get rid of some strange scrollbars */}
        <div className="fixed flex overflow-hidden h-dvh w-full">
          <Main />
        </div>
      </PrimeReactProvider>
  </React.StrictMode>
);
