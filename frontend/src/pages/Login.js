import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import { Lock as LockIcon, Business as BusinessIcon, Person as PersonIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [tab, setTab] = useState(0);
  const [companyData, setCompanyData] = useState({ email: '', password: '' });
  const [userData, setUserData] = useState({ company_code: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginCompany, loginUser } = useAuth();
  const navigate = useNavigate();
  
  // Реф для отслеживания монтирования компонента
  const mountedRef = useRef(true);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setError('');
  };

  const handleCompanyInputChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({ ...prev, [name]: value }));
  };

  const handleUserInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleCompanyLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Начало входа компании:', companyData.email);
      const result = await loginCompany(companyData.email, companyData.password);
      
      // Проверяем, смонтирован ли еще компонент
      if (!mountedRef.current) return;
      
      if (result.success) {
        console.log('✅ Успешный вход, переход на главную...');
        navigate('/');
      } else {
        console.log('❌ Ошибка входа компании:', result.error);
        setError(result.error || 'Неверный email или пароль');
      }
    } catch (err) {
      // Проверяем, смонтирован ли еще компонент
      if (!mountedRef.current) return;
      console.error('💥 Неожиданная ошибка входа:', err);
      setError('Произошла ошибка при входе');
    } finally {
      // Проверяем, смонтирован ли еще компонент
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleUserLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('👤 Начало входа пользователя:', userData.email);
      const result = await loginUser(userData.company_code, userData.email, userData.password);
      
      // Проверяем, смонтирован ли еще компонент
      if (!mountedRef.current) return;
      
      if (result.success) {
        console.log('✅ Успешный вход, переход на главную...');
        navigate('/');
      } else {
        console.log('❌ Ошибка входа пользователя:', result.error);
        setError(result.error || 'Неверные данные для входа');
      }
    } catch (err) {
      // Проверяем, смонтирован ли еще компонент
      if (!mountedRef.current) return;
      console.error('💥 Неожиданная ошибка входа:', err);
      setError('Произошла ошибка при входе');
    } finally {
      // Проверяем, смонтирован ли еще компонент
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 0, width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tab} onChange={handleTabChange} variant="fullWidth">
              <Tab 
                icon={<BusinessIcon />} 
                label="Вход для компании" 
                iconPosition="start"
              />
              <Tab 
                icon={<PersonIcon />} 
                label="Вход для сотрудника" 
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <Box sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {tab === 0 ? (
              <Box component="form" onSubmit={handleCompanyLogin} noValidate>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                  <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
                    <BusinessIcon />
                  </Avatar>
                  <Typography component="h1" variant="h5">
                    Вход для компании
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Для администраторов компании
                  </Typography>
                </Box>

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email компании"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={companyData.email}
                  onChange={handleCompanyInputChange}
                  disabled={loading}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Пароль компании"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  value={companyData.password}
                  onChange={handleCompanyInputChange}
                  disabled={loading}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Войти'}
                </Button>

                <Divider sx={{ my: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Нет компании?
                  </Typography>
                </Divider>

                <Button
                  component={Link}
                  to="/register-company"
                  fullWidth
                  variant="outlined"
                >
                  Зарегистрировать компанию
                </Button>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Для демонстрации используйте:
                    <br />
                    Email: <strong>admin@techmostore.ru</strong>
                    <br />
                    Пароль: <strong>admin123</strong>
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleUserLogin} noValidate>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                  <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                    <PersonIcon />
                  </Avatar>
                  <Typography component="h1" variant="h5">
                    Вход для сотрудника
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Для менеджеров и сотрудников
                  </Typography>
                </Box>

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="company_code"
                  label="Код компании"
                  name="company_code"
                  value={userData.company_code}
                  onChange={handleUserInputChange}
                  disabled={loading}
                  helperText="Спросите у администратора компании"
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Ваш email"
                  name="email"
                  autoComplete="email"
                  value={userData.email}
                  onChange={handleUserInputChange}
                  disabled={loading}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Ваш пароль"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  value={userData.password}
                  onChange={handleUserInputChange}
                  disabled={loading}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Войти'}
                </Button>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Для демонстрации используйте:
                    <br />
                    Код компании: <strong>COMP001</strong>
                    <br />
                    Email: <strong>admin@techmostore.ru</strong>
                    <br />
                    Пароль: <strong>user123</strong>
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;