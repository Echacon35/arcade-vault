"use client";

import { useEffect } from "react";

/**
 * Añade la clase `in` a cada `.reveal` del documento cuando entra en el viewport.
 * No pinta nada. Se monta en la misma página que los `.reveal` (SPEC 02).
 */
export function RevealObserver() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
