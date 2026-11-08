'use client';

import { useActionState, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Account, Category, Transaction } from '@/lib/supabase/finance';
import { formatIDR } from '@/lib/prototype';
import { saveFinancial } from './actions';
import type { SaveState } from './write';
import { amountCaret, editAmountInput, formatAmountInput } from './amount-input';
import { Plus } from 'lucide-react';

type Props = { workspace: string; workspaceName?: string; actor: string; today: string; accounts: Account[]; categories: Category[] };
type Operation = 'account' | 'category' | 'transaction' | 'void';
type CategoryCreation = { categoryKind?: 'income' | 'expense'; onCategoryCreated?: (id: string) => void; disabled?: boolean };

export function FinancialDialog(props: Props & CategoryCreation & { operation: Operation; transaction?: Transaction; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const title = props.operation === 'account' ? 'Add account' : props.operation === 'category' ? props.categoryKind ? `Add ${props.categoryKind} category` : 'Add category'
    : props.operation === 'void' ? 'Delete / void transaction' : props.transaction ? 'Edit transaction' : 'Add transaction';
  return <Dialog open={open} onOpenChange={value => { if (!locked) setOpen(value); }}>
    <DialogTrigger asChild><Button type="button" aria-label={title} disabled={props.disabled} variant={props.transaction || props.operation !== 'transaction' ? 'outline' : 'default'}>
      {!props.transaction && props.operation !== 'category' && <Plus size={16} aria-hidden="true" />}{props.compact ? props.operation === 'void' ? 'Void' : 'Edit' : title}</Button></DialogTrigger>
    {open && <FinancialEditor {...props} title={title} setLocked={setLocked} close={() => setOpen(false)} />}
  </Dialog>;
}

function FinancialEditor({ workspace, workspaceName, actor, today, accounts, categories, operation, transaction: initialTransaction, title, setLocked, close, categoryKind, onCategoryCreated }: Props & CategoryCreation & {
  operation: Operation; transaction?: Transaction; title: string; setLocked: (value: boolean) => void; close: () => void;
}) {
  const prefix = useId();
  // Keep the draft's original revision even if another save refreshes this page.
  const [t] = useState(initialTransaction);
  const [keys, setKeys] = useState(() => ({ op: crypto.randomUUID(), id: t?.id ?? crypto.randomUUID() }));
  const [draft, setDraft] = useState<Record<string, string>>(() => ({
    name: '', kind: operation === 'account' ? 'cash' : operation === 'category' ? categoryKind ?? 'expense' : t?.kind ?? 'expense', opening_balance: '0', opening_date: today,
    amount: t?.amount ?? '', economic_date: t?.economicDate ?? today, account_id: t?.accountId ?? accounts.find(a => !a.archived)?.id ?? '',
    destination_account_id: t?.destinationAccountId ?? '', category_id: t?.categoryId ?? '', description: t?.description ?? '', reason: '',
  }));
  const selection = useRef<{ input: HTMLInputElement; position: number } | null>(null);
  useLayoutEffect(() => {
    const caret = selection.current;
    selection.current = null;
    if (caret && document.activeElement === caret.input) caret.input.setSelectionRange(caret.position, caret.position);
  }, [draft]);
  const frozen = useRef<FormData | null>(null);
  const [state, action, pending] = useActionState(async (previous: SaveState, data: FormData): Promise<SaveState> => {
    const command = previous.status === 'uncertain' && frozen.current ? frozen.current : data;
    frozen.current = command;
    setLocked(true);
    let result: SaveState;
    try { result = await saveFinancial(previous, command); }
    catch { result = { status: 'uncertain', message: 'Save could not be confirmed. Retry the exact operation.' }; }
    setLocked(result.status === 'uncertain');
    if (result.status === 'invalid') setKeys(current => ({ ...current, op: crypto.randomUUID() }));
    return result;
  }, { status: 'idle', message: '' });
  const disabled = pending || state.status === 'uncertain';
  useEffect(() => {
    if (!disabled) return;
    const leaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && (target.closest('a[href]') || (event.type === 'submit' && !target.closest('[role="dialog"], [data-session-action]')))) event.preventDefault();
    };
    window.addEventListener('beforeunload', leaving);
    document.addEventListener('click', navigate, true); document.addEventListener('submit', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', leaving);
      document.removeEventListener('click', navigate, true); document.removeEventListener('submit', navigate, true);
    };
  }, [disabled]);
  const update = (key: string, value: string) => setDraft(current => ({ ...current, [key]: value,
    ...(key === 'kind' ? { category_id: '' } : {}) }));
  const field = (key: string, label: string, type = 'text', required = true) => <div className="grid gap-2" key={key}>
    <Label htmlFor={`${prefix}-${key}`}>{label}</Label>
    <Input id={`${prefix}-${key}`} name={key} type={type} value={key === 'amount' || key === 'opening_balance' ? formatAmountInput(draft[key]) : draft[key]} onChange={e => {
      const input = e.currentTarget;
      if (key !== 'amount' && key !== 'opening_balance') { update(key, input.value); return; }
      const digits = (input.value.slice(0, input.selectionStart ?? input.value.length).match(/\d/g) ?? []).length;
      const raw = editAmountInput(input.value, (e.nativeEvent as InputEvent).inputType);
      // Restore before the next keystroke; animation frames can apply an obsolete caret.
      selection.current = { input, position: amountCaret(formatAmountInput(raw), digits) };
      update(key, raw);
    }} required={required} autoFocus={key === 'amount'} className={key === 'amount' || key === 'opening_balance' ? 'form-amount' : undefined}
      max={type === 'date' ? today : undefined} maxLength={key === 'description' || key === 'reason' ? 2000 : key === 'name' ? 100 : undefined}
      inputMode={key === 'amount' ? 'numeric' : key === 'opening_balance' ? 'text' : undefined}
      aria-invalid={!!state.errors?.[key]} aria-describedby={state.errors?.[key] ? `${prefix}-${key}-error` : undefined} />
    {state.errors?.[key] && <p id={`${prefix}-${key}-error`} className="small text-destructive">{state.errors[key]}</p>}
  </div>;
  const choice = (key: string, label: string, options: { id: string; name: string; disabled?: boolean }[], required = true) => <div className="grid gap-2" key={key}>
    <Label htmlFor={`${prefix}-${key}`}>{label}</Label>
    <Select name={key} value={draft[key]} onValueChange={value => update(key, value)} required={required} disabled={disabled || !options.some(o => !o.disabled)}>
      <SelectTrigger id={`${prefix}-${key}`} className="w-full" aria-invalid={!!state.errors?.[key]} aria-describedby={state.errors?.[key] ? `${prefix}-${key}-error` : undefined}><SelectValue placeholder={options.some(o => !o.disabled) ? 'Select…' : 'No categories available'} /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem value={o.id} key={o.id} disabled={o.disabled}>{o.name}</SelectItem>)}</SelectContent>
    </Select>
    {state.errors?.[key] && <p id={`${prefix}-${key}-error`} className="small text-destructive">{state.errors[key]}</p>}
  </div>;
  const accountOptions = accounts.map(a => ({ id: a.id, name: `${a.name}${a.archived ? ' (archived)' : ''}`, disabled: a.archived }));
  const body = state.status === 'denied' ? <div role="alert"><p>{state.message}</p><a href="/workspaces" className="text-link">Return to workspaces</a></div>
    : state.status === 'saved' ? <div className="grid gap-4"><p role="status">{state.message}</p><Button onClick={() => { if (operation === 'category' && draft.kind === categoryKind) onCategoryCreated?.(keys.id); close(); }}>Done</Button></div>
    : <form action={action} className="grid gap-4">
    <input type="hidden" name="workspace" value={workspace} /><input type="hidden" name="actor" value={actor} />
    <input type="hidden" name="operation" value={operation} /><input type="hidden" name="op" value={keys.op} />
    <input type="hidden" name="id" value={keys.id} /><input type="hidden" name="version" value={t?.version ?? 0} />
    {t?.paidBy && <input type="hidden" name="paid_by" value={t.paidBy} />}
    <fieldset disabled={disabled || state.status === 'conflict'} className="grid min-w-0 gap-4">
      {operation === 'account' && <>{field('name', 'Account name')}
        {choice('kind', 'Account type', ['cash', 'bank', 'e-wallet', 'savings'].map(id => ({ id, name: id })))}
        {field('opening_date', 'Opening date · Jakarta', 'date')}{field('opening_balance', 'Opening balance · IDR (signed; zero allowed)')}
        <p className="small">Opening balance is not income. Opening dates and amounts become immutable once used.</p></>}
      {operation === 'category' && <>{field('name', 'Category name')}{choice('kind', 'Category type', [{ id: 'expense', name: 'Expense' }, { id: 'income', name: 'Income' }])}</>}
      {operation === 'transaction' && <>
        <input type="hidden" name="kind" value={draft.kind} />
        <div className="live-type-switch" role="group" aria-label="Transaction type">{['expense', 'income', 'transfer'].map(kind => <Button key={kind} type="button" variant="ghost" aria-pressed={draft.kind === kind} disabled={!!t || disabled} onClick={() => update('kind', kind)}>{kind.charAt(0).toUpperCase() + kind.slice(1)}</Button>)}</div>
        {t && <p className="small">To change transaction type, void and re-enter.</p>}
        {field('amount', 'Amount · IDR')}
        <div className="live-form-grid">{field('economic_date', 'Transaction date · Jakarta', 'date')}
        {choice('account_id', draft.kind === 'transfer' ? 'Source account' : 'Account', accountOptions)}
        </div>
        {draft.kind === 'transfer' ? <>{choice('destination_account_id', 'Destination account', accountOptions.map(a => ({ ...a, disabled: a.disabled || a.id === draft.account_id })))}
          <p className="small">Source decreases; destination increases by the same amount. Income and spending stay unchanged.</p></>
          : <>{choice('category_id', 'Category', categories.filter(c => c.kind === draft.kind).map(c => ({ id: c.id, name: c.name, disabled: c.archived })), draft.kind === 'income')}
            {!categories.some(c => c.kind === draft.kind && !c.archived) && <p role="status">No {draft.kind} categories yet. Add a category below, then continue this transaction.</p>}
            {draft.kind === 'expense' && <p className="small muted">No category selected uses Uncategorized.</p>}
            <FinancialDialog workspace={workspace} workspaceName={workspaceName} actor={actor} today={today} accounts={accounts} categories={categories} operation="category" categoryKind={draft.kind === 'income' ? 'income' : 'expense'}
              disabled={disabled || state.status === 'conflict'} onCategoryCreated={id => update('category_id', id)} /></>}
        {field('description', 'Notes (optional)', 'text', false)}
      </>}
      {operation === 'void' && <><p>{t?.economicDate} · {t?.kind} · {formatIDR(t?.amount ?? '0')} · {t?.description || 'No notes'}</p>{field('reason', 'Reason for deletion / void')}</>}
    </fieldset>
    <p role={state.status === 'idle' ? 'status' : 'alert'} aria-live="polite">{state.message}</p>
    <div className="live-form-actions">{state.status === 'conflict' ? <a className="text-link" href={window.location.href}>Reload and compare</a>
      : <Button disabled={pending} type="submit">{pending ? 'Saving…' : state.status === 'uncertain' ? 'Retry exact operation' : operation === 'void' ? 'Confirm void' : 'Save'}</Button>}
    {!disabled && <Button type="button" variant="outline" onClick={close}>Cancel</Button>}</div>
  </form>;
  return <DialogContent showCloseButton={!disabled} className="transaction-dialog live-financial-dialog max-md:translate-x-0 max-md:translate-y-0">
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>
      {operation === 'void' ? 'Voiding removes the financial effect and retains audit history. Transfers reverse both accounts. Resolve linked refunds first.'
        : 'A simple record. Whole rupiah, saved to your workspace.'}
    </DialogDescription></DialogHeader><p className="dialog-context">{workspaceName ?? 'Current workspace'} · IDR · Asia/Jakarta</p>{body}
  </DialogContent>;
}
