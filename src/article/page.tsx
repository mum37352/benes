import React, { useLayoutEffect, useReducer, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import '@/styles/index.css';
import { useState } from "react";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { PrimeReactProvider } from 'primereact/api';
import "primereact/resources/themes/lara-dark-teal/theme.css";
import Permutation, { allPerms } from "../common/Permutation";
import * as d3 from "d3";
import { Check, Frame, X } from 'lucide-react';
import { ProgressBar } from 'primereact/progressbar';
import GraphEditor from './GraphEditor';
import { ColGraph, GraphNode } from './Graph';
import { GraphToolbar, ToolSel } from '@/common/Toolbar';
import { KB, KI } from '@/common/katex';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
import BenesNet from '@/route-benes/BenesNet';
import CompatibilityGraph from './CompatibilityGraph';

type Config = {
  graph: ColGraph
}

function configFromCliqueSize(cliqueSize: number): Config {
  return {
    graph: new ColGraph(cliqueSize)
  }
}



function Main()
{
  let [config, setConfig] = useState<Config>(() => configFromCliqueSize(3));
  let graph = config.graph;

  let [tool, setTool] = useState<ToolSel>('insert');

  let [simulation, setSimulation] = useState<d3.Simulation<GraphNode, undefined>>();

  let [, forceUpdate] = useReducer(x => x + 1, 0);
  let [graphVersion, bumpGraphVersion] = useReducer(x => x + 1, 0);

  let ref = useRef(null);

  function ticked() {
    forceUpdate();
  }

  useLayoutEffect(() => {
    let sim = d3.forceSimulation(graph.nodes)

    sim.on("tick", ticked);
    sim.force("charge", d3.forceManyBody());
    sim.force("springs", d3.forceLink(graph.edges));
    sim.force("x", d3.forceX());
    sim.force("y", d3.forceY());

    setSimulation(sim);
  }, [ref]);

  function reheat(graph: ColGraph) {
    simulation?.nodes(graph.nodes).alpha(1).restart();
    forceUpdate();
    bumpGraphVersion();
  }

  let divRef = useRef<HTMLDivElement>(null);

  return <Splitter className="h-dvh w-full" ref={ref}>
    <SplitterPanel size={30} className="overflow-hidden">
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
        <KB>G</KB>
        <div className="flex-1">
          <GraphEditor tool={tool} graph={graph} onChange={reheat} />
        </div>
      </div>
    </SplitterPanel>
    <SplitterPanel size={30} className="overflow-hidden">
      <div ref={divRef} className="flex flex-col w-full h-full">
        <KB>{"G'"}</KB>
        <div className="flex-1">
          <CompatibilityGraph graph={graph} graphVersion={graphVersion} />
        </div>
      </div>
    </SplitterPanel>
    <SplitterPanel size={20} className="">
      <div className="pl-7 pr-7 space-y-4 overflow-auto">
        <h1 className="text-xl font-bold my-4 font-italic">Cliques</h1>

        <div className="text-sm">
          <label className="block mb-1 font-bold" htmlFor="inputHeight">Clique-size <KI>k</KI>:</label>

          <InputNumber className="" name="inputHeight" value={config.graph.cliqueSize} onValueChange={(e: InputNumberValueChangeEvent) => {
            let val = e.value;
            if (val && !isNaN(val)) {
              config.graph.cliqueSize = val;
              setConfig({...config});
              reheat(config.graph);
            }
          }} mode="decimal" showButtons min={1} max={5} />
        </div>

        <p>
        Now, we transform such an assignment problem instance <KI>G</KI> into an equivalent <KI>k</KI>-clique instance <KI>G'</KI> with approximately <KI>{"3^{n / k}"}</KI> vertices. An <KI>{"n^{o(k)}"}</KI>-time algorithm for <KI>k</KI>-clique would then imply a <KI>{"2^{o(n)}"}</KI>-time algorithm for the assignment problem, which is too fast in view of the lower bound above. We obtain <KI>G'</KI> as follows from <KI>G</KI>:
        
        </p>
        <ul>
          <li>
            <KI>V(G)</KI> is divided equitably into <em>blocks</em> <KI>V_1, \ldots, V_k</KI> of size at most <KI>{`\\lceil n/k\\rceil`}</KI> each. The resulting graph depends on our choice of blocks, but any choice is fine.
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
