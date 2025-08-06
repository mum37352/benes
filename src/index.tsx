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

                At this moment, there are test pages on <a href="benes.html">Beneš nets</a>, <a href="construction.html">communication network construction</a> and <a href="reconstruction.html">the <KI>{"\\mathsf{3Assignment} \\to \\mathsf{Clique}"}</KI> reduction</a>.
            </div>
            
            <div>

                There is also the <a href="article.html">article itself</a>.
            </div>
        </PrimeReactProvider>
    </React.StrictMode>
);
