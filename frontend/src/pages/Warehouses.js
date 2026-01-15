import React, { useState, useEffect, useRef } from 'react';
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
  Grid,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Warehouse as WarehouseIcon,
  Business as BusinessIcon,
  Factory as FactoryIcon
} from '@mui/icons-material';
import { useWarehouse } from '../contexts/WarehouseContext';
import { warehousesAPI } from '../services/api';

const Warehouses = () => {
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { warehouses, selectedWarehouse, fetchWarehouses, setSelectedWarehouse } = useWarehouse();
  const [localWarehouses, setLocalWarehouses] = useState([]);
  
  // Реф для отслеживания монтирования
  const mountedRef = useRef(true);

  const [formData, setFormData] = useState({
    id: null,
    name: '',
    address: '',
    type: 'main',
    contact_person: '',
    contact_phone: '',
    email: '',
    capacity: '',
    description: ''
  });

  useEffect(() => {
    // Устанавливаем флаг монтирования
    mountedRef.current = true;
    
    fetchData();
    
    // Очистка при размонтировании
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = async () => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    try {
      // Используем warehousesAPI из api.js
      const response = await warehousesAPI.getAll();
      
      if (response.data.success && mountedRef.current) {
        // Используем данные из API
        console.log('✅ Склады загружены из API:', response.data.warehouses);
        
        const warehousesData = response.data.warehouses;
        setLocalWarehouses(warehousesData);
        
        setError('');
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('❌ Ошибка загрузки складов через API:', err);
        setError('Ошибка загрузки складов: ' + (err.message || 'Неизвестная ошибка'));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleOpenDialog = (warehouse = null) => {
    if (warehouse) {
      setFormData({
        id: warehouse.id,
        name: warehouse.name || '',
        address: warehouse.address || '',
        type: warehouse.type || 'main',
        contact_person: warehouse.contact_person || '',
        contact_phone: warehouse.contact_phone || '',
        email: warehouse.email || '',
        capacity: warehouse.capacity || '',
        description: warehouse.description || ''
      });
    } else {
      setFormData({
        id: null,
        name: '',
        address: '',
        type: 'main',
        contact_person: '',
        contact_phone: '',
        email: '',
        capacity: '',
        description: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.address) {
      setError('Заполните обязательные поля (Название и Адрес)');
      return;
    }

    setLoading(true);
    try {
      if (formData.id) {
        // Обновление существующего склада
        const response = await warehousesAPI.update(formData.id, {
          name: formData.name,
          address: formData.address,
          description: formData.description,
          contact_person: formData.contact_person,
          contact_phone: formData.contact_phone,
          type: formData.type
        });
        
        if (response.data.success) {
          setSuccess('Склад обновлен');
        } else {
          setError(response.data.error || 'Ошибка обновления');
        }
      } else {
        // Создание нового склада
        const response = await warehousesAPI.create({
          name: formData.name,
          address: formData.address,
          description: formData.description,
          contact_person: formData.contact_person,
          contact_phone: formData.contact_phone,
          type: formData.type
        });
        
        if (response.data.success) {
          setSuccess('Склад создан');
        } else {
          setError(response.data.error || 'Ошибка создания');
        }
      }
      
      // Закрываем диалог и обновляем данные
      if (!error) {
        setTimeout(() => {
          handleCloseDialog();
          fetchData();
          // Обновляем склады в контексте
          fetchWarehouses();
        }, 1500);
      }
    } catch (err) {
      console.error('Ошибка сохранения склада:', err);
      setError(err.response?.data?.error || 'Ошибка сохранения склада');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить склад?')) return;
    
    setLoading(true);
    try {
      // Используем warehousesAPI для удаления
      const response = await warehousesAPI.delete(id);
      
      if (response.data.success) {
        setSuccess('Склад удален');
        
        // Обновляем данные
        fetchData();
        fetchWarehouses();
        
        // Если удалили выбранный склад, выбираем "Все склады"
        if (selectedWarehouse?.id === id) {
          setSelectedWarehouse({ id: 'all', name: 'Все склады' });
        }
      } else {
        setError(response.data.error || 'Ошибка удаления');
      }
    } catch (err) {
      console.error('Ошибка удаления склада:', err);
      setError('Ошибка удаления склада: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const getWarehouseIcon = (type) => {
    switch (type) {
      case 'main': return <WarehouseIcon color="primary" />;
      case 'branch': return <BusinessIcon color="secondary" />;
      case 'production': return <FactoryIcon color="warning" />;
      default: return <WarehouseIcon />;
    }
  };

  const getWarehouseTypeText = (type) => {
    switch (type) {
      case 'main': return 'Основной';
      case 'branch': return 'Филиал';
      case 'production': return 'Производство';
      default: return type;
    }
  };

  // Используем локальные склады для отображения
  const displayWarehouses = localWarehouses.length > 0 ? localWarehouses : [];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <WarehouseIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Склады
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Новый склад
        </Button>
      </Box>

      {/* Информация о выбранном складе */}
      {selectedWarehouse && selectedWarehouse.id !== 'all' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Текущий рабочий склад: <strong>{selectedWarehouse.name}</strong>
          {selectedWarehouse.address && ` (${selectedWarehouse.address})`}
        </Alert>
      )}

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

      {/* Карточки статистики */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Всего складов
              </Typography>
              <Typography variant="h3">
                {displayWarehouses.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Основные склады
              </Typography>
              <Typography variant="h3">
                {displayWarehouses.filter(w => w.type === 'main').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Филиалы
              </Typography>
              <Typography variant="h3">
                {displayWarehouses.filter(w => w.type === 'branch').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Производственные
              </Typography>
              <Typography variant="h3">
                {displayWarehouses.filter(w => w.type === 'production').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Таблица складов */}
      {displayWarehouses.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <WarehouseIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Склады не найдены
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Создайте первый склад для начала работы
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Создать склад
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Тип</TableCell>
                <TableCell>Название</TableCell>
                <TableCell>Адрес</TableCell>
                <TableCell>Контактное лицо</TableCell>
                <TableCell>Телефон</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                displayWarehouses.map((warehouse) => (
                  <TableRow 
                    key={warehouse.id}
                    hover
                    selected={selectedWarehouse?.id === warehouse.id}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {getWarehouseIcon(warehouse.type)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {getWarehouseTypeText(warehouse.type)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="bold">
                        {warehouse.name}
                      </Typography>
                      {warehouse.code && (
                        <Typography variant="caption" color="text.secondary">
                          Код: {warehouse.code}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{warehouse.address}</TableCell>
                    <TableCell>{warehouse.contact_person || '-'}</TableCell>
                    <TableCell>{warehouse.contact_phone || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={warehouse.status === 'active' ? 'Активен' : 'Неактивен'}
                        color={warehouse.status === 'active' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Редактировать">
                          <IconButton size="small" onClick={() => handleOpenDialog(warehouse)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDelete(warehouse.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
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
      )}

      {/* Диалог создания/редактирования склада */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {formData.id ? 'Редактирование склада' : 'Новый склад'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="name"
                label="Название склада *"
                value={formData.name}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Тип склада</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  label="Тип склада"
                  onChange={handleFormChange}
                >
                  <MenuItem value="main">Основной склад</MenuItem>
                  <MenuItem value="branch">Филиал</MenuItem>
                  <MenuItem value="production">Производственный</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="address"
                label="Адрес *"
                value={formData.address}
                onChange={handleFormChange}
                multiline
                rows={2}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="contact_person"
                label="Контактное лицо"
                value={formData.contact_person}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="contact_phone"
                label="Телефон"
                value={formData.contact_phone}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="capacity"
                label="Вместимость"
                type="number"
                value={formData.capacity}
                onChange={handleFormChange}
                InputProps={{
                  endAdornment: <Typography variant="caption">м³</Typography>
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="description"
                label="Описание"
                value={formData.description}
                onChange={handleFormChange}
                multiline
                rows={3}
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
    </Container>
  );
};

export default Warehouses;