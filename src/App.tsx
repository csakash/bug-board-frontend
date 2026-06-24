import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { BoardPage } from './pages/BoardPage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { AppShellSkeleton } from './components/Skeleton';

export default function App() {
  const { user, loading, fetchMe } = useAuth();

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  if (loading) {
    return <AppShellSkeleton />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<BoardPage />} />
        <Route path="/projects/:projectId/issues/:issueId" element={<IssueDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
