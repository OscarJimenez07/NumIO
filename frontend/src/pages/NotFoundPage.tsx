import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-6xl font-bold text-brand-800">404</p>
        <p className="text-slate-600 mt-2 mb-6">Página no encontrada</p>
        <Link to="/" className="btn-primary">Volver al inicio</Link>
      </div>
    </div>
  );
}
