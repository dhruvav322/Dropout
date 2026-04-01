import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import StudentPage from './pages/StudentPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Hidden admin route — no sidebar, no header, full takeover */}
        <Route path="/admin" element={<AdminPage />} />

        {/* Public routes with standard layout */}
        <Route
          path="*"
          element={
            <div className="app-layout">
              <Sidebar />
              <Header institution="Riverdale College" />
              <main className="main-content">
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/upload" element={<UploadPage />} />
                    <Route path="/student/:studentId" element={<StudentPage />} />
                  </Routes>
                </AnimatePresence>
              </main>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
