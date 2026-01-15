import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  InputAdornment,
  Snackbar,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  LockReset as LockResetIcon,
  AdminPanelSettings as AdminIcon,
  ManageAccounts as ManagerIcon,
  PersonOutline as EmployeeIcon
} from '@mui/icons-material';
import api from '../services/api';

const UsersManagement = () => {
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [formData, setFormData] = useState({
    id: null,
    email: '',
    password: '',
    full_name: '',
    role: 'employee',
    phone: '',
    is_active: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔄 Загрузка пользователей через API...');
      const response = await api.get('/api/users');
      
      if (response.data.success) {
        console.log('✅ Пользователи загружены:', response.data.users.length);
        setUsers(response.data.users);
      } else {
        setError(response.data.error || 'Ошибка загрузки пользователей');
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки пользователей:', err);
      
      if (err.response) {
        console.error('📊 Данные ответа:', {
          status: err.response.status,
          data: err.response.data
        });
        
        if (err.response.status === 404) {
          setError('Эндпоинт не найден. Проверьте доступность API.');
        } else if (err.response.status === 403) {
          setError('Нет прав для просмотра пользователей');
        } else {
          setError(`Ошибка сервера: ${err.response.status}`);
        }
      } else if (err.request) {
        setError('Сервер не отвечает. Проверьте подключение.');
      } else {
        setError('Ошибка настройки запроса: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setFormData({
        id: user.id,
        email: user.email,
        password: '', // Не показываем пароль при редактировании
        full_name: user.full_name || '',
        role: user.role || 'employee',
        phone: user.phone || '',
        is_active: user.is_active
      });
    } else {
      setFormData({
        id: null,
        email: '',
        password: '',
        full_name: '',
        role: 'employee',
        phone: '',
        is_active: true
      });
    }
    setOpenDialog(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.checked }));
  };

  const validateForm = () => {
    if (!formData.email) {
      setError('Введите email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Введите корректный email');
      return false;
    }
    if (!formData.full_name) {
      setError('Введите ФИО');
      return false;
    }
    if (!formData.id && !formData.password) {
      setError('Введите пароль для нового пользователя');
      return false;
    }
    if (!formData.id && formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (formData.id) {
        // Обновление пользователя - правильный URL с /api/
        const response = await api.put(`/api/users/${formData.id}`, {
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone,
          is_active: formData.is_active
        });
        
        if (response.data.success) {
          showMessage('Пользователь обновлен', 'success');
          fetchUsers();
          handleCloseDialog();
        } else {
          setError(response.data.error || 'Ошибка обновления пользователя');
        }
      } else {
        // Создание пользователя - правильный URL с /api/
        const response = await api.post('/api/users', {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone
        });
        
        if (response.data.success) {
          showMessage('Пользователь создан', 'success');
          fetchUsers();
          handleCloseDialog();
        } else {
          setError(response.data.error || 'Ошибка создания пользователя');
        }
      }
    } catch (err) {
      console.error('❌ Ошибка сохранения пользователя:', err);
      
      if (err.response) {
        console.error('📊 Данные ответа:', {
          status: err.response.status,
          data: err.response.data
        });
        
        if (err.response.status === 404) {
          setError('API эндпоинт не найден. Проверьте правильность URL.');
        } else {
          setError(err.response.data?.error || 'Ошибка сохранения пользователя');
        }
      } else if (err.request) {
        setError('Сервер не отвечает');
      } else {
        setError('Ошибка настройки запроса: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm('Сбросить пароль пользователя? Новый пароль будет: "user123"')) {
      return;
    }

    setLoading(true);
    try {
      // Здесь можно реализовать API для сброса пароля
      // Временно показываем сообщение
      showMessage('Функция сброса пароля в разработке', 'info');
    } catch (err) {
      showMessage('Ошибка сброса пароля', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <AdminIcon color="primary" />;
      case 'manager': return <ManagerIcon color="secondary" />;
      case 'employee': return <EmployeeIcon color="action" />;
      default: return <PersonIcon />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'primary';
      case 'manager': return 'secondary';
      case 'employee': return 'default';
      default: return 'default';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'manager': return 'Менеджер';
      case 'employee': return 'Сотрудник';
      default: return role;
    }
  };

  const showMessage = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Управление пользователями
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Добавить пользователя
        </Button>
      </Box>

      {/* Поиск */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          label="Поиск пользователей"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Сообщения */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Статистика */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Всего пользователей
              </Typography>
              <Typography variant="h3">
                {users.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Администраторы
              </Typography>
              <Typography variant="h3" color="primary.main">
                {users.filter(u => u.role === 'admin').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Менеджеры
              </Typography>
              <Typography variant="h3" color="secondary.main">
                {users.filter(u => u.role === 'manager').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Активные
              </Typography>
              <Typography variant="h3" color="success.main">
                {users.filter(u => u.is_active).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Таблица пользователей */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Пользователь</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell>Контакт</TableCell>
              <TableCell>Последний вход</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Пользователи не найдены
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </Avatar>
                      <Box>
                        <Typography fontWeight="bold">
                          {user.full_name || 'Не указано'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getRoleIcon(user.role)}
                      label={getRoleText(user.role)}
                      color={getRoleColor(user.role)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography>{user.phone || 'Не указан'}</Typography>
                  </TableCell>
                  <TableCell>
                    {user.last_login ? (
                      new Date(user.last_login).toLocaleString('ru-RU')
                    ) : (
                      'Никогда'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_active ? 'Активен' : 'Заблокирован'}
                      color={user.is_active ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Редактировать">
                        <IconButton size="small" onClick={() => handleOpenDialog(user)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Сбросить пароль">
                        <IconButton 
                          size="small" 
                          onClick={() => handleResetPassword(user.id)}
                          color="warning"
                        >
                          <LockResetIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Диалог создания/редактирования */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {formData.id ? 'Редактирование пользователя' : 'Новый пользователь'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="email"
                label="Email *"
                type="email"
                value={formData.email}
                onChange={handleFormChange}
                disabled={!!formData.id}
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
                name="full_name"
                label="ФИО *"
                value={formData.full_name}
                onChange={handleFormChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            {!formData.id && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="password"
                  label="Пароль *"
                  type="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  helperText="Минимум 6 символов"
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Роль *</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  label="Роль *"
                  onChange={handleFormChange}
                >
                  <MenuItem value="employee">
                    <Box display="flex" alignItems="center">
                      <EmployeeIcon sx={{ mr: 1 }} />
                      Сотрудник
                    </Box>
                  </MenuItem>
                  <MenuItem value="manager">
                    <Box display="flex" alignItems="center">
                      <ManagerIcon sx={{ mr: 1 }} />
                      Менеджер
                    </Box>
                  </MenuItem>
                  <MenuItem value="admin">
                    <Box display="flex" alignItems="center">
                      <AdminIcon sx={{ mr: 1 }} />
                      Администратор
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
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
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={handleSwitchChange}
                    name="is_active"
                    color="primary"
                  />
                }
                label="Активный пользователь"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar для уведомлений */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UsersManagement;