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

function Main()
{
  let [ioHeight, setIoHeight] = useState<number>(4);
  let [perms, setPerms] = useState<Permutation[]>(allPerms(ioHeight));
  let [perm, setPerm] = useState<Permutation>(new Permutation([...Array(ioHeight).keys()]));

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
    console.log(atPerm.toString());
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
      <div className="overflow-auto w-full">
        <InputNumber className="" name="benesOrder" value={ioHeight} onValueChange={(e: InputNumberValueChangeEvent) => {
          let val = e.value;
          if (val && !isNaN(val)) {
            setIoHeight(val)
          }
        }} mode="decimal" showButtons min={1} max={5} />

        <div className="grid grid-cols-[repeat(auto-fit,_minmax(300px,_1fr))] gap-4 p-4">
          {permCards}
        </div>
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
