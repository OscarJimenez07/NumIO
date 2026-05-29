interface Props {
  flat: number[];
  rows: number;
  cols: number;
  basis?: number[];
  pivotRow?: number;
  pivotCol?: number;
  varNames?: string[];
}

export function TableauView({ flat, rows, cols, basis, pivotRow, pivotCol, varNames }: Props) {
  const matrix: number[][] = [];
  for (let i = 0; i < rows; i++) matrix.push(flat.slice(i * cols, (i + 1) * cols));

  const headers = varNames ?? Array.from({ length: cols - 1 }, (_, j) => `c${j + 1}`).concat('RHS');

  return (
    <div className="overflow-x-auto card">
      <table className="table-clean">
        <thead>
          <tr>
            <th>Base</th>
            {headers.map((h, j) => (
              <th key={j} className={`font-mono ${pivotCol === j ? 'bg-amber-100' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i} className={pivotRow === i ? 'bg-amber-50' : ''}>
              <td className="font-medium">
                {i === rows - 1 ? 'Z' : basis ? `x${(basis[i] ?? 0) + 1}` : `R${i + 1}`}
              </td>
              {row.map((v, j) => (
                <td
                  key={j}
                  className={`font-mono ${pivotRow === i && pivotCol === j ? 'bg-amber-200 font-bold' : ''}`}
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
