import { useEffect, useState } from 'react';

interface Props {
  total: number;
  index: number;
  onChange: (i: number) => void;
}

export function StepPlayer({ total, index, onChange }: Props) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      onChange(Math.min(index + 1, total - 1));
      if (index >= total - 1) setPlaying(false);
    }, 900);
    return () => clearInterval(id);
  }, [playing, index, total, onChange]);

  if (total === 0) return null;

  return (
    <div className="flex items-center gap-2 card">
      <button className="btn-secondary" onClick={() => onChange(0)}>⏮</button>
      <button className="btn-secondary" onClick={() => onChange(Math.max(0, index - 1))}>◀</button>
      <button className="btn-primary w-24" onClick={() => setPlaying((p) => !p)}>
        {playing ? '⏸ Pausar' : '▶ Reproducir'}
      </button>
      <button className="btn-secondary" onClick={() => onChange(Math.min(total - 1, index + 1))}>▶</button>
      <button className="btn-secondary" onClick={() => onChange(total - 1)}>⏭</button>
      <span className="ml-3 text-sm text-slate-600">
        Paso <strong>{index + 1}</strong> de {total}
      </span>
      <input
        type="range"
        min={0}
        max={total - 1}
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ml-3 flex-1"
      />
    </div>
  );
}
