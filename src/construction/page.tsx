import React from 'react';
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
import GraphToolbar from './Toolbar';

function Main()
{
  let [ioHeight, setIoHeight] = useState<number>(4);
  let [perms, setPerms] = useState<Permutation[]>(allPerms(ioHeight));

  let permCards: React.JSX.Element[] = [];

  for (let perm of perms) {
    console.log(perm.toString());
    permCards.push(
      <div className="w-full h-96 pointer-events-none">
        <Construction ioHeight={ioHeight} perm={perm} />
      </div>
    );
  }

  let startContent = <>

  </>

  return <Splitter className="h-dvh w-full">
    <SplitterPanel size={60} className="overflow-hidden">
      <div className="w-full h-full">
        <GraphToolbar onChange={(mode, action) => {
          console.log(mode, action);
        }} />
        <Construction perm={null} ioHeight={ioHeight} />
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

        <div>Click and drag to move nodes, Ctrl-Click to add nodes, Alt-Click to add edges.

          </div>
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
