import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CameraAlt as CameraAltIcon
} from '@mui/icons-material';
import { profileAPI } from '../services/api';

const ProfileSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profile, setProfile] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    avatar_url: ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await profileAPI.getProfile();
      if (response.data.success) {
        setProfile(response.data.profile);
        setFormData({
          full_name: response.data.profile.full_name || '',
          phone: response.data.profile.phone || '',
          avatar_url: response.data.profile.avatar_url || ''
        });
      } else {
        setError(response.data.error || 'Ошибка загрузки профиля');
      }
    } catch (err) {
      setError('Ошибка загрузки профиля: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!formData.full_name.trim()) {
      setError('Введите ФИО');
      return;
    }

    setSaving(true);
    try {
      const response = await profileAPI.updateProfile(formData);
      if (response.data.success) {
        setSuccess('Профиль успешно обновлен');
        fetchProfile(); // Обновляем данные
      } else {
        setError(response.data.error || 'Ошибка обновления профиля');
      }
    } catch (err) {
      setError('Ошибка обновления профиля: ' + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      setError('Заполните все поля');
      return;
    }

    if (passwordData.new_password.length < 6) {
      setError('Новый пароль должен содержать минимум 6 символов');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Новые пароли не совпадают');
      return;
    }

    setSaving(true);
    try {
      const response = await profileAPI.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      if (response.data.success) {
        setSuccess('Пароль успешно изменен');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      } else {
        setError(response.data.error || 'Ошибка смены пароля');
      }
    } catch (err) {
      setError('Ошибка смены пароля: ' + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Здесь можно реализовать загрузку файла на сервер
      // Временно используем URL.createObjectURL для предпросмотра
      const url = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, avatar_url: url }));
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Заголовок */}
      <Typography variant="h4" gutterBottom>
        <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Настройки профиля
      </Typography>

      {/* Сообщения */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Карточка профиля */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              title="Профиль"
              subheader="Основная информация"
            />
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center">
                <Box position="relative" sx={{ mb: 2 }}>
                  <Avatar
                    src={formData.avatar_url}
                    sx={{
                      width: 120,
                      height: 120,
                      fontSize: '48px',
                      bgcolor: 'primary.main'
                    }}
                  >
                    {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                  </Avatar>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="avatar-upload"
                    type="file"
                    onChange={handleAvatarChange}
                  />
                  <label htmlFor="avatar-upload">
                    <IconButton
                      component="span"
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'primary.dark'
                        }
                      }}
                    >
                      <CameraAltIcon />
                    </IconButton>
                  </label>
                </Box>
                
                <Typography variant="h6" align="center" gutterBottom>
                  {profile?.full_name || 'Не указано'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
                  {profile?.email}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" align="center">
                  {profile?.role === 'admin' ? 'Администратор' : 
                   profile?.role === 'manager' ? 'Менеджер' : 'Сотрудник'}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Компания:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {profile?.company_name || 'Не указана'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Код: {profile?.company_code}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Форма редактирования профиля */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title="Редактирование профиля"
              subheader="Измените ваши личные данные"
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="full_name"
                    label="ФИО"
                    value={formData.full_name}
                    onChange={handleFormChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="email"
                    label="Email"
                    value={profile?.email || ''}
                    disabled
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="phone"
                    label="Телефон"
                    value={formData.phone}
                    onChange={handleFormChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="avatar_url"
                    label="URL аватара"
                    value={formData.avatar_url}
                    onChange={handleFormChange}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end">
                    <Button
                      variant="contained"
                      onClick={handleSaveProfile}
                      disabled={saving}
                      sx={{ minWidth: 120 }}
                    >
                      {saving ? <CircularProgress size={24} /> : 'Сохранить'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Смена пароля */}
          <Card sx={{ mt: 3 }}>
            <CardHeader
              title="Смена пароля"
              subheader="Измените ваш пароль"
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="current_password"
                    label="Текущий пароль"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="new_password"
                    label="Новый пароль"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="confirm_password"
                    label="Подтверждение пароля"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end">
                    <Button
                      variant="contained"
                      onClick={handleChangePassword}
                      disabled={saving}
                      sx={{ minWidth: 120 }}
                    >
                      {saving ? <CircularProgress size={24} /> : 'Сменить пароль'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProfileSettings;