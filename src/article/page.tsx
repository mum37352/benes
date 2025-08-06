import React, { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import '@/styles/index.css';
import { PrimeReactProvider } from 'primereact/api';
import "primereact/resources/themes/lara-dark-teal/theme.css";
import { marked } from 'marked';
import linkupMd from "./linkup.md";

const root = ReactDOM.createRoot(document.getElementById('root')!);

function Main() {
  return <div>Hello World</div>;
}

function parseMd() {
  console.log(marked(linkupMd));
}

parseMd();

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
