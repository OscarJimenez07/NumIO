interface Point { x: number; y: number; }

interface Props {
  points: Point[];
  onChange: (pts: Point[]) => void;
}

export function PointsEditor({ points, onChange }: Props) {
  const update = (i: number, key: 'x' | 'y', val: string) => {
    const next = [...points];
    next[i] = { ...next[i], [key]: parseFloat(val) || 0 };
    onChange(next);
  };
  const add = () => onChange([...points, { x: 0, y: 0 }]);
  const remove = (i: number) => onChange(points.filter((_, k) => k !== i));

  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="font-mono text-xs text-slate-500">x</th>
            <th className="font-mono text-xs text-slate-500">y</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td className="pr-1 py-1">
                <input className="input font-mono" type="number" step="any" value={p.x} onChange={(e) => update(i, 'x', e.target.value)} />
              </td>
              <td className="pr-1 py-1">
                <input className="input font-mono" type="number" step="any" value={p.y} onChange={(e) => update(i, 'y', e.target.value)} />
              </td>
              <td className="py-1">
                <button className="btn-ghost text-rose-700" onClick={() => remove(i)} disabled={points.length <= 2}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn-secondary text-xs" onClick={add}>+ Agregar punto</button>
    </div>
  );
}
