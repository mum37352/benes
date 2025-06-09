import useResizeObserver, { UseResizeObserverCallback } from "@react-hook/resize-observer";
import { useLayoutEffect, useRef, useState } from "react";

export type FlushingResizeObserverRet = {
  enableTransition: boolean,
  size: DOMRect|undefined
}

// When the element gets resized, we want a way to flush css transitions.
// So we roll our own wrapper hook.
// The returned boolean tells the usage code if it should enable CSS transitions at the moment.
export function useFlushingResizeObserver<T extends Element>(
  target: React.RefObject<T> | React.ForwardedRef<T>
): FlushingResizeObserverRet
{
  const [transitionFlushCounter, setTransitionFlushCounter] = useState(0);
  const counterRef = useRef(0); // track current value for the setTimeout closure
  let [size, setSize] = useState<DOMRect|undefined>();

  function flushTransitions() {
    setTransitionFlushCounter((prev) => {
      let next = prev + 1;
      counterRef.current = next;
      return next;
    });

    setTimeout(() => {
      setTransitionFlushCounter((prev) => {
          const next = prev - 1;
          counterRef.current = next;
          return next;
        });
    }, 200);
  }

  useLayoutEffect(() => {
    setSize(target.current?.getBoundingClientRect());
  }, [target]);

  useResizeObserver<T>(target, entry => {
    flushTransitions();
    setSize(entry.contentRect);
  });

  return {
    enableTransition: transitionFlushCounter === 0,
    size
  };
}