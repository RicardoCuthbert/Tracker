"use client";

import { createContext, useContext, useState } from "react";
import { snapshots, type Entry, type Workspace } from "./mock-data";

type PreviewState = "ready" | "loading" | "empty" | "error";
type Context = {
  workspace: Workspace; setWorkspace: (value: Workspace) => void;
  month: string; setMonth: (value: string) => void;
  preview: PreviewState; setPreview: (value: PreviewState) => void;
  today: string; snapshot: (typeof snapshots)[Workspace][string] | undefined;
  demoEntries: Entry[]; addDemoEntry: (entry: Entry) => void;
};
const PrototypeContext = createContext<Context | null>(null);

export function PrototypeProvider({ today, children }: { today: string; children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>("personal");
  const [month, setMonth] = useState("2026-11");
  const [preview, setPreview] = useState<PreviewState>("ready");
  const [entries, setEntries] = useState<Record<Workspace, Entry[]>>({ personal: [], shared: [] });
  function addDemoEntry(entry: Entry) { setEntries((previous) => ({ ...previous, [workspace]: [entry, ...previous[workspace]] })); }
  return <PrototypeContext.Provider value={{ workspace, setWorkspace, month, setMonth, preview, setPreview, today, snapshot: snapshots[workspace][month], demoEntries: entries[workspace], addDemoEntry }}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const context = useContext(PrototypeContext);
  if (!context) throw new Error("PrototypeProvider is required");
  return context;
}
