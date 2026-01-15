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
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Warehouse as WarehouseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useWarehouse } from '../contexts/WarehouseContext';
import { storageCellsAPI } from '../services/api';

const StorageCells = () => {
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cells, setCells] = useState([]);
  const { selectedWarehouse, warehouses } = useWarehouse();
  const mountedRef = useRef(true);

  const [formData, setFormData] = useState({
    id: null,
    warehouse_id: '',
    code: '',
    name: '',
    zone: 'A',
    aisle: '1',
    rack: '1',
    level: 1,
    position: 1,
    cell_type: 'shelf',
    max_capacity: 100,
    description: '',
    is_active: true
  });

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    
    return () => {
      mountedRef.current = false;
    };
  }, [selectedWarehouse]);

  const fetchData = async () => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    try {
      const warehouseId = selectedWarehouse?.id === 'all' ? '' : selectedWarehouse?.id;
      console.log('📦 Загрузка ячеек для склада:', warehouseId);
      
      const params = {};
      if (warehouseId) {
        params.warehouse_id = warehouseId;
      }
      
      const response = await storageCellsAPI.getAll(params);
      
      if (response.data.success && mountedRef.current) {
        console.log('✅ Ячейки загружены:', response.data.cells?.length || 0);
        setCells(response.data.cells || []);
        setError('');
      } else {
        setError(response.data.error || 'Ошибка загрузки ячеек');
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки ячеек:', err);
      if (mountedRef.current) {
        setError('Ошибка загрузки ячеек: ' + (err.message || 'Неизвестная ошибка'));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleOpenDialog = (cell = null) => {
    if (cell) {
      setFormData({
        id: cell.id,
        warehouse_id: cell.warehouse_id,
        code: cell.code,
        name: cell.name || '',
        zone: cell.zone || 'A',
        aisle: cell.aisle || '1',
        rack: cell.rack || '1',
        level: cell.level || 1,
        position: cell.position || 1,
        cell_type: cell.cell_type || 'shelf',
        max_capacity: cell.max_capacity || 100,
        description: cell.description || '',
        is_active: cell.is_active
      });
    } else {
      setFormData({
        id: null,
        warehouse_id: selectedWarehouse?.id === 'all' ? '' : selectedWarehouse?.id,
        code: '',
        name: '',
        zone: 'A',
        aisle: '1',
        rack: '1',
        level: 1,
        position: 1,
        cell_type: 'shelf',
        max_capacity: 100,
        description: '',
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
    const { name, value, type } = e.target;
    
    let processedValue = value;
    
    // Преобразуем числовые поля
    if (type === 'number' && value !== '') {
      processedValue = parseFloat(value);
    } else if (name === 'level' || name === 'position' || name === 'max_capacity') {
      if (value === '') {
        processedValue = 0;
      } else {
        processedValue = parseFloat(value);
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const validateForm = () => {
    if (!formData.warehouse_id) {
      setError('Выберите склад');
      return false;
    }
    
    if (!formData.code.trim()) {
      setError('Введите код ячейки');
      return false;
    }
    
    // Проверяем уникальность кода в рамках склада
    const existingCell = cells.find(
      cell => cell.warehouse_id === formData.warehouse_id && 
              cell.code.toLowerCase() === formData.code.toLowerCase() && 
              cell.id !== formData.id
    );
    
    if (existingCell) {
      setError('Ячейка с таким кодом уже существует на этом складе');
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
      const submitData = {
        warehouse_id: formData.warehouse_id,
        code: formData.code.trim(),
        name: formData.name || '',
        zone: formData.zone || '',
        aisle: formData.aisle || '',
        rack: formData.rack || '',
        level: formData.level || 1,
        position: formData.position || 1,
        cell_type: formData.cell_type || 'shelf',
        max_capacity: formData.max_capacity || 0,
        description: formData.description || '',
        is_active: formData.is_active
      };

      console.log('📤 Отправка данных ячейки:', submitData);

      if (formData.id) {
        // Обновление ячейки
        const response = await storageCellsAPI.update(formData.id, submitData);
        if (response.data.success) {
          setSuccess('Ячейка успешно обновлена');
          fetchData();
          handleCloseDialog();
        } else {
          setError(response.data.error || 'Ошибка обновления ячейки');
        }
      } else {
        // Создание ячейки
        const response = await storageCellsAPI.create(submitData);
        if (response.data.success) {
          setSuccess('Ячейка успешно создана');
          fetchData();
          handleCloseDialog();
        } else {
          setError(response.data.error || 'Ошибка создания ячейки');
        }
      }
    } catch (err) {
      console.error('💥 Ошибка сохранения ячейки:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Ошибка сохранения ячейки: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту ячейку?')) return;
    
    setLoading(true);
    try {
      const response = await storageCellsAPI.delete(id);
      if (response.data.success) {
        setSuccess('Ячейка успешно удалена');
        fetchData();
      } else {
        setError(response.data.error || 'Ошибка удаления ячейки');
      }
    } catch (err) {
      console.error('❌ Ошибка удаления ячейки:', err);
      setError('Ошибка удаления ячейки: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'shelf': return 'primary';
      case 'pallet': return 'secondary';
      case 'refrigerated': return 'info';
      case 'hazardous': return 'error';
      default: return 'default';
    }
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'shelf': return 'Стеллаж';
      case 'pallet': return 'Паллета';
      case 'refrigerated': return 'Холодильная';
      case 'hazardous': return 'Опасные грузы';
      default: return type;
    }
  };

  // Вычисляем заполненность ячейки
  const getCapacityPercentage = (cell) => {
    if (!cell.max_capacity || cell.max_capacity === 0) return 0;
    
    const totalQuantity = cell.total_quantity || 0;
    const percentage = Math.min(Math.round((totalQuantity / cell.max_capacity) * 100), 100);
    return percentage;
  };

  // Фильтруем склады (исключаем "Все склады")
  const availableWarehouses = warehouses.filter(w => w.id !== 'all');

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Ячейки хранения
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            sx={{ mr: 1 }}
            disabled={loading}
          >
            Обновить
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={loading}
          >
            Новая ячейка
          </Button>
        </Box>
      </Box>

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

      {/* Статистика */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Всего ячеек
              </Typography>
              <Typography variant="h3">
                {cells.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Занято ячеек
              </Typography>
              <Typography variant="h3">
                {cells.filter(c => (c.total_quantity || 0) > 0).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Свободно
              </Typography>
              <Typography variant="h3" color="success.main">
                {cells.filter(c => (c.total_quantity || 0) === 0).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Средняя заполненность
              </Typography>
              <Typography variant="h3">
                {cells.length > 0 
                  ? Math.round(cells.reduce((acc, c) => acc + getCapacityPercentage(c), 0) / cells.length)
                  : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Таблица ячеек */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Код</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Склад</TableCell>
              <TableCell>Расположение</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Товаров</TableCell>
              <TableCell>Стоимость</TableCell>
              <TableCell>Заполненность</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : cells.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  {selectedWarehouse?.id === 'all' 
                    ? 'Выберите конкретный склад для просмотра ячеек' 
                    : 'Ячейки не найдены'}
                </TableCell>
              </TableRow>
            ) : (
              cells.map((cell) => {
                const capacityPercent = getCapacityPercentage(cell);
                const warehouse = warehouses.find(w => w.id === cell.warehouse_id);
                
                return (
                  <TableRow key={cell.id} hover>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        {cell.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{cell.name || '-'}</TableCell>
                    <TableCell>{warehouse?.name || cell.warehouse_id}</TableCell>
                    <TableCell>
                      {`${cell.zone || ''}${cell.aisle || ''}-${cell.rack || ''}-${cell.level || ''}-${cell.position || ''}`}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTypeText(cell.cell_type)}
                        color={getTypeColor(cell.cell_type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="bold">
                        {cell.items_count || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {cell.total_value > 0 
                        ? `${Math.round(cell.total_value).toLocaleString('ru-RU')} ₽` 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={capacityPercent}
                            color={capacityPercent > 80 ? 'error' : capacityPercent > 50 ? 'warning' : 'success'}
                          />
                        </Box>
                        <Typography variant="caption">
                          {capacityPercent}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={cell.is_active ? 'Активна' : 'Неактивна'}
                        color={cell.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Редактировать">
                          <IconButton 
                            size="small" 
                            onClick={() => handleOpenDialog(cell)}
                            disabled={loading}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDelete(cell.id)}
                            disabled={loading || (cell.total_quantity || 0) > 0}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Диалог создания/редактирования */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {formData.id ? 'Редактирование ячейки' : 'Новая ячейка хранения'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Склад *</InputLabel>
                <Select
                  name="warehouse_id"
                  value={formData.warehouse_id}
                  label="Склад *"
                  onChange={handleFormChange}
                  disabled={!!formData.id}
                >
                  <MenuItem value="">Выберите склад</MenuItem>
                  {availableWarehouses.map(wh => (
                    <MenuItem key={wh.id} value={wh.id}>
                      {wh.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="code"
                label="Код ячейки *"
                value={formData.code}
                onChange={handleFormChange}
                required
                helperText="Уникальный код в рамках склада"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="name"
                label="Название ячейки"
                value={formData.name}
                onChange={handleFormChange}
              />
            </Grid>
            
            <Grid item xs={3}>
              <TextField
                fullWidth
                name="zone"
                label="Зона"
                value={formData.zone}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                name="aisle"
                label="Проход"
                value={formData.aisle}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                name="rack"
                label="Стеллаж"
                value={formData.rack}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                name="level"
                label="Уровень"
                type="number"
                value={formData.level}
                onChange={handleFormChange}
                inputProps={{ min: 1 }}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                name="position"
                label="Позиция"
                type="number"
                value={formData.position}
                onChange={handleFormChange}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Тип ячейки</InputLabel>
                <Select
                  name="cell_type"
                  value={formData.cell_type}
                  label="Тип ячейки"
                  onChange={handleFormChange}
                >
                  <MenuItem value="shelf">Стеллаж</MenuItem>
                  <MenuItem value="pallet">Паллета</MenuItem>
                  <MenuItem value="refrigerated">Холодильная</MenuItem>
                  <MenuItem value="hazardous">Опасные грузы</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="max_capacity"
                label="Макс. вместимость"
                type="number"
                value={formData.max_capacity}
                onChange={handleFormChange}
                InputProps={{
                  endAdornment: <Typography variant="caption">ед.</Typography>
                }}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select
                  name="is_active"
                  value={formData.is_active}
                  label="Статус"
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    is_active: e.target.value === 'true' 
                  }))}
                >
                  <MenuItem value={true}>Активна</MenuItem>
                  <MenuItem value={false}>Неактивна</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="description"
                label="Описание"
                value={formData.description}
                onChange={handleFormChange}
                multiline
                rows={2}
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

export default StorageCells;