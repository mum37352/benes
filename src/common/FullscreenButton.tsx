import { Maximize, Minimize2 } from "lucide-react";
import { Button } from "primereact/button";
import { useState } from "react";

export function FullscreenButton() {
  let [isFullscreen, setIsFullscreen] = useState(false);

  function onClick() {
    if (!isFullscreen) {
      let elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }

  return <div className="fixed z-50 px-3 py-2 text-gray-800 rounded-xl shadow-lg bottom-4 right-4">
          <Button icon={isFullscreen ? <Minimize2 size={18} /> : <Maximize size={18} />}
        onClick={onClick} />
      </div>;
}