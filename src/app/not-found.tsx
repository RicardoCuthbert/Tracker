import Link from "next/link";
export default function NotFound() { return <main className="state-panel min-h-screen"><h1>This page isn’t in your ledger.</h1><p>The requested page was not found.</p><Link className="text-link" href="/">Return to overview</Link></main>; }
