import { useRef, useState } from "react";
import Permutation from "./Permutation";
import { KI } from "./katex";

export type Vec2 = [number, number];

type PermWidgetProps = {
  vertical: boolean,
  perm: Permutation,
  onPermChanged: (newPerm: Permutation) => void,
  xyToIdx: (x: number, y: number) => number,
  // Warning: This is currently being called with fractional idx for the
  // drop indicators.
  idxToXY: (idx: number) => Vec2,
  enableTransition: boolean,
}

export default function PermWidget({vertical=false, perm, onPermChanged, xyToIdx, idxToXY, enableTransition} : PermWidgetProps)
{
  let overlayRef = useRef<HTMLDivElement>(null);
  let [activeDropIndicator, setActiveDropIndicator] = useState<number>(-1);
  let [dragSource, setDragSource] = useState<number>(-1);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    setActiveDropIndicator(-1);

    let fromIdx = dragSource;
    let toIdx = xyToIdx(e.clientX, e.clientY);
    let invLut = [...perm.invLut];
    let move = invLut[fromIdx];
    invLut.splice(fromIdx, 1);
    invLut.splice(toIdx, 0, move);
    let newPerm = new Permutation(invLut);
    newPerm.invert();
    setDragSource(-1);
    overlayRef.current?.classList.add("pointer-events-none")
    onPermChanged(newPerm);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    let fromIdx = dragSource;
    let toIdx = xyToIdx(e.clientX, e.clientY);

    console.log(e.dataTransfer.getData("outputIdx"), "is", fromIdx, toIdx);
    e.preventDefault();
    e.clientY;

    if (toIdx < fromIdx) {
      setActiveDropIndicator(toIdx);
    } else if (toIdx > fromIdx) {
      setActiveDropIndicator(toIdx + 1);
    } else {
      setActiveDropIndicator(-1);
    }
  }

  let height = perm.lut.length;
  console.log("PermWidget perm", perm);
  let labelOffset = 20;

  function drawPermArrows(prescriptions: any[], dropIndicators: any[]) {
    for (let preimage = 0; preimage < height; preimage++) {
      let outputIdx = perm.lut[preimage];
      let [x, y] = idxToXY(outputIdx);


      let dropIdx = (outputIdx===0 ? 0 : height);
      let dropStyle: React.CSSProperties = {
        opacity: (activeDropIndicator === dropIdx) ? 1 : 0
      };
      
      dropStyle[vertical?"left":"top"] = `${outputIdx===0?"-":""}10px`;

      let drop = <div className="relative w-0 h-0">
        <div
          key={`drop_${dropIdx}`} 
          className={`absolute transition bg-cyan-400 shrink-0 ${vertical ? "h-12" : "w-12"} ${vertical ? "w-0.5" : "h-0.5"}`}
          style={dropStyle}
        />
      </div>;


      let predrop = undefined;
      let postdrop = undefined;

      // Both of these cannot occur at the same time because we have at least two outputs.
      if (outputIdx === 0) {
        predrop = drop;
      } else if (outputIdx === height - 1) {
        postdrop = drop;
      }

      function labelStyle(x: number, y: number): React.CSSProperties {
        return {
          transform: vertical ? `translate(-50%, 0) translate(${x}px, ${y + labelOffset}px)` :
          `translate(0, -50%) translate(${x + labelOffset}px, ${y}px)`,
          flexDirection: vertical ? "row" : "column"
        };  
      }

      prescriptions.push(
        <div
          key={"ob_" + preimage.toString()}
          className={`absolute flex  ${enableTransition ? "transition-transform duration-200" : ""}`}
          style={labelStyle(x, y)}>
          {predrop}
          <div
            className={`flex items-center bg-white/0 hover:bg-white/30 pushed:bg-white/50 transition rounded-sm cursor-grab p-1 active:cursor-grabbing`}
            draggable="true"
            onDragStart={(e: any) => {
              // HACK: Chrome aborts the drag when we change styles right away. (Firefox does not)
              // Inspired by https://github.com/react-dnd/react-dnd/issues/1085
              setTimeout(() => overlayRef.current?.classList.remove("pointer-events-none"), 0);
              setDragSource(outputIdx);
            }}
            style={{ flexDirection: vertical ? "column" : "row" }}>
            <div className={`px-1 ${vertical ? "-rotate-90" : "rotate-180"}`}><KI>{`\\mapsto`}</KI></div>
            <KI>{`${preimage + 1}`}</KI>
          </div>
          {postdrop}
        </div>
      );

      // Drop indicator
      if (outputIdx < height - 1) {
        [x, y] = idxToXY(outputIdx + 0.5);
        dropIdx = outputIdx+1;
        dropIndicators.push(<div key={`drop_${dropIdx}`} data-before={outputIdx}
          className={`absolute transition bg-cyan-400 shrink-0 ${vertical ? "h-12" : "w-12"} ${vertical ? "w-0.5" : "h-0.5"}`}

          style={{opacity: activeDropIndicator === outputIdx+1 ? 1 : 0, ...labelStyle(x, y)}}
        />);
      }
    }
  }

  let prescriptions: any[] = [];
  let dropIndicators: any[] = [];
  // For some reason, React seems to recreate nodes if we don't have some basic sorting,
  // which is why keep an extra list for the drop indicators. Otherwise, the animations
  // will break.
  drawPermArrows(prescriptions, dropIndicators);

  return <>
    {prescriptions}
    {dropIndicators}
    <div ref={overlayRef} className={`absolute top-0 left-0 w-full h-full pointer-events-none`} onDragOver={handleDragOver} onDragLeave={() => setActiveDropIndicator(-1)} onDrop={handleDrop}
    >
    </div>
  </>;
}
