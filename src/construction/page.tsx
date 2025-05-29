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

function Main()
{
  let [ioHeight, setIoHeight] = useState<number>(4);
  let [perms, setPerms] = useState<Permutation[]>(allPerms(3));

  let permCards: React.JSX.Element[] = [];

  for (let perm of perms) {
    console.log(perm.toString());
    permCards.push(
      <div>
        {perm.lut.toString()}
        <Construction ioHeight={ioHeight} />
      </div>
    );
  }

  return <Splitter className="h-dvh w-full">
    <SplitterPanel size={75} className="overflow-hidden">
      <div className="flex flex-col w-full">
        <div>
           <InputNumber className="w-full" name="benesOrder" value={ioHeight} onValueChange={(e: InputNumberValueChangeEvent) => {
            let val = e.value;
            if (val && !isNaN(val)) {
              setIoHeight(val)
            }
          }} mode="decimal" showButtons min={1} max={5} />
        </div>
        <Construction ioHeight={3} />
      </div>
    </SplitterPanel>
    <SplitterPanel size={25} className="">
      <div className="flex flex-col">
        Click and drag to move nodes, Ctrl-Click to add nodes, Alt-Click to add edges.

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
        <Main />
      </PrimeReactProvider>
  </React.StrictMode>
);
