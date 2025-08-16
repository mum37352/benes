import { KI } from "@/common/katex";
import { TaggedBox } from "@/common/ui";
import GraphEditor from "./GraphEditor";
import { ColGraph, CompatGraph } from "./Graph";
import { useReducer, useRef, useState } from "react";
import { GraphToolbar, GraphToolbarPanel, ToolSel } from "@/common/Toolbar";
import CompatibilityGraph from "./CompatibilityGraph";
import { InputNumber } from "primereact/inputnumber";
import "primereact/resources/themes/fluent-light/theme.css";

type Config = {
  graph: ColGraph,
  compatGraph: CompatGraph
}

function configFromCliqueSize(cliqueSize: number): Config {
  let graph = new ColGraph(cliqueSize)
  let compatGraph = new CompatGraph(graph);
  return { graph, compatGraph };
}



export function ReductionApplet() {
  let [config, setConfig] = useState<Config>(() => configFromCliqueSize(3));
  let graph = config.graph;
  let compatGraph = config.compatGraph;

  let [tool, setTool] = useState<ToolSel>('insert');

  let [, forceUpdate] = useReducer(x => x + 1, 0);

  let ref = useRef(null);

  function onChange(graph: ColGraph, structuralChange: boolean) {
    forceUpdate();
    if (structuralChange) {
      config.compatGraph = new CompatGraph(config.graph);
      setConfig({ ...config });
    }
  }

  return <>
          <div className="text-sm">
            <label className="block mb-1 font-bold" htmlFor="inputHeight">Clique-size <KI>k</KI>:</label>
  
            <InputNumber className="" name="inputHeight" value={config.graph.cliqueSize} onValueChange={(e: InputNumberValueChangeEvent) => {
              let val = e.value;
              if (val && !isNaN(val)) {
                config.graph.cliqueSize = val;
                setConfig({...config});
                onChange(config.graph, true);
              }
            }} mode="decimal" showButtons min={1} max={5} />
            </div>
        <GraphToolbarPanel activeTool={tool} onChange={setTool} paintBrush>
    <TaggedBox tag={<KI>{"\\mathsf{Col3}(G)"}</KI>} className="relative flex items-stretch w-3/5 h-100 mx-auto p-1">
      <GraphEditor compatGraph={compatGraph} tool={tool} colGraph={graph} onChange={onChange} />
    </TaggedBox>
    </GraphToolbarPanel>
    <img src="/leq.svg" className="w-16 m-auto" />
    <TaggedBox tag={<KI>{"\\mathsf{Clique}(G')"}</KI>} className="relative flex items-stretch w-3/5 h-100 mx-auto p-1">
      <CompatibilityGraph graph={graph} compatGraph={compatGraph} onColoringChanged={() => forceUpdate()} />
    </TaggedBox>
  </>
}