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
import Construction from "./Construction";
import Permutation, { allPerms } from "../common/Permutation";
import { inputColor, outputColor } from "../common/Colors";
import { Toolbar } from 'primereact/toolbar';
import { ConstructionAction, ConstructionMode, GraphToolbar, GraphToolbarPanel, ToolSel } from '../common/Toolbar';
import { CommGraph, CommGraphNode } from './CommGraph';
import * as d3 from "d3";
import { Card } from 'primereact/card';
import { Check, X } from 'lucide-react';
import { ProgressBar } from 'primereact/progressbar';

type Config = {
  ioHeight: number,
  perms: Permutation[],
  selPerm: Permutation,
  graph: CommGraph
}

function configFromIoHeight(ioHeight: number): Config {
  return {
    ioHeight,
    perms: allPerms(ioHeight),
    selPerm: new Permutation([...Array(ioHeight).keys()]),
    graph: CommGraph.makeCompleteBipartiteGraph(ioHeight)
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

      return <div className="grid grid-cols-[repeat(auto-fit,_minmax(50px,_1fr))] gap-4 p-4">
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

  let [simulation, setSimulation] = useState<d3.Simulation<CommGraphNode, undefined>>();

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

  function reheat(graph: CommGraph) {
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

  return <Splitter className="h-dvh w-full" ref={ref}>
    <SplitterPanel size={60} className="overflow-hidden">
      <GraphToolbarPanel activeTool={tool} onChange={setTool}>
        
        <div className="flex-1">
          <Construction tool={tool} graph={graph} perm={config.selPerm} onChange={reheat} onPermChanged={(newPerm) => setConfig({ ...config, selPerm: newPerm })} />
        </div>
      </GraphToolbarPanel>
    </SplitterPanel>
    <SplitterPanel size={40} className="">
      <div className="pl-7 pr-7 space-y-4 overflow-auto">
        <h1 className="text-xl font-bold my-4 font-italic">Communication Network Construction</h1>

        <div className="text-sm">
          <label className="block mb-1 font-bold" htmlFor="vertical">Routing:</label>

          <SelectButton className="w-full" value={graph.useIlp ? "ILP" : "Brute-Force"} onChange={(e: any) => {graph.useIlp = (e.value == "ILP"); setConfig({...config});}} options={["ILP", "Brute-Force"]} />
        </div>

        <p>
          A communication network is an graph with special nodes: <span style={{ color: inputColor }}><KI>n</KI> "input nodes"</span> and <span style={{ color: outputColor }}>"output nodes"</span>
        </p>

        <p>
          We refer to <KI>n</KI> as the height of the communication network.
        </p>

        <p>
          We say it is uncongested if any bijection <KI>\pi \in S_n</KI> from its <span style={{color: inputColor}}><KI>n</KI> input nodes</span> to its <span style={{color: outputColor}}><KI>n</KI> output nodes</span> can be realized by vertex-disjoint paths.
          A set of such paths(or routes) is called a routing. You can click and drag the permutation arrows to modify the permutation, or alternatively, dial one of the permutations in the list below. Try it!
        </p>

        <div className="text-sm">
          <label className="block mb-1 font-bold" htmlFor="inputHeight">Height <KI>n</KI>:</label>

          <InputNumber className="" name="inputHeight" value={config.ioHeight} onValueChange={(e: InputNumberValueChangeEvent) => {
            let val = e.value;
            if (val && !isNaN(val)) {
              let newConfig = configFromIoHeight(val);
              setConfig(newConfig);
              reheat(newConfig.graph);
            }
          }} mode="decimal" showButtons min={1} max={5} />
        </div>

        <p>
          This playground lets you construct "good" uncongested communication networks (Even though it may be a good warm-up to construct a bad one first.)
          Your current network has <KI>{`${graph.nodes.length} \\geq 2n=${2*config.ioHeight}`}</KI> nodes and <KI>{`${graph.edges.length}`}</KI> edges.
        </p>

        <p>
          For convenience, nodes snap to vertical equispaced guidelines. You can set the number of guidelines below.
        </p>
        
        <div className="text-sm">
          <label className="block mb-1 font-bold" htmlFor="inputHeight">Number of guidelines:</label>

          <InputNumber className="" name="inputHeight" value={graph.numGuidelines} onValueChange={(e: InputNumberValueChangeEvent) => {
            let val = e.value;
            if (val && !isNaN(val)) {
              graph.setNumGuidelines(val);
              reheat(graph);
              setConfig({...config});
            }
          }} mode="decimal" showButtons min={1} max={8} />
        </div>

        <PermLists config={config} setConfig={setConfig} />
        </div>
    </SplitterPanel>
  </Splitter>;
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

initMacros();
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
