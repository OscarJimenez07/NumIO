import katex from 'katex';
import { useMemo } from 'react';

export function KaTeXBlock({ tex, displayMode = true }: { tex: string; displayMode?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode, throwOnError: false });
    } catch {
      return tex;
    }
  }, [tex, displayMode]);
  // En modo bloque las cuentas pueden ser anchas (varias igualdades por
  // renglón): se desplazan de lado en pantallas angostas en vez de desbordar.
  if (displayMode) {
    return <span className="block max-w-full overflow-x-auto py-1" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
