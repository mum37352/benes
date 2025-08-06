import React from "react";

import katex from "katex";

import macrosTex from "../macros.tex";

import 'katex/dist/katex.min.css';

let macros = {};

// We don't use https://github.com/MatejBransky/react-katex?tab=readme-ov-file because it needs
// useState, which doesn't work in React server components.
// We don't use https://github.com/talyssonoc/react-katex/tree/master/packages/react-katex because it
// doesn't allow for custom options (which we need to avoid reparsing our macros).

// Called once, see https://github.com/KaTeX/KaTeX/issues/2915
export function initMacros() {
  katex.renderToString(macrosTex, {macros, globalGroup: true});
}

function KI_({ children } : { children: React.ReactNode }) {
  let html = katex.renderToString(
    children?.toString() || "",
    {macros});
  return <span className="text-md" dangerouslySetInnerHTML={{__html: html}} />;
}

function KB_({ children } : { children: React.ReactNode }) {
  let html = katex.renderToString(
    children?.toString() || "",
    {displayMode: true, macros});
  return <span className="text-md" dangerouslySetInnerHTML={{__html: html}} />;
}

export let KI = React.memo(KI_);
export let KB = React.memo(KB_);