"use client";

import dynamic from "next/dynamic";

const SceneInner = dynamic(
  () => import("./SceneInner").then((m) => m.SceneInner),
  { ssr: false }
);

export function Scene() {
  return (
    <div className="fixed inset-0 -z-10 bg-background">
      <SceneInner />
    </div>
  );
}
