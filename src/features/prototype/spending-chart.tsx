"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { canRenderPie, chartNumber, formatIDR } from "@/lib/prototype";

export function SpendingChart({ data, total }: { data: { id?: string; name: string; amount: string; color: string }[]; total: string }) {
  const chartData = data.map((item) => ({ ...item, value: chartNumber(item.amount) }));
  if (chartData.some((item) => item.value === null)) return <p className="small muted">Exact amounts are available in the table below. Chart omitted to preserve precision.</p>;
  if (!canRenderPie(chartData.map((item) => item.value))) return <p className="small muted">Pie chart unavailable for negative spending or an all-zero total. Exact category amounts remain in the table below.</p>;
  return <div className="chart donut-chart" role="img" aria-label={`Spending proportions by category. Total ${formatIDR(total)}. Exact category amounts follow.`}><ResponsiveContainer width="100%" height="100%" minWidth={0}><PieChart accessibilityLayer><Tooltip contentStyle={{ border: "1px solid #738197", borderRadius: 6, color: "#082F49" }} formatter={(_value, name, item) => [formatIDR(item.payload.amount), name]} /><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="59%" outerRadius="90%" startAngle={90} endAngle={-270} stroke="#FFFFFF" strokeWidth={2} isAnimationActive={false}>{chartData.map((entry) => <Cell key={entry.id ?? entry.name} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer><div className="donut-total" aria-hidden="true"><strong className="money">{formatIDR(total)}</strong><span>Total spent</span></div></div>;
}
