"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="panel state-panel" role="alert"><h1>This page couldn’t load.</h1><p>No financial changes were saved. Try loading the prototype again.</p><Button onClick={reset}>Try again</Button></section>; }
