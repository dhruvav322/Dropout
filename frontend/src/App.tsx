import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import StudentPage from './pages/StudentPage';
import AdminPage from './pages/AdminPage';
import { InstitutionProvider } from './context/InstitutionContext';
import { SearchProvider } from './context/SearchContext';

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
            <InstitutionProvider>
              <SearchProvider>
                <div className="app-layout">
                  <Sidebar />
                  <Header />
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
              </SearchProvider>
            </InstitutionProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
