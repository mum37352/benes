import React, { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import '@/styles/index.css';
import { marked } from 'marked';
import linkupMd from "./linkup.md";
import { initMacros, KB, KI } from '@/common/katex';
import { ChevronsRight } from 'lucide-react';

function parseMd() {
  let markdown = linkupMd.replace(/^\uFEFF/, ''); // remove BOM if present
  let tokens = marked.lexer(markdown);
  console.log(tokens);
  return tokens;
}

let tokens = parseMd();

export function TaggedBox({ tag, children, className } : { tag? : React.ReactNode, children : React.ReactNode, className? : string }) {
  return <div className={`relative shadow-lg border border-gray-200 rounded-lg p-3 m-2 ${className}`}>
    {tag && <div className="absolute text-2xl -left-5 -translate-x-full">{tag}</div>}
    {children}
  </div>;
}

export function Title({children} : {children : React.ReactNode}) {
  return <>
  <h1 className={`text-5xl font-bold mt-8 text-stone-800`}>{children}</h1>
  <hr className="h-px my-8 bg-gray-400 border-0 mb-14" />
  </>;
}


export function Section({children} : {children : React.ReactNode}) {
  return <>
  <h1 className={`text-3xl font-bold mt-14 mb-0 text-stone-800`}>{children}</h1>
  <hr className="h-px my-8 bg-gray-200 border-0 mt-2 mb-4 " />
  </>;
}

export function Strong({children} : {children : React.ReactNode}) {
  return <span className="text-stone-800 font-bold">{children}</span>;
}


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

function Article() {
  return (
    <>
    <Title>Topological Groups, Part II</Title>
    <Abstract />
      
We begin by harping a bit more on

    <Section>Unit Neighborhoods</Section>

    In our kick-off talk last week, we defined unit-neighborhoods in a topological group <KI>G</KI> as neighborhoods (which we do not require be open!) of the neutral element/unit/origin <KI>e \in G</KI>.
    <br/>
As we will see in this section, they provide a quick way of probing a topological group for a lot of properties. This section will be an (incomplete) assortment of some of those tests.
<br/>
It is good to think of these as the analogue of open balls in metric spaces. To make this parallel more precise, let <KI>V</KI> be a normed vectorspace and let <KB>{String.raw`B_\epsilon := \{x\in V : \|x\| < \epsilon\}`}</KB> denote an open <KI>\epsilon</KI>-ball around the origin. Then we have the

<Theorem name="Lemma: Ball test for open subsets" id="thm-ball-opensubs">
A subset <KI>U</KI> in <KI>V</KI> is open iff it can be expressed as a union of translates of the norm ball
<KB>{String.raw`U=\Cup_{v\in U}(v+B_{\epsilon(v)}),`}</KB>
for some collection of small <KI>{String.raw`\epsilon_v > 0, v \in V`}</KI> s.t. <KI>{String.raw`v+B_{\epsilon(v)} \subs U`}</KI>.
</Theorem>

<Section>Locally Isomorphic Groups</Section>
The torus <KI>\T^2</KI> and the Euclidean plane <KI>\R^2</KI> are locally isomorphic, as demonstrated in the following picture:
</>);
}

function MdArticle() {
  let renderList: any = [];
  for (let token of tokens) {
    if (token.type === "heading") {
      if (token.depth === 1) {
        renderList.push(<Title>{token.text}</Title>);
      } else if (token.depth === 2) {
        renderList.push(<Section>{token.text}</Section>);
      }
    } else if (token.type === "paragraph") {
      
        renderList.push(<>{token.text}</>);
    }
  }

  return <>{renderList}</>
}


// Disable for now. My macros break KaTeX's \neq (eyeroll), no idea why
initMacros();
root.render(
  <React.StrictMode>
        <div className="mx-auto max-w-4xl p-3 font-crimson text-lg">
          <MdArticle />
        </div>
  </React.StrictMode>
);
