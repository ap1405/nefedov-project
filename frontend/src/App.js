import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WarehouseProvider } from './contexts/WarehouseContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Страницы
import Login from './pages/Login';
import RegisterCompany from './pages/RegisterCompany';
import Dashboard from './pages/Dashboard';
import Warehouses from './pages/Warehouses';
import Nomenclature from './pages/Nomenclature';
import StorageCells from './pages/StorageCells';
import Receipts from './pages/Receipts';
import Writeoffs from './pages/Writeoffs';
import Movements from './pages/Movements';
import Reports from './pages/Reports';
import UsersManagement from './pages/UsersManagement';
import ProfileSettings from './pages/ProfileSettings';

// Компонент-обертка для страниц с Layout
const PageWrapper = ({ children }) => {
  console.log('📄 PageWrapper рендерится с детьми:', children);
  return <Layout>{children}</Layout>;
};

function App() {
  console.log('🚀 App запущен');
  
  return (
    <Router>
      <AuthProvider>
        <WarehouseProvider>
          <Routes>
            {/* Публичные маршруты */}
            <Route path="/login" element={<Login />} />
            <Route path="/register-company" element={<RegisterCompany />} />
            
            {/* Защищенные маршруты */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <PageWrapper>
                  <Dashboard />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/warehouses" element={
              <ProtectedRoute>
                <PageWrapper>
                  <Warehouses />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/nomenclature" element={
              <ProtectedRoute>
                <PageWrapper>
                  <Nomenclature />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/storage-cells" element={
              <ProtectedRoute>
                <PageWrapper>
                  <StorageCells />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/receipts" element={
              <ProtectedRoute>
                <PageWrapper>
                  <Receipts />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/writeoffs" element={
              <ProtectedRoute>
                <PageWrapper>
                  <Writeoffs />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/movements" element={
              <ProtectedRoute>
                <PageWrapper>
                  <Movements />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute>
                <PageWrapper>
                  <Reports />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/users" element={
              <ProtectedRoute>
                <PageWrapper>
                  <UsersManagement />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            {/* Тестовый маршрут */}
            <Route path="/test" element={
              <ProtectedRoute>
                <PageWrapper>
                  <div style={{ padding: '20px' }}>
                    <h1>✅ Тестовая страница работает!</h1>
                    <p>Если вы видите этот текст, значит Layout и children работают правильно!</p>
                  </div>
                </PageWrapper>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <PageWrapper>
                  <ProfileSettings />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            {/* Редиректы */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </WarehouseProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;