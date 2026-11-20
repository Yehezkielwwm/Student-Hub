import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const SchedulePage = lazy(() => import('@/features/schedule/SchedulePage'))
const AssignmentsPage = lazy(() => import('@/features/assignments/AssignmentsPage'))
const RemindersPage = lazy(() => import('@/features/reminders/RemindersPage'))
const SubjectsPage = lazy(() => import('@/features/subjects/SubjectsPage'))
const SubjectDetailPage = lazy(() => import('@/features/subjects/SubjectDetailPage'))
const FilesPage = lazy(() => import('@/features/files/FilesPage'))
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="subjects/:id" element={<SubjectDetailPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
