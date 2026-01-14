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
  Grid,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { Business as BusinessIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const RegisterCompany = () => {
  const [step, setStep] = useState(0);
  const [companyData, setCompanyData] = useState({
    company_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { registerCompany } = useAuth();
  const navigate = useNavigate();
  
  // Реф для отслеживания монтирования компонента
  const mountedRef = useRef(true);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const steps = ['Информация о компании', 'Данные для входа'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!companyData.company_name.trim()) {
      setError('Введите название компании');
      return false;
    }
    if (!companyData.email.trim()) {
      setError('Введите email компании');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(companyData.email)) {
      setError('Введите корректный email');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!companyData.password) {
      setError('Введите пароль');
      return false;
    }
    if (companyData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return false;
    }
    if (companyData.password !== companyData.confirmPassword) {
      setError('Пароли не совпадают');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 0 && validateStep1()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateStep2()) {
      return;
    }

    setLoading(true);
    try {
      console.log('📝 Начало регистрации компании...');
      const result = await registerCompany({
        company_name: companyData.company_name,
        email: companyData.email,
        password: companyData.password,
        phone: companyData.phone,
        address: companyData.address
      });

      console.log('📥 Результат регистрации:', result);

      // Проверяем, смонтирован ли еще компонент
      if (!mountedRef.current) return;
      
      if (result.success) {
        console.log('✅ Регистрация успешна, переход на главную...');
        navigate('/');
      } else {
        console.log('❌ Ошибка регистрации:', result.error);
        setError(result.error || 'Ошибка регистрации');
      }
    } catch (err) {
      // Проверяем, смонтирован ли еще компонент
      if (!mountedRef.current) return;
      console.error('💥 Неожиданная ошибка при регистрации:', err);
      setError('Произошла ошибка при регистрации');
    } finally {
      // Проверяем, смонтирован ли еще компонент
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Button
              component={Link}
              to="/login"
              startIcon={<ArrowBackIcon />}
              sx={{ mr: 2 }}
            >
              Назад
            </Button>
            <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
              <BusinessIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              Регистрация компании
            </Typography>
          </Box>

          <Stepper activeStep={step} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {step === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="company_name"
                  label="Название компании"
                  value={companyData.company_name}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  name="email"
                  label="Email компании"
                  type="email"
                  value={companyData.email}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="phone"
                  label="Телефон компании"
                  value={companyData.phone}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="address"
                  label="Адрес компании"
                  multiline
                  rows={2}
                  value={companyData.address}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          )}

          {step === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Пароль"
                  type="password"
                  value={companyData.password}
                  onChange={handleInputChange}
                  helperText="Минимум 6 символов"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Подтверждение пароля"
                  type="password"
                  value={companyData.confirmPassword}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              onClick={handleBack}
              disabled={step === 0 || loading}
            >
              Назад
            </Button>
            
            {step === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Зарегистрировать компанию'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
              >
                Далее
              </Button>
            )}
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Уже есть компания?{' '}
              <Button component={Link} to="/login" size="small">
                Войти
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterCompany;