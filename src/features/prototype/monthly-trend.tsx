"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePrototype } from "./context";
import { snapshots } from "./mock-data";
import { getTrendData } from "./trend-data";
import { formatIDR, monthLabel } from "@/lib/prototype";

export function MonthlyTrend() {
  const { workspace, month } = usePrototype();
  const rows = getTrendData(snapshots[workspace], month);
  const unsafe = rows.some((row) => (row.cashExact !== null && row.cash === null) || (row.spendingExact !== null && row.spending === null));
  return <section className="panel monthly-trend"><div className="panel-heading"><div><h2>Your money, month by month</h2><p className="small muted mt-1">Closing cash and net spending · Sample snapshots · IDR</p></div></div>
    <div className="trend-legend"><span><i className="cash-key" aria-hidden="true" />Closing cash</span><span><i className="spending-key" aria-hidden="true" />Net spending</span></div>
    <p className="small muted mb-4">Higher pink points mean more spending, not a financial health rating. November is month-to-date through 5 Nov; October is a complete month.</p>
    {unsafe ? <p className="small muted">Chart omitted to preserve exact values. See the table below.</p> : <div className="trend-chart" role="img" aria-label="Monthly cash and spending trend. Blue solid line is closing cash; pink dashed line is net spending. Exact values follow in the table."><ResponsiveContainer width="100%" height="100%" minWidth={0}><LineChart data={rows} margin={{top:16,right:24,bottom:8,left:0}} accessibilityLayer><CartesianGrid vertical={false} stroke="#D6E3ED" /><XAxis dataKey="month" tickFormatter={(value) => monthLabel(value).replace(" 2026", "")} tick={{fill:"#475569",fontSize:14}} tickLine={false} axisLine={false} padding={{left:16,right:16}} /><YAxis width={64} tickFormatter={(value) => `${value / 1000000} jt`} tick={{fill:"#475569",fontSize:12}} tickLine={false} axisLine={false} /><Tooltip labelFormatter={(label) => monthLabel(String(label))} formatter={(_value,name,item) => { const amount = name === "Closing cash" ? item.payload.cashExact : item.payload.spendingExact; return [amount === null ? "No sample data" : formatIDR(amount), name]; }} contentStyle={{border:"1px solid #738197",borderRadius:6,color:"#082F49"}} /><Line dataKey="cash" name="Closing cash" type="linear" stroke="#0284C7" strokeWidth={3} dot={{r:5,fill:"#0284C7"}} activeDot={{r:7}} connectNulls={false} isAnimationActive={false} /><Line dataKey="spending" name="Net spending" type="linear" stroke="#D91670" strokeDasharray="6 4" strokeWidth={3} dot={{r:5,fill:"#D91670"}} activeDot={{r:7}} connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>}
    {rows.length < 2 && <p className="small muted">Only one sample month is available in this workspace; more months are needed to show a trend.</p>}
    <details className="trend-values"><summary>View exact monthly amounts</summary><div className="trend-table-scroll"><table className="transaction-table"><caption className="sr-only">Exact monthly sample amounts in IDR</caption><thead><tr><th>Month / as of</th><th>Closing cash</th><th>Net spending</th></tr></thead><tbody>{rows.map((row) => <tr key={row.month}><td>{monthLabel(row.month)}<p className="small muted">{row.asOf ?? "No sample data"}</p></td><td className="money">{row.cashExact === null ? "Unknown" : formatIDR(row.cashExact)}</td><td className="money">{row.spendingExact === null ? "Unknown" : formatIDR(row.spendingExact)}</td></tr>)}</tbody></table></div></details>
  </section>;
}
