import React, { useLayoutEffect, useReducer, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import '@/styles/index.css';
import { useState } from "react";
import BenesNet from "../route-benes/BenesNet";
import NoSsr from "../common/NoSsr";
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
import GraphToolbar, { ConstructionAction, ConstructionMode } from './Toolbar';
import { Graph, GraphNode } from './Graph';
import * as d3 from "d3";
import { Card } from 'primereact/card';
import { Check, X } from 'lucide-react';



function Main()
{
  let [ioHeight, setIoHeight] = useState<number>(4);
  let [perms, setPerms] = useState<Permutation[]>(allPerms(ioHeight));
  let [perm, setPerm] = useState<Permutation>(new Permutation([...Array(ioHeight).keys()]));

  let [numGuidelines, setNumGuidelines] = useState<number>(4);

  let [mode, setMode] = useState<ConstructionMode>('nodes');
  let [action, setAction] = useState<ConstructionAction>('insert');

  // TODO: This will execute the constructor every time we render.
  let [graph, setGraph] = useState<Graph>(new Graph(ioHeight));

  let [simulation, setSimulation] = useState<d3.Simulation<GraphNode, undefined>>();

  let [, forceUpdate] = useReducer(x => x + 1, 0);

  let ref = useRef(null);

  function ticked() {
    forceUpdate();
  }

  function drawPermList(perm: Permutation, perms: Permutation[]) {
    let items = perms.map((atPerm) => (
      <div className={`text-center w-full cursor-pointer rounded-lg p-1 shadow-md hover:shadow-xl active:bg-gray-900 hover:bg-gray-400/10 transition text-white
            ${atPerm.lut.toString() === perm.lut.toString()
          ? "bg-gray-700"
          : "bg-gray-700/10"}
            ${graph.routingLut.get(atPerm.lut.toString()) ? "" : "border border-red-500"}
          `}
        onClick={() => setPerm(atPerm)}
        key={atPerm.lut.toString()}>
        <KI>{atPerm.toLatex()}</KI>
      </div>));

      return <div className="grid grid-cols-[repeat(auto-fit,_minmax(150px,_1fr))] gap-4 p-4">
        {items}
      </div>
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

  function reheat() {
    simulation?.nodes(graph.nodes).alpha(1).restart();
    forceUpdate();
  }

  // HACK: Have some default value for our graph.
  if (graph.edges.length === 0) {
    let graph = Graph.makeCompleteBipartiteGraph(ioHeight);
    setGraph(graph);
  }

  let permCards: React.JSX.Element[] = [];

  for (let atPerm of perms) {
    permCards.push(
      <div className={`h-64 cursor-pointer rounded-lg p-1 shadow-md hover:shadow-xl active:bg-gray-900 hover:bg-gray-400/10 transition text-white
            ${atPerm.lut.toString() === perm.lut.toString()
              ? "bg-gray-700"
              : "bg-gray-700/10"}
            ${graph.routingLut.get(atPerm.lut.toString()) ? "":"border border-red-500"}
          `}
          onClick={() => setPerm(atPerm)}
          key={atPerm.lut.toString()}>
        <Construction graph={graph} ioHeight={ioHeight} perm={atPerm} />
      </div>
    );
  }

  let goodPerms = [];
  let badPerms = [];
  for (let atPerm of perms) {
    let routing = graph.routingLut.get(atPerm.lut.toString());

    if (routing) {
      goodPerms.push(atPerm);
    } else {
      badPerms.push(atPerm);
    }
  }

  return <Splitter className="h-dvh w-full" ref={ref}>
    <SplitterPanel size={60} className="overflow-hidden">
      <div className="w-full h-full">
        <GraphToolbar mode={mode} action={action} onChange={(mode, action) => {
          setMode(mode);
          setAction(action);
        }} />
        <Construction mode={mode} action={action} graph={graph} perm={perm} ioHeight={ioHeight} onChange={reheat} onPermChanged={setPerm} />
      </div>
    </SplitterPanel>
    <SplitterPanel size={40} className="">
      <div className="pl-7 pr-7 space-y-4 overflow-auto">
        <h1 className="text-xl font-bold my-4 font-italic">Communication Network Construction</h1>

        <p>
          A communication network is an undirected, simple graph; but with special nodes: <span style={{ color: inputColor }}><KI>n</KI> "input nodes"</span> and <span style={{ color: outputColor }}>"output nodes"</span>
        </p>

        <p>
          We refer to <KI>n</KI> as the height of the communication network.
        </p>

        <p>
          Any bijection <KI>\pi \in S_n</KI> from its <span style={{color: inputColor}}><KI>n</KI> input nodes</span> to its <span style={{color: outputColor}}><KI>n</KI> output nodes</span> can be realized by vertex-disjoint paths.
          A set of such paths(or routes) is called a routing. You can click and drag the permutation arrows to modify the permutation, or alternatively, dial one of the permutations in the list below. Try it!
        </p>

        <div className="text-sm">
          <label className="block mb-1 font-bold" htmlFor="inputHeight">Height <KI>n</KI>:</label>

          <InputNumber className="" name="inputHeight" value={ioHeight} onValueChange={(e: InputNumberValueChangeEvent) => {
            let val = e.value;
            if (val && !isNaN(val)) {
              setIoHeight(val)
            }
          }} mode="decimal" showButtons min={1} max={5} />
        </div>

        <p>
          This playground lets you construct "good" communication networks (Even though it may be a good warm-up to construct a bad one first.)
          Your current network has <KI>{`${graph.nodes.length} \\geq 2n=${2*ioHeight}`}</KI> nodes and <KI>{`${graph.edges.length}`}</KI> edges.
        </p>

        <p>
          For convenience, nodes snap to vertical equispaced guidelines. You can set the number of guidelines below.
        </p>
        
        <div className="text-sm">
          <label className="block mb-1 font-bold" htmlFor="inputHeight">Number of guidelines:</label>

          <InputNumber className="" name="inputHeight" value={numGuidelines} onValueChange={(e: InputNumberValueChangeEvent) => {
            let val = e.value;
            if (val && !isNaN(val)) {
              setNumGuidelines(val)
            }
          }} mode="decimal" showButtons min={1} max={8} />
        </div>

        <span className="text-sm mb-1 flex row font-bold">
          <X className="text-red-500" /> Unroutable permutations:
        </span>
        {badPerms.length > 0 ? drawPermList(perm, badPerms) : "None!"}

        <span className="text-sm flex row mb-1 font-bold">
          <Check className="text-green-500" /> Routable permutations:
        </span>
        {goodPerms.length > 0 ? drawPermList(perm, goodPerms) : "None, get to work!"}
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
