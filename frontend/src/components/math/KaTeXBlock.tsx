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
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
