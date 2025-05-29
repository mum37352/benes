import React from 'react';
import ReactDOM from 'react-dom/client';

import '@/styles/index.css';

import { useState } from "react";
import BenesNet from "./BenesNet";
import NoSsr from "../common/NoSsr";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { PrimeReactProvider } from 'primereact/api';
import "primereact/resources/themes/lara-dark-teal/theme.css";
import "primereact/resources/primereact.css";
import { InputSwitch, InputSwitchChangeEvent } from "primereact/inputswitch";
import { SelectButton } from "primereact/selectbutton";
import { initMacros, KI } from "../common/katex";
import { inputColor, outputColor } from "../common/Colors";

function Main() {
  let [benesOrder, setBenesOrder] = useState(3);
  let [vertical, setVertical] = useState(true);
  let [doRouting, setDoRouting] = useState(false);
  let [drawBoxes, setDrawBoxes] = useState(true);
  let [bipartiteColors, setBipartiteColors] = useState(false);
  let [dottedLines, setDottedLines] = useState(false);

  return <Splitter className="h-dvh w-full">
    <SplitterPanel size={75} className="overflow-hidden">
      <BenesNet order={benesOrder} vertical={vertical} doRouting={doRouting} drawBoxes={drawBoxes} bipartiteColors={bipartiteColors} dottedLines={dottedLines} />
    </SplitterPanel>
    <SplitterPanel size={25} className="">
      <div className="pl-7 pr-7 space-y-4 overflow-scroll">
        <h1 className="text-xl font-bold my-4 font-italic">Beneš {doRouting ? "Routing" : "Nets"}</h1>

        <p>
          This is an interactive demo of the so-called <a target="_blank" rel="noopener noreferrer" className="underline text-sky-300 hover:text-sky-200" href="https://eng.libretexts.org/Bookshelves/Computer_Science/Programming_and_Computation_Fundamentals/Mathematics_for_Computer_Science_(Lehman_Leighton_and_Meyer)/02%3A_Structures/10%3A_Communication_Networks/10.09%3A_Benes_Network">Beneš networks</a>.
        </p>

        <p>
        They have <span style={{color: inputColor}}><KI>n</KI> "input nodes"</span> and <span style={{color: outputColor}}><KI>n</KI> "output nodes"</span> (indicated as big circles). In total, they have <KI>2 n \log n</KI> nodes and a maximum degree of <KI>4</KI>.
        </p>

        <p>
          They have a recursive structure, as indicated by the boxes. That is why <KI>n=2^k</KI> is a power of two. We refer to <KI>k</KI> as the order.
        </p>

        {/* Comment out the switch for drawing the boxes.*/ /*

        <div className="text-sm">
          <label className="block mb-1 font-bold" htmlFor="vertical">Draw boxes:</label>
          <InputSwitch checked={drawBoxes} onChange={(e) => setDrawBoxes(e.value)} />
        </div>
        */}
        
        <div className="text-sm">
          <label className="block mb-1 font-bold" htmlFor="benesOrder">Order <KI>k</KI>:</label>


          <InputNumber className="w-full" name="benesOrder" value={benesOrder} onValueChange={(e: InputNumberValueChangeEvent) => {
            let val = e.value;
            if (val && !isNaN(val)) {
              setBenesOrder(val)
            }
          }} mode="decimal" showButtons min={1} max={6} />
        </div>
        <div className="text-sm">
          <label className="block mb-1 font-bold" htmlFor="vertical">Layout direction:</label>

          <SelectButton className="w-full" value={vertical ? "Vertical" : "Horizontal"} onChange={(e: any) => setVertical(e.value == "Vertical")} options={["Vertical", "Horizontal"]} />
        </div>


        <p>
        Beneš nets satisfy the following property: Any bijection <KI>\pi \in S_n</KI> from its <span style={{color: inputColor}}><KI>n</KI> input nodes</span> to its <span style={{color: outputColor}}><KI>n</KI> output nodes</span> can be realized by vertex-disjoint paths.
        Try it!
        </p>

        <div className="text-sm">
          <label className="block mb-1 font-bold" htmlFor="vertical">Show routes:</label>
          <InputSwitch checked={doRouting} onChange={(e) => setDoRouting(e.value)} />
        </div>

        {doRouting &&
        <><p>
        Click on any prescription arrow <KI>{"\\mapsto"}</KI> and drag it to configure the bijection <KI>\pi</KI>.
      </p>

      <div className="text-sm">
        <label className="block mb-1 font-bold" htmlFor="vertical">Path coloring:</label>

        <SelectButton className="w-full" value={bipartiteColors ? "Bipartite" : "Pathwise"} onChange={(e: any) => setBipartiteColors(e.value == "Bipartite")} options={["Bipartite", "Pathwise"]} />
      </div>

      
      <div className="text-sm">
        <label className="block mb-1 font-bold" htmlFor="vertical">Lines:</label>

        <SelectButton className="w-full" value={dottedLines ? "Dotted" : "Simple"} onChange={(e: any) => setDottedLines(e.value == "Dotted")} options={["Simple", "Dotted"]} />
      </div>
        </>

        }

      
      </div>
    </SplitterPanel>
  </Splitter>;
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

initMacros();
root.render(
  <React.StrictMode>
      <PrimeReactProvider>
        <Main />
      </PrimeReactProvider>
  </React.StrictMode>
);
