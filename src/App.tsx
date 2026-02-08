import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./app/AppShell";
import DashboardPage from "./features/dashboard/DashboardPage";
import FeedScreenPage from "./features/feedScreen/FeedScreenPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/feed" element={<FeedScreenPage />} />
        <Route path="/feed/:feedId" element={<FeedScreenPage />} />
        <Route path="*" element={<div style={{ padding: 24 }}>404</div>} />
      </Route>
    </Routes>
  );
}
