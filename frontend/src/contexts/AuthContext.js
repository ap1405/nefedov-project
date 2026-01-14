import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { authAPI } from '../services/api';
import api from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  const mountedRef = useRef(true);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = (setter, value) => {
    if (mountedRef.current) {
      setter(value);
    }
  };

  const extractTokenData = (token) => {
    try {
      if (!token) return null;
      
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      console.log('🔐 Извлечены данные из токена:', {
        userId: payload.userId,
        email: payload.email,
        companyId: payload.companyId,
        companyCode: payload.companyCode,
        role: payload.role
      });
      
      return payload;
    } catch (error) {
      console.error('❌ Ошибка декодирования токена:', error);
      return null;
    }
  };

  const setUserFromToken = async () => {
    // Защита от повторных вызовов при монтировании
    if (initialCheckDone.current) {
      console.log('⏩ Начальная проверка уже выполнена, пропускаем');
      return;
    }
    
    console.log('🔐 Начинаем проверку аутентификации...');
    
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('❌ Токен не найден в localStorage');
      safeSetState(setUser, null);
      safeSetState(setCompany, null);
      safeSetState(setAuthChecked, true);
      safeSetState(setIsLoading, false);
      initialCheckDone.current = true;
      return;
    }
    
    const payload = extractTokenData(token);
    
    if (!payload) {
      console.log('❌ Неверный формат токена');
      localStorage.removeItem('token');
      safeSetState(setUser, null);
      safeSetState(setCompany, null);
      safeSetState(setAuthChecked, true);
      safeSetState(setIsLoading, false);
      initialCheckDone.current = true;
      return;
    }
    
    // Устанавливаем базовые данные из токена
    safeSetState(setUser, {
      id: payload.userId,
      email: payload.email,
      full_name: payload.full_name || payload.email,
      role: payload.role
    });
    
    safeSetState(setCompany, {
      id: payload.companyId,
      code: payload.companyCode,
      name: `Компания ${payload.companyCode}`,
      company_code: payload.companyCode
    });
    
    console.log('✅ Базовые данные установлены из токена');
    
    // Пытаемся получить полную информацию о компании из API
    try {
      console.log('🔄 Запрос информации о компании...');
      const response = await api.get('/api/profile');
      
      if (response.data.success && response.data.profile) {
        const profile = response.data.profile;
        console.log('📊 Данные профиля получены:', profile);
        
        safeSetState(setCompany, {
          id: payload.companyId,
          code: payload.companyCode,
          name: profile.company_name || `Компания ${payload.companyCode}`,
          company_name: profile.company_name || `Компания ${payload.companyCode}`,
          company_code: payload.companyCode,
          telegram_support_link: profile.telegram_support_link || 'https://t.me/supwarehousebot'
        });
        
        // Обновляем пользователя если есть полное имя
        if (profile.full_name) {
          safeSetState(setUser, prev => ({
            ...prev,
            full_name: profile.full_name
          }));
        }
        
        console.log('✅ Полные данные компании получены');
      } else {
        console.log('⚠️ Не удалось получить полные данные компании, используем базовые');
      }
    } catch (error) {
      console.error('❌ Ошибка получения профиля:', error);
      console.log('⚠️ Используем базовые данные компании');
    } finally {
      safeSetState(setAuthChecked, true);
      safeSetState(setIsLoading, false);
      initialCheckDone.current = true;
      console.log('✅ Проверка аутентификации завершена');
    }
  };

  useEffect(() => {
    console.log('🏗️ Монтирование AuthProvider');
    
    // Выполняем проверку только один раз при монтировании
    if (!initialCheckDone.current) {
      setUserFromToken();
    }
    
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        console.log('🔄 Токен изменен в localStorage, обновляем состояние');
        // Сбрасываем флаг при изменении токена
        initialCheckDone.current = false;
        setUserFromToken();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      console.log('🗑️ Размонтирование AuthProvider');
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const loginCompany = async (email, password) => {
    try {
      console.log('🔐 Попытка входа компании:', email);
      
      setIsLoading(true);
      const response = await authAPI.loginCompany({ email, password });
      const data = response.data;
      
      console.log('📥 Ответ от сервера:', data);
      
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        
        const payload = extractTokenData(data.token);
        
        if (payload) {
          const userData = {
            id: payload.userId,
            email: payload.email,
            full_name: data.user?.full_name || payload.email,
            role: payload.role
          };
          
          const companyData = {
            id: payload.companyId,
            code: payload.companyCode,
            name: data.user?.company?.name || `Компания ${payload.companyCode}`,
            company_name: data.user?.company?.name || `Компания ${payload.companyCode}`,
            company_code: payload.companyCode
          };
          
          if (mountedRef.current) {
            setUser(userData);
            setCompany(companyData);
            setAuthChecked(true);
            setIsLoading(false);
          }
          
          console.log('✅ Успешный вход');
          return { success: true, user: userData, company: companyData };
        }
      }
      
      console.log('❌ Ошибка входа:', data.error);
      return { success: false, error: data.error || 'Ошибка входа' };
    } catch (error) {
      console.error('💥 Ошибка сети:', error);
      return { success: false, error: 'Ошибка подключения к серверу' };
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const loginUser = async (company_code, email, password) => {
    try {
      console.log('👤 Попытка входа пользователя:', { company_code, email });
      
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/api/auth/login-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_code, email, password })
      });
      
      const data = await response.json();
      console.log('📥 Ответ от сервера:', data);
      
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        
        const payload = extractTokenData(data.token);
        
        if (payload) {
          const userData = {
            id: payload.userId,
            email: payload.email,
            full_name: data.user?.full_name || payload.email,
            role: payload.role
          };
          
          const companyData = {
            id: payload.companyId,
            code: payload.companyCode,
            name: data.user?.company?.name || `Компания ${payload.companyCode}`,
            company_name: data.user?.company?.name || `Компания ${payload.companyCode}`,
            company_code: payload.companyCode
          };
          
          if (mountedRef.current) {
            setUser(userData);
            setCompany(companyData);
            setAuthChecked(true);
            setIsLoading(false);
          }
          
          console.log('✅ Успешный вход');
          return { success: true, user: userData, company: companyData };
        }
      }
      
      console.log('❌ Ошибка входа:', data.error);
      return { success: false, error: data.error || 'Ошибка входа' };
    } catch (error) {
      console.error('💥 Ошибка сети:', error);
      return { success: false, error: 'Ошибка подключения к серверу' };
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const registerCompany = async (companyData) => {
    try {
      console.log('📝 Регистрация компании:', companyData.email);
      
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/api/auth/register-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Регистрация успешна, выполняем вход...');
        const loginResult = await loginCompany(companyData.email, companyData.password);
        return loginResult;
      } else {
        console.log('❌ Ошибка регистрации:', data.error);
        return { success: false, error: data.error || 'Ошибка регистрации' };
      }
    } catch (error) {
      console.error('💥 Ошибка сети:', error);
      return { success: false, error: 'Ошибка регистрации' };
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const logout = () => {
    console.log('🚪 Выход из системы');
    localStorage.removeItem('token');
    localStorage.removeItem('selectedWarehouseId');
    
    if (mountedRef.current) {
      setUser(null);
      setCompany(null);
      setAuthChecked(true);
      setIsLoading(false);
      initialCheckDone.current = false; // Сбрасываем флаг при выходе
    }
  };

  const refreshAuth = () => {
    console.log('🔄 Принудительное обновление аутентификации');
    initialCheckDone.current = false;
    setUserFromToken();
  };

  const value = {
    user,
    company,
    isLoading,
    authChecked,
    loginCompany,
    loginUser,
    registerCompany,
    logout,
    refreshAuth,
    isAuthenticated: !!user && !!localStorage.getItem('token')
  };

  console.log('🔄 AuthContext рендерится:', { 
    user: user ? user.email : 'нет', 
    company: company ? company.name : 'нет',
    isLoading,
    authChecked,
    isAuthenticated: value.isAuthenticated
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};