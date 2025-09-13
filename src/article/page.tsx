import React, { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import '@/styles/index.css';
import '@/styles/stackedit.css';
import { marked, MarkedExtension, Token } from 'marked';
import linkupMd from "./linkup.md";
import { initMacros, KB, KI } from '@/common/katex';
import { ChevronsRight } from 'lucide-react';
import { Strong, Section, SubSection, TaggedBox, Title } from '@/common/ui';
import { ReductionApplet } from '@/reduction/applet';


let mathExtension: MarkedExtension = {
  extensions: [
    {
      name: 'inlineMath',
      level: 'inline',
      start(src: string) { return src.match(/\$/)?.index; },
      tokenizer(src: string) {
        const match = src.match(/^\$([^\$]+)\$/);
        if (match) {
          return {
            type: 'inlineMath',
            raw: match[0],
            text: match[1].trim()
          };
        }
      }
    },
    {
      name: 'blockMath',
      level: 'block',
      start(src: string) { return src.match(/\$\$/)?.index; },
      tokenizer(src: string) {
        const match = src.match(/^\$\$([^$]+)\$\$/m);
        if (match) {
          return {
            type: 'blockMath',
            raw: match[0],
            text: match[1].trim()
          };
        }
      }
    },
    
    {
      name: 'applet',
      level: 'block',
      start(src: string) { return src.match(/\$\$/)?.index; },
      tokenizer(src: string) {
        let match = src.match(/^%%Applet:([A-Za-z0-9_-]+)%%/);
        if (match) {
          return {
            type: 'applet',
            raw: match[0],
            text: match[1].trim()
          };
        }
      }
    }
  ]
};
marked.use(mathExtension);

function parseMd() {
  let markdown = linkupMd.replace(/^\uFEFF/, ''); // remove BOM if present
  let tokens = marked.lexer(markdown);
  console.log(tokens);
  return tokens;
}

let tokens = parseMd();

const root = ReactDOM.createRoot(document.getElementById('root')!);


function Theorem({ id, name, children } : { id : string, name : React.ReactNode, children : React.ReactNode }) {
  return <TaggedBox tag={<ChevronsRight className="w-6"/>}>
    <div className={`text-2xl mb-1 mt-0 font-bold px-2 py-1`}>{name}</div>
    <hr />
    <div className="mt-2">
    {children}
    </div>
  </TaggedBox>;
}

function Abstract() {
  return <TaggedBox className="mb-10" tag={<>Abstract</>}>
We continue our discussion of basic properties of topological groups initiated in Talk 1.
  <br/>
The most notable results will be the <a href="#thm-openmap">open mapping theorem</a>, a useful criterion for checking if a topological group morphism is open; 
we will also study an important property of the circle group <KI>\T</KI> and the real line <KI>\R</KI> -- <Strong>divisibility</Strong>
(<a href="#sec-divgrp">Section ?</a>); and finally,
we will <Strong>classify</Strong> some of the <Strong>topological groups</Strong> that <q>look like</q> <KI>(\R^n, +)</KI> locally <a href="#thm-class-euclid">Theorem ?</a>
<br/>
Furthermore, we will deliver some results on the behavior of local compactness, products and quotients.
  </TaggedBox>
}

function MdTokens({ tokens }: { tokens: Token[] }) {
  let renderList: any = [];
  for (let token of tokens) {
    if (token.type === "heading") {
      if (token.depth === 1) {
        renderList.push(<h1><MdTokens tokens={token.tokens!} /></h1>);
      } else if (token.depth === 2) {
        renderList.push(<h2><MdTokens tokens={token.tokens!} /></h2>);
      } else if (token.depth === 3) {
        renderList.push(<h3><MdTokens tokens={token.tokens!} /></h3>);
      }
    } else if (token.type === "text") {
      renderList.push(<span className="whitespace-normal">{token.text}</span>);
    } else if (token.type === "paragraph") {
      renderList.push(<p className='whitespace-nowrap'><MdTokens tokens={token.tokens!} /></p>);
    } else if (token.type === "strong") {
      renderList.push(<strong><MdTokens tokens={token.tokens!} /></strong>);
    } else if (token.type === "em") {
      renderList.push(<em><MdTokens tokens={token.tokens!} /></em>);
    } else if (token.type === "inlineMath") {
      renderList.push(<span className="text-sm"><KI>{token.text}</KI></span>);
    } else if (token.type === "blockMath") {
      renderList.push(<KB>{token.text}</KB>);
    } else if (token.type === "blockquote") {
      renderList.push(<blockquote>
        <MdTokens tokens={token.tokens!} />
      </blockquote>);
    } else if (token.type === "list") {
      renderList.push(<ul className="list-disc pl-5"><MdTokens tokens={token.items} /></ul>);
    } else if (token.type === "list_item") {
      let tokens = marked.lexer(token.text);
      renderList.push(<li><MdTokens tokens={tokens} /></li>);
    } else if (token.type === "applet") {
      if (token.text === "reduction") {
        renderList.push(<ReductionApplet />);
      } else {
        renderList.push(
          <iframe src={`https://mum37352.github.io/benes/${token.text}.html`} width="100%"
            height="500"
            frameBorder="0"
            allowFullScreen></iframe>
        );
      }
    }
  }

  return <>{renderList}</>
}

function MdArticle() {
  return <MdTokens tokens={tokens} />
}


// Disable for now. My macros break KaTeX's \neq (eyeroll), no idea why
//initMacros();
root.render(
  <React.StrictMode>
    <div className="stackedit__html !box-content">
      <MdArticle />
    </div>
  </React.StrictMode>
);
