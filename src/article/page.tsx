import React, { ReactElement, useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import '@/styles/stackedit.css';
// I'm confused about why tailwind preflight does not override stuff from stackedit.css.
import '@/styles/index.css';

import { marked, MarkedExtension, Token } from 'marked';
import linkupMd from "./linkup.md";
import { initMacros, KB, KI } from '@/common/katex';
import { ChevronsRight } from 'lucide-react';
import { Strong, Section, SubSection, TaggedBox, Title } from '@/common/ui';
import { ReductionApplet } from '@/reduction/applet';


function ScrollToHash() {
  useEffect(() => {
    if (location.hash) {
      const id = window.location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [location]);

  return null;
}

let mathExtension: MarkedExtension = {
  extensions: [
    {
      name: 'inlineMath',
      level: 'inline',
      start(src: string) { return src.match(/\$/)?.index; },
      tokenizer(src: string) {
        let match = src.match(/^\$([^\$]+)\$/);
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
      start(src: string) {
        let match = src.match(/\$\$/)?.index;
        return match;
      },
      tokenizer(src: string) {
        let match = src.match(/^\$\$([\s\S]+?)\$\$/);
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
      start(src: string) { return src.match(/%%Applet%%/)?.index; },
      tokenizer(src: string) {
        let match = src.match(/^%%Applet%%([^%]+)%%/);
        if (match) {
          return {
            type: 'applet',
            raw: match[0],
            text: match[1].trim()
          };
        }
      }
    },
    {
      name: 'frame',
      level: 'block',
      start(src: string) { return src.match(/%%Frame(Sq)?%%/)?.index; },
      tokenizer(src: string) {
        let match = src.match(/^%%Frame(Sq)?%%([^%]+)%%([^%]+)%%([^%]*)%%/);
        if (match) {
          let [fullMatch, sq, category, id, text] = match;
          return {
            type: 'frame',
            proofSquare: (sq === "Sq"),
            raw: fullMatch,
            category: category.trim(),
            id: id.trim(),
            tokens: this.lexer.inlineTokens(text.trim())
          };
        }
      }
    },
    
    
    {
      name: 'ref',
      level: 'inline',
      start(src: string) { return src.match(/%%Ref%%/)?.index; },
      tokenizer(src: string) {
        let match = src.match(/^%%Ref%%([^%]+)%%/);
        if (match) {
          let [fullMatch, id] = match;
          return {
            type: 'ref',
            raw: fullMatch,
            id: id.trim()
          };
        }
      }
    },

    {
      name: 'proof',
      level: 'block',
      start(src: string) { return src.match(/%%Proof%%/)?.index; },
      tokenizer(src: string) {
        let match = src.match(/^%%Proof%%([^%]+)%%/);
        if (match) {
          let [fullMatch, id] = match;
          return {
            type: 'proof',
            raw: fullMatch,
            thmId: id.trim()
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


type TagListEntry = {
  descTokens: Token[],
  number: number,
  category: string
};

type TagList = {[key: string]: TagListEntry};

function MdTokens({ tokens, tagList, injectedTitle }: { tokens: Token[], tagList: TagList, injectedTitle?: ReactElement | undefined }) {
  function buildHtmlId(mdId: string) {
    return `mdid-${mdId}`;
  }

  let renderList: any = [];
  for (let token of tokens) {
    if (token.type === "heading") {
      if (token.depth === 1) {
        renderList.push(<h1><MdTokens tokens={token.tokens!} tagList={tagList} /></h1>);
      } else if (token.depth === 2) {
        renderList.push(<h2><MdTokens tokens={token.tokens!} tagList={tagList} /></h2>);
      } else if (token.depth === 3) {
        renderList.push(<h3><MdTokens tokens={token.tokens!} tagList={tagList} /></h3>);
      }
    } else if (token.type === "text") {
      renderList.push(<span>{token.text}</span>);
    } else if (token.type === "paragraph") {
      renderList.push(<p>{injectedTitle} <MdTokens tokens={token.tokens!} tagList={tagList} /></p>);
      injectedTitle = undefined;
    } else if (token.type === "strong") {
      renderList.push(<strong><MdTokens tokens={token.tokens!} tagList={tagList} /></strong>);
    } else if (token.type === "em") {
      renderList.push(<em><MdTokens tokens={token.tokens!} tagList={tagList} /></em>);
    } else if (token.type === "inlineMath") {
      renderList.push(<span className="text-sm whitespace-nowrap"><KI>{token.text}</KI></span>);
    } else if (token.type === "blockMath") {
      renderList.push(<KB>{token.text}</KB>);
    } else if (token.type === "blockquote") {
      let firstToken = token.tokens![0];
      let hadDirectives = false;
      if (!firstToken) {
      } else if (firstToken.type === "frame") {
        hadDirectives = true;
        let title = <strong>{firstToken.category} {tagList[firstToken.id].number}{firstToken.tokens!.length !== 0 ? ": " : ""}<MdTokens tokens={firstToken.tokens!} tagList={tagList} />.</strong>;
        renderList.push(<div className="bg-[rgba(0,0,0,0.1)] p-3" id={buildHtmlId(firstToken.id)}>
          <MdTokens tokens={token.tokens!} tagList={tagList} injectedTitle={title} />
        </div>);
        if (firstToken.proofSquare) {
          renderList.push(<div className="text-right"><KI>{"\\square"}</KI></div>);
        }
      } else if (firstToken.type === "proof") {
        hadDirectives = true;
        let tag = tagList[firstToken.thmId];
        console.log("id", firstToken.thmId, "tag", tag);
        let title = <strong>Proof of {tag.category} {tag.number}.</strong>;
        renderList.push(<blockquote className="!text-[rgba(0,0,0,0.75)]">
          <MdTokens tokens={token.tokens!} tagList={tagList} injectedTitle={title} />
          <div className="text-right"><KI>{"\\square"}</KI></div>
        </blockquote>);
      }

      if (!hadDirectives) {
        renderList.push(<blockquote>
          <MdTokens tokens={token.tokens!} tagList={tagList} />
        </blockquote>);
      }
    } else if (token.type === "list") {
      renderList.push(<ul className="list-disc pl-5"><MdTokens tokens={token.items} tagList={tagList} /></ul>);
    } else if (token.type === "list_item") {
      let tokens = marked.lexer(token.text);
      renderList.push(<li><MdTokens tokens={tokens} tagList={tagList} /></li>);
    } else if (token.type === "applet") {
      if (token.text === "reduction!") { // Turn this back on by removing the !
        renderList.push(<ReductionApplet />);
      } else {
        renderList.push(
          <iframe src={`https://mum37352.github.io/benes/${token.text}.html`} width="100%"
            height="500"
            frameBorder="0"
            allowFullScreen></iframe>
        );
      }
    } else if (token.type === "frame") {
      // Handled by the caller.
    } else if (token.type === "ref") {
      let tag = tagList[token.id];
      renderList.push(<a href={'#'+buildHtmlId(token.id)}>{tag.category} {tag.number}{tag.descTokens!.length !== 0 ? ": " : ""}<MdTokens tokens={tag.descTokens} tagList={tagList} /></a>)
    } else if (token.type === "link") {
      renderList.push(<a href={token.href}><MdTokens tokens={token.tokens!} tagList={tagList} /></a>)
    }
  }

  if (injectedTitle) {
      renderList.push(<p>{injectedTitle}</p>);
  }

  return <>{renderList}</>
}

type BuildTagListData = {
  tagList: TagList,
  counter: number
}

function buildTagList_recurse(data: BuildTagListData, tokens: Token[]) {
  for (let token of tokens) {
    let subTokens = (token as any)["tokens"];

    if (token.type == "frame") {
      data.tagList[token.id] = {descTokens: token.tokens!, number: data.counter++, category: token.category};
    }

    if (subTokens) {
      buildTagList_recurse(data, subTokens);
    }
  }
}

function buildTagList(tokens: Token[]) {
  let data: BuildTagListData = {
    tagList: {},
    counter: 1
  };

  buildTagList_recurse(data, tokens);

  return data.tagList;
}

function MdArticle() {
  let tagList = buildTagList(tokens);
  console.log("tagList", tagList);

  return <MdTokens tokens={tokens} tagList={tagList} />;
}


// Disable for now. My macros break KaTeX's \neq (eyeroll), no idea why
//initMacros();
root.render(
  <React.StrictMode>
    <ScrollToHash />
    <div className="stackedit__html !box-content">
      <MdArticle />
    </div>
  </React.StrictMode>
);
