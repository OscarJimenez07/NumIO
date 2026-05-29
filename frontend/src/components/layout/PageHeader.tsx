interface Props {
  title: string;
  category?: string;
  description?: string;
  reference?: string;
}

export function PageHeader({ title, category, description, reference }: Props) {
  return (
    <header className="mb-6">
      {category && (
        <p className="text-xs uppercase tracking-wide text-brand-700 font-semibold mb-1">{category}</p>
      )}
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      {description && <p className="text-slate-600 mt-2">{description}</p>}
      {reference && <p className="text-xs text-slate-500 mt-1 italic">{reference}</p>}
    </header>
  );
}
