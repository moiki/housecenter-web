import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { ADMIN_ABOVE, STAFF_ONLY } from '@/lib/constants'

import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { RequireAuth } from '@/components/guards/RequireAuth'
import { RequireRole } from '@/components/guards/RequireRole'
import { AuthBootstrap } from '@/components/guards/AuthBootstrap'

import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { ClinicsPage } from '@/pages/clinics/ClinicsPage'
import { ClinicDetailPage } from '@/pages/clinics/ClinicDetailPage'
import { WorkRoutesPage } from '@/pages/work-routes/WorkRoutesPage'
import { WorkRouteDetailPage } from '@/pages/work-routes/WorkRouteDetailPage'
import { CollaboratorsPage } from '@/pages/collaborators/CollaboratorsPage'
import { UsersPage } from '@/pages/management/UsersPage'
import { InvitationsPage } from '@/pages/management/InvitationsPage'
import { PatientsPage } from '@/pages/patients/PatientsPage'
import { PatientProfilePage } from '@/pages/patients/PatientProfilePage'
import { ConsultationsPage } from '@/pages/consultations/ConsultationsPage'
import { ConsultationDetailPage } from '@/pages/consultations/ConsultationDetailPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

const router = createBrowserRouter([
  // Public auth pages
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },

  // Protected app shell
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },

          // Modules available to all roles — pages added in T5–T14
          { path: '/clinics', element: <ClinicsPage /> },
          { path: '/clinics/:id', element: <ClinicDetailPage /> },
          { path: '/work-routes', element: <WorkRoutesPage /> },
          { path: '/work-routes/:id', element: <WorkRouteDetailPage /> },
          { path: '/patients', element: <PatientsPage /> },
          { path: '/patients/:id', element: <PatientProfilePage /> },
          { path: '/reports', element: <ReportsPage /> },

          // Staff-only (no Sponsor)
          {
            element: <RequireRole roles={STAFF_ONLY} />,
            children: [
              { path: '/consultations', element: <ConsultationsPage /> },
              { path: '/consultations/:id', element: <ConsultationDetailPage /> },
            ],
          },

          // Admin/Owner only
          {
            element: <RequireRole roles={ADMIN_ABOVE} />,
            children: [
              { path: '/collaborators', element: <CollaboratorsPage /> },
              { path: '/management/users', element: <UsersPage /> },
              { path: '/management/invitations', element: <InvitationsPage /> },
            ],
          },

          { path: '/settings', element: <SettingsPage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
    </QueryClientProvider>
  )
}
