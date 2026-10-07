import { InputHTMLAttributes, useEffect, useState } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number;
  onChange: (valor: number) => void;
};

const aTexto = (v: number) => (Number.isFinite(v) ? String(v) : '');

/**
 * Campo numérico que se puede vaciar.
 *
 * Con un <input type="number"> atado directamente a un número, borrar el
 * último dígito deja la cadena vacía y Number('') la convierte en 0, así que
 * el campo nunca queda en blanco. Aquí el texto se guarda aparte: mientras el
 * campo está vacío el valor que se informa es NaN, y al resolver useSolver
 * avisa que falta completarlo.
 *
 * Si quien lo usa no acepta el valor (p. ej. un tamaño de matriz vacío) y
 * conserva el anterior, al salir del campo se vuelve a mostrar ese valor.
 */
export function NumberInput({ value, onChange, onBlur, ...rest }: Props) {
  const [texto, setTexto] = useState(aTexto(value));

  // Un cambio que llega de fuera (otro tamaño, otro ejemplo) se refleja.
  useEffect(() => {
    const actual = texto.trim() === '' ? NaN : Number(texto);
    if (!Object.is(actual, value)) setTexto(aTexto(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      {...rest}
      type="number"
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value);
        onChange(e.target.value.trim() === '' ? NaN : Number(e.target.value));
      }}
      onBlur={(e) => {
        if (texto.trim() === '' && Number.isFinite(value)) setTexto(aTexto(value));
        onBlur?.(e);
      }}
    />
  );
}
