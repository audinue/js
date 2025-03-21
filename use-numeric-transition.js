import { useState, useEffect } from "https://esm.sh/react";

export const useNumericTransition = (
  input,
  { duration = 1000, easing = (x) => -(Math.cos(Math.PI * x) - 1) / 2 } = {},
) => {
  const [previous, setPrevious] = useState(input);
  useEffect(() => {
    if (previous !== input) {
      let abort = false;
      let handle = 0;
      const start = performance.now();
      const end = start + duration;
      const tick = () => {
        if (!abort) {
          const delta = performance.now() - start;
          if (delta <= duration) {
            const progress = easing(delta / duration);
            setPrevious(previous + progress * (input - previous));
            handle = requestAnimationFrame(tick);
          }
        }
      };
      handle = requestAnimationFrame(tick);
      return () => {
        abort = true;
        cancelAnimationFrame(handle);
      };
    }
  }, [input]);
  return previous;
};
