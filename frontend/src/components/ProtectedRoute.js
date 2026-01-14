import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, authChecked } = useAuth();
  const location = useLocation();

  console.log('🔐 ProtectedRoute проверка:', { 
    isAuthenticated, 
    isLoading, 
    authChecked,
    pathname: location.pathname,
    hasToken: !!localStorage.getItem('token')
  });

  // Если проверка аутентификации еще не завершена, показываем загрузку
  if (isLoading || !authChecked) {
    console.log('⏳ ProtectedRoute: проверка аутентификации...');
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{ bgcolor: 'background.default' }}
      >
        <CircularProgress />
        <Box sx={{ ml: 2 }}>
          Проверка аутентификации...
        </Box>
      </Box>
    );
  }

  // Если не аутентифицирован, редирект на логин
  if (!isAuthenticated) {
    console.log('🚫 ProtectedRoute: пользователь не аутентифицирован, редирект на /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Если аутентифицирован, показываем контент
  console.log('✅ ProtectedRoute: пользователь аутентифицирован, показываем контент');
  
  return children;
};

export default ProtectedRoute;