import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RequireAuth } from './components/layout/RequireAuth';
import { RequireRole } from './components/layout/RequireRole';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { RecuperarContrasenaPage } from './pages/auth/RecuperarContrasenaPage';
import { CambiarContrasenaPage } from './pages/auth/CambiarContrasenaPage';
import { HomePage } from './pages/HomePage';
import { StudentDashboard } from './pages/dashboard/StudentDashboard';
import { BisectionPage } from './pages/numerical/BisectionPage';
import { NewtonRaphsonPage } from './pages/numerical/NewtonRaphsonPage';
import { LagrangePage } from './pages/numerical/LagrangePage';
import { NewtonDividedPage } from './pages/numerical/NewtonDividedPage';
import { TrapezoidalPage } from './pages/numerical/TrapezoidalPage';
import { Simpson13Page } from './pages/numerical/Simpson13Page';
import { Simpson38Page } from './pages/numerical/Simpson38Page';
import { SimplexPage } from './pages/operations/SimplexPage';
import { TransportationPage } from './pages/operations/TransportationPage';
import { AssignmentPage } from './pages/operations/AssignmentPage';
import { PreTestPage } from './pages/pilot/PreTestPage';
import { PostTestPage } from './pages/pilot/PostTestPage';
import { OpinionSurveyPage } from './pages/pilot/OpinionSurveyPage';
import { OpinionResultsPage } from './pages/teacher/OpinionResultsPage';
import { ResultsDashboard } from './pages/teacher/ResultsDashboard';
import { UsersList } from './pages/teacher/UsersList';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/recuperar-contrasena', element: <RecuperarContrasenaPage /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'dashboard', element: <StudentDashboard /> },
      { path: 'cambiar-contrasena', element: <CambiarContrasenaPage /> },
      // Numerical
      { path: 'numerical/bisection', element: <BisectionPage /> },
      { path: 'numerical/newton-raphson', element: <NewtonRaphsonPage /> },
      { path: 'numerical/lagrange', element: <LagrangePage /> },
      { path: 'numerical/newton-divided', element: <NewtonDividedPage /> },
      { path: 'numerical/trapezoidal', element: <TrapezoidalPage /> },
      { path: 'numerical/simpson-1-3', element: <Simpson13Page /> },
      { path: 'numerical/simpson-3-8', element: <Simpson38Page /> },
      // Operations
      { path: 'operations/simplex', element: <SimplexPage /> },
      { path: 'operations/transportation', element: <TransportationPage /> },
      { path: 'operations/assignment', element: <AssignmentPage /> },
      // Pilot
      { path: 'pilot/pre-test', element: <PreTestPage /> },
      { path: 'pilot/post-test', element: <PostTestPage /> },
      // La SUS ahora va dentro de la encuesta de opinión.
      { path: 'pilot/sus', element: <Navigate to="/pilot/opinion" replace /> },
      { path: 'pilot/opinion', element: <OpinionSurveyPage /> },
      // Teacher (con guardia de rol)
      {
        path: 'teacher/results',
        element: (
          <RequireRole roles={['TEACHER', 'ADMIN']}>
            <ResultsDashboard />
          </RequireRole>
        ),
      },
      {
        path: 'teacher/opinion',
        element: (
          <RequireRole roles={['TEACHER', 'ADMIN']}>
            <OpinionResultsPage />
          </RequireRole>
        ),
      },
      {
        path: 'teacher/students',
        element: (
          <RequireRole roles={['TEACHER', 'ADMIN']}>
            <UsersList />
          </RequireRole>
        ),
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
  { path: '/404', element: <NotFoundPage /> },
  { path: '/home', element: <Navigate to="/" replace /> },
]);
