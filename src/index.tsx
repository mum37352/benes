import React from 'react';
import ReactDOM from 'react-dom/client';

import '@/styles/index.css';
import { initMacros, KI } from './common/katex';
import { PrimeReactProvider } from 'primereact/api';


const root = ReactDOM.createRoot(document.getElementById('root')!);

initMacros();
root.render(
    <React.StrictMode>
        <PrimeReactProvider>
            <div>

                At this moment, there are test pages on <a href="benes.html">Beneš nets</a>, <a href="construction.html">communication network construction</a> and <a href="article.html">the <KI>{"\\mathsf{3Assignment} \\to \\mathsf{Clique}"}</KI> reduction</a>.
            </div>
        </PrimeReactProvider>
    </React.StrictMode>
);
