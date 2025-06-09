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

function Main()
{
  let [ioHeight, setIoHeight] = useState<number>(4);
  let [perms, setPerms] = useState<Permutation[]>(allPerms(ioHeight));

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

  useLayoutEffect(() => {
    let sim = d3.forceSimulation(graph.nodes)

    sim.on("tick", ticked);
    sim.force("charge", d3.forceManyBody());
    sim.force("springs", d3.forceLink(graph.edges))

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

  for (let perm of perms) {
    console.log(perm.toString());
    permCards.push(
      <div className="w-full h-96 pointer-events-none">
        <Construction graph={graph} ioHeight={ioHeight} perm={perm} />
      </div>
    );
  }

  return <Splitter className="h-dvh w-full" ref={ref}>
    <SplitterPanel size={60} className="overflow-hidden">
      <div className="w-full h-full">
        <GraphToolbar mode={mode} action={action} onChange={(mode, action) => {
          setMode(mode);
          setAction(action);
        }} />
        <Construction mode={mode} action={action} graph={graph} perm={null} ioHeight={ioHeight} onChange={reheat} />
      </div>
    </SplitterPanel>
    <SplitterPanel size={40} className="">
      <div className="overflow-auto w-full">
        <InputNumber className="" name="benesOrder" value={ioHeight} onValueChange={(e: InputNumberValueChangeEvent) => {
          let val = e.value;
          if (val && !isNaN(val)) {
            setIoHeight(val)
          }
        }} mode="decimal" showButtons min={1} max={5} />

        <h1>Permutations</h1>

        {permCards}
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
