import React from 'react';
import { PieChart } from 'react-minimal-pie-chart';

export default function BreakdownChart({ labor = 0, material = 0, overhead = 0 }) {
  const total = Math.max(labor + material + overhead, 0.0001);
  const data = [
    { title: 'Labor', value: labor, color: '#0284c7' },
    { title: 'Material', value: material, color: '#38bdf8' },
    ...(overhead > 0 ? [{ title: 'Overhead', value: overhead, color: '#94a3b8' }] : []),
  ];

  const line = (title, value, color) => (
    <div key={title} className="flex items-center gap-2 text-sm">
      <span className="w-3 h-3 inline-block rounded" style={{ background: color }} />
      <span className="text-slate-600">{title}</span>
      <span className="text-slate-800 font-medium ml-auto">{Math.round((value / total) * 100)}%</span>
    </div>
  );

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center">
      <PieChart
        data={data}
        lineWidth={25}
        paddingAngle={2}
        label={({ dataEntry }) => `${Math.round(dataEntry.percentage)}%`}
        labelStyle={{ fontSize: '6px', fill: '#0f172a' }}
        style={{ width: 160, height: 160 }}
      />
      <div className="w-full max-w-xs space-y-1">
        {data.map(d => line(d.title, d.value, d.color))}
      </div>
    </div>
  );
}
