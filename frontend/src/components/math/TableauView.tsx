interface Props {
  flat: number[];
  rows: number;
  cols: number;
  basis?: number[];
  pivotRow?: number;
  pivotCol?: number;
  varNames?: string[];
  /** Nombre de la fila objetivo: «W» en la fase 1 del método de dos fases. */
  objectiveLabel?: string;
}

export function TableauView({ flat, rows, cols, basis, pivotRow, pivotCol, varNames, objectiveLabel = 'Z' }: Props) {
  const matrix: number[][] = [];
  for (let i = 0; i < rows; i++) matrix.push(flat.slice(i * cols, (i + 1) * cols));

  const headers = (varNames ?? Array.from({ length: cols - 1 }, (_, j) => `c${j + 1}`)).concat('RHS');
  const nombre = (j: number) => varNames?.[j] ?? `x${j + 1}`;

  return (
    <div className="overflow-x-auto card">
      <table className="table-clean">
        <thead>
          <tr>
            <th>Base</th>
            {headers.map((h, j) => (
              <th key={j} className={`font-mono ${pivotCol === j ? 'bg-brand-100 text-brand-900' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i} className={pivotRow === i ? 'bg-brand-50' : ''}>
              <td className="font-medium">
                {i === rows - 1 ? objectiveLabel : basis ? nombre(basis[i] ?? 0) : `R${i + 1}`}
              </td>
              {row.map((v, j) => (
                <td
                  key={j}
                  className={`font-mono ${pivotRow === i && pivotCol === j ? 'bg-brand-300 font-bold text-brand-900 ring-1 ring-inset ring-brand-600' : ''}`}
                >
                  {Number(v).toFixed(3)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
