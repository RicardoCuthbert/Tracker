"use client";

import { useState, type FormEvent } from "react";
import { Check, Info, LockKeyhole, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePrototype } from "./context";
import { accounts, workspaceNames } from "./mock-data";
import { formatIDR, parseAmount, validEntryDate } from "@/lib/prototype";

export function AddTransaction() {
  const { today, workspace, addDemoEntry } = usePrototype();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"Expense" | "Income">("Expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [account, setAccount] = useState(accounts[workspace][0]);
  const [category, setCategory] = useState("Uncategorized");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [discard, setDiscard] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const dirty = amount !== "" || description !== "" || date !== today || type !== "Expense" || category !== "Uncategorized" || account !== accounts[workspace][0];
  function reset() {
    setType("Expense"); setAmount(""); setDate(today); setAccount(accounts[workspace][0]); setCategory("Uncategorized"); setDescription(""); setErrors({}); setDiscard(false); setSaved(null);
  }
  function changeOpen(next: boolean) {
    if (!next && dirty && !saved) { setDiscard(true); return; }
    setOpen(next);
    if (next) reset();
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseAmount(amount);
    const invalid: Record<string, string> = {};
    if (!parsed) invalid.amount = "Enter positive whole rupiah, up to Rp1.000.000.000.000. No decimals.";
    if (!validEntryDate(date, today)) invalid.date = "Choose a real date from 1 Jan 2026 through today in Jakarta.";
    if (!accounts[workspace].includes(account)) invalid.account = "Choose an account in this demo workspace.";
    setErrors(invalid);
    if (Object.keys(invalid).length || !parsed) return;
    addDemoEntry({ id: crypto.randomUUID(), date, description: description.trim() || `Demo ${type.toLowerCase()}`, category, group: category, account, amount: parsed, type, author: "Cuthbert" });
    setSaved(parsed);
  }
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button><Plus size={18} aria-hidden="true" />Add transaction</Button></DialogTrigger>
    <DialogContent className="transaction-dialog translate-x-0 translate-y-0 md:translate-x-[-50%] md:translate-y-[-50%] sm:max-w-[480px]">
      <DialogHeader><DialogTitle>{discard ? "Discard this draft?" : saved ? "Demo entry added" : "Add transaction"}</DialogTitle><DialogDescription>{discard ? "Your unsaved entry will be removed from this form." : saved ? "This entry exists only in your current demo session." : "A simple record. A clearer picture. Sample data only."}</DialogDescription></DialogHeader>
      {discard ? <div className="dialog-actions"><Button variant="outline" onClick={() => setDiscard(false)}>Keep editing</Button><Button variant="destructive" onClick={() => { reset(); setOpen(false); }}>Discard draft</Button></div> : saved ? <div><div className="success-note" role="status"><Check size={20} aria-hidden="true" /><div><strong>{formatIDR(saved)} · {type}</strong><p className="mt-2">Added to Session demo entries. Summary, chart and budget snapshots stay unchanged.</p></div></div><Button className="w-full" onClick={() => { reset(); setOpen(false); }}>Done</Button></div> : <form onSubmit={submit} noValidate>
        <div className="dialog-context">{workspace === "personal" ? <LockKeyhole size={16} /> : <Users size={16} />}{workspaceNames[workspace]} · IDR</div>
        <div className="type-switch" aria-label="Transaction type"><button type="button" aria-pressed={type === "Expense"} onClick={() => { setType("Expense"); setCategory("Uncategorized"); }}>Expense</button><button type="button" aria-pressed={type === "Income"} onClick={() => { setType("Income"); setCategory("Salary"); }}>Income</button></div>
        <div className="form-grid">
          <div className="field full"><Label htmlFor="amount">Amount · IDR</Label><Input id="amount" className="form-amount" inputMode="numeric" placeholder="0" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} aria-invalid={!!errors.amount} aria-describedby="amount-help amount-error" autoFocus /><p id="amount-help" className="small muted">Whole rupiah. For example 10000 or 10.000.</p>{errors.amount && <p id="amount-error" className="field-error" role="alert">{errors.amount}</p>}</div>
          <div className="field"><Label htmlFor="entry-date">Date · Jakarta</Label><Input id="entry-date" type="date" min="2026-01-01" max={today} value={date} onChange={(event) => setDate(event.target.value)} aria-invalid={!!errors.date} aria-describedby={errors.date ? "date-error" : undefined} />{errors.date && <p id="date-error" className="field-error" role="alert">{errors.date}</p>}</div>
          <div className="field"><Label htmlFor="entry-category">Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger id="entry-category" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{(type === "Expense" ? ["Uncategorized", "Groceries", "Dining", "Transport", "Home", "Bills", "Health"] : ["Salary", "Project income", "Other income"]).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
          <div className="field full"><Label htmlFor="entry-account">Account</Label><Select value={account} onValueChange={setAccount}><SelectTrigger id="entry-account" className="w-full" aria-invalid={!!errors.account}><SelectValue /></SelectTrigger><SelectContent>{accounts[workspace].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>{errors.account && <p role="alert" className="field-error">{errors.account}</p>}</div>
          <div className="field full"><Label htmlFor="description">Description <span className="muted font-normal">(optional)</span></Label><Input id="description" placeholder="What was it for?" maxLength={120} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        </div>
        <div className="notice"><Info size={16} aria-hidden="true" /><p>Demo entry only. Nothing is stored or used to calculate balances. {workspace === "shared" && "Use shared demo accounts only."}</p></div>
        <div className="dialog-actions"><Button variant="outline" type="button" onClick={() => changeOpen(false)}>Cancel</Button><Button type="submit">Add demo entry</Button></div>
      </form>}
    </DialogContent>
  </Dialog>;
}
