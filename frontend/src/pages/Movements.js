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
  Stepper,
  Step,
  StepLabel,
  Divider,
  Autocomplete,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Print as PrintIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ArrowRightAlt as ArrowRightIcon,
  SwapHoriz as SwapHorizIcon,
  Close as CloseIcon,
  Warehouse as WarehouseIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { useWarehouse } from '../contexts/WarehouseContext';
import api from '../services/api';

const Movements = () => {
  const [tabValue, setTabValue] = useState(0);
  const [movements, setMovements] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedWarehouse, warehouses } = useWarehouse();

  const [formData, setFormData] = useState({
    id: null,
    type: 'internal',
    warehouse_from_id: '',
    warehouse_to_id: '',
    storage_cell_from_id: '',
    storage_cell_to_id: '',
    reason: '',
    comment: '',
    items: [],
    status: 'draft'
  });

  const [itemForm, setItemForm] = useState({
    nomenclature_id: '',
    nomenclature: null,
    quantity: '',
    batch: ''
  });

  const [nomenclature, setNomenclature] = useState([]);
  const [storageCellsFrom, setStorageCellsFrom] = useState([]);
  const [storageCellsTo, setStorageCellsTo] = useState([]);
  const [stockBalancesFrom, setStockBalancesFrom] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const steps = ['Тип и склады', 'Товары', 'Подтверждение'];

  // Загрузка данных
  useEffect(() => {
    fetchMovements();
    fetchNomenclature();
  }, [selectedWarehouse, tabValue]);

  // Загрузка списка перемещений
  const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = {
        type: tabValue === 0 ? 'internal' : 'external',
        status: filters.status !== 'all' ? filters.status : undefined,
        warehouse_id: selectedWarehouse?.id !== 'all' ? selectedWarehouse?.id : undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined
      };

      const response = await api.get('/api/movements', { params });
      
      if (response.data.success) {
        setMovements(response.data.movements);
      } else {
        setError('Ошибка загрузки перемещений');
      }
    } catch (err) {
      setError('Ошибка загрузки перемещений: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка номенклатуры
  const fetchNomenclature = async () => {
    try {
      const response = await api.get('/api/nomenclature');
      if (response.data.success) {
        setNomenclature(response.data.items);
      }
    } catch (err) {
      console.error('Ошибка загрузки номенклатуры:', err);
    }
  };

  // Загрузка ячеек хранения для склада-отправителя
  const fetchStorageCellsFrom = async (warehouseId) => {
    try {
      const response = await api.get('/api/storage-cells', {
        params: { warehouse_id: warehouseId }
      });
      
      if (response.data.success) {
        setStorageCellsFrom(response.data.cells);
      }
    } catch (err) {
      console.error('Ошибка загрузки ячеек (отправитель):', err);
      setStorageCellsFrom([]);
    }
  };

  // Загрузка ячеек хранения для склада-получателя
  const fetchStorageCellsTo = async (warehouseId) => {
    try {
      const response = await api.get('/api/storage-cells', {
        params: { warehouse_id: warehouseId }
      });
      
      if (response.data.success) {
        setStorageCellsTo(response.data.cells);
      }
    } catch (err) {
      console.error('Ошибка загрузки ячеек (получатель):', err);
      setStorageCellsTo([]);
    }
  };

  // Загрузка остатков товаров на складе-отправителе
  const fetchStockBalancesFrom = async (warehouseId, storageCellId = null) => {
    try {
      const params = { warehouse_id: warehouseId };
      if (storageCellId) {
        params.storage_cell_id = storageCellId;
      }

      const response = await api.get('/api/reports/stock-balances', { params });
      
      if (response.data.success) {
        setStockBalancesFrom(response.data.report);
      }
    } catch (err) {
      console.error('Ошибка загрузки остатков:', err);
      setStockBalancesFrom([]);
    }
  };

  // Открытие диалога
  const handleOpenDialog = async (movement = null) => {
    if (movement) {
      const response = await api.get(`/api/movements/${movement.id}`);
      
      if (response.data.success) {
        const movementData = response.data.movement;
        setFormData({
          id: movementData.id,
          type: movementData.type,
          warehouse_from_id: movementData.warehouse_from_id,
          warehouse_to_id: movementData.warehouse_to_id || '',
          storage_cell_from_id: movementData.storage_cell_from_id || '',
          storage_cell_to_id: movementData.storage_cell_to_id || '',
          reason: movementData.reason,
          comment: movementData.comment,
          items: movementData.items,
          status: movementData.status
        });
        
        setTabValue(movementData.type === 'internal' ? 0 : 1);
        
        // Загружаем ячейки для складов
        if (movementData.warehouse_from_id) {
          await fetchStorageCellsFrom(movementData.warehouse_from_id);
          await fetchStockBalancesFrom(
            movementData.warehouse_from_id,
            movementData.storage_cell_from_id
          );
        }
        
        if (movementData.warehouse_to_id) {
          await fetchStorageCellsTo(movementData.warehouse_to_id);
        }
      }
    } else {
      setFormData({
        id: null,
        type: tabValue === 0 ? 'internal' : 'external',
        warehouse_from_id: selectedWarehouse?.id !== 'all' ? selectedWarehouse?.id : '',
        warehouse_to_id: '',
        storage_cell_from_id: '',
        storage_cell_to_id: '',
        reason: '',
        comment: '',
        items: [],
        status: 'draft'
      });
      
      setItemForm({
        nomenclature_id: '',
        nomenclature: null,
        quantity: '',
        batch: ''
      });
      
      setStockBalancesFrom([]);
      setStorageCellsFrom([]);
      setStorageCellsTo([]);
    }
    
    setActiveStep(0);
    setOpenDialog(true);
  };

  // Закрытие диалога
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
    setSuccess('');
    setStockBalancesFrom([]);
    setStorageCellsFrom([]);
    setStorageCellsTo([]);
  };

  // Обработка изменения формы
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    
    // При изменении складов загружаем соответствующие ячейки
    if (name === 'warehouse_from_id' && value) {
      fetchStorageCellsFrom(value);
      fetchStockBalancesFrom(value);
      
      // Для внутреннего перемещения склад-получатель = складу-отправителю
      if (newFormData.type === 'internal') {
        setFormData(prev => ({ 
          ...prev, 
          warehouse_to_id: value 
        }));
      } else {
        // Для межскладского очищаем склад-получатель
        setFormData(prev => ({ 
          ...prev, 
          warehouse_to_id: '',
          storage_cell_to_id: ''
        }));
        setStorageCellsTo([]);
      }
    }
    
    if (name === 'warehouse_to_id' && value) {
      fetchStorageCellsTo(value);
    }
    
    if (name === 'storage_cell_from_id' && value && formData.warehouse_from_id) {
      fetchStockBalancesFrom(formData.warehouse_from_id, value);
    }
  };

  // Изменение типа перемещения
  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setTabValue(newType === 'internal' ? 0 : 1);
    
    // Сбрасываем данные складов при смене типа
    const newFormData = {
      ...formData,
      type: newType,
      warehouse_to_id: newType === 'internal' ? formData.warehouse_from_id : '',
      storage_cell_from_id: '',
      storage_cell_to_id: ''
    };
    
    setFormData(newFormData);
    setStockBalancesFrom([]);
    
    // Если это внутреннее перемещение и есть склад-отправитель
    if (newType === 'internal' && newFormData.warehouse_from_id) {
      fetchStorageCellsFrom(newFormData.warehouse_from_id);
      fetchStockBalancesFrom(newFormData.warehouse_from_id);
    } else if (newType === 'external') {
      // Для межскладского очищаем ячейки получателя
      setStorageCellsTo([]);
    }
  };

  // Выбор товара
  const handleNomenclatureSelect = (event, value) => {
    setItemForm(prev => ({ 
      ...prev, 
      nomenclature: value,
      nomenclature_id: value?.id || ''
    }));
  };

  // Получение доступного количества товара
  const getAvailableQuantity = () => {
    if (!itemForm.nomenclature_id || !formData.storage_cell_from_id) return 0;
    
    const balance = stockBalancesFrom.find(
      item => item.nomenclature_id === itemForm.nomenclature_id && 
              item.storage_cell_id === formData.storage_cell_from_id
    );
    
    return balance ? parseFloat(balance.quantity) : 0;
  };

  // Фильтрация номенклатуры по доступным остаткам
  const getAvailableNomenclature = () => {
    if (!formData.storage_cell_from_id || stockBalancesFrom.length === 0) return [];
    
    const cellBalances = stockBalancesFrom.filter(b => b.storage_cell_id === formData.storage_cell_from_id);
    const availableIds = cellBalances.map(b => b.nomenclature_id);
    
    return nomenclature.filter(item => 
      availableIds.includes(item.id) && 
      !formData.items.some(added => added.nomenclature_id === item.id)
    );
  };

  // Добавление товара
  const handleAddItem = () => {
    if (!itemForm.nomenclature || !itemForm.quantity || !formData.storage_cell_from_id) {
      setError('Заполните все обязательные поля');
      return;
    }

    const availableQuantity = getAvailableQuantity();
    const requestedQuantity = parseFloat(itemForm.quantity);
    
    if (requestedQuantity > availableQuantity) {
      setError(`Недостаточно товара. Доступно: ${availableQuantity}`);
      return;
    }

    // Проверяем, не добавлен ли уже этот товар
    const alreadyAdded = formData.items.some(
      item => item.nomenclature_id === itemForm.nomenclature_id
    );
    
    if (alreadyAdded) {
      setError('Этот товар уже добавлен');
      return;
    }

    // Получаем стоимость товара из остатков
    const balance = stockBalancesFrom.find(
      item => item.nomenclature_id === itemForm.nomenclature_id && 
              item.storage_cell_id === formData.storage_cell_from_id
    );
    
    const costPrice = balance ? parseFloat(balance.average_cost) : 0;

    const newItem = {
      nomenclature_id: itemForm.nomenclature_id,
      nomenclature_code: itemForm.nomenclature.code,
      nomenclature_name: itemForm.nomenclature.name,
      quantity: requestedQuantity,
      unit: itemForm.nomenclature.unit || 'шт',
      cost_price: costPrice,
      batch: itemForm.batch || '',
      amount: requestedQuantity * costPrice
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      total_amount: prev.total_amount + newItem.amount
    }));

    // Очищаем форму
    setItemForm({
      nomenclature_id: '',
      nomenclature: null,
      quantity: '',
      batch: ''
    });

    setSuccess('Товар добавлен');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Удаление товара
  const handleRemoveItem = (index) => {
    const newItems = [...formData.items];
    const removedItem = newItems.splice(index, 1);
    setFormData(prev => ({ 
      ...prev, 
      items: newItems,
      total_amount: prev.total_amount - (removedItem[0]?.amount || 0)
    }));
  };

  // Сохранение перемещения
  // Обновите обработку ячейки-получателя в handleSubmit
const handleSubmit = async () => {
  if (!formData.warehouse_from_id || !formData.reason || formData.items.length === 0) {
    setError('Заполните все обязательные поля');
    return;
  }

  // Валидация для внутреннего перемещения
  if (formData.type === 'internal') {
    if (!formData.storage_cell_from_id || !formData.storage_cell_to_id) {
      setError('Для внутреннего перемещения выберите ячейки хранения');
      return;
    }
    if (formData.storage_cell_from_id === formData.storage_cell_to_id) {
      setError('Ячейка-отправитель и ячейка-получатель не могут быть одинаковыми');
      return;
    }
  }

  // Валидация для межскладского перемещения
  if (formData.type === 'external') {
    if (!formData.warehouse_to_id) {
      setError('Для межскладского перемещения укажите склад-получатель');
      return;
    }
    if (!formData.storage_cell_from_id) {
      setError('Для межскладского перемещения укажите ячейку-отправитель');
      return;
    }
    if (!formData.storage_cell_to_id) {
      setError('Для межскладского перемещения укажите ячейку-получатель');
      return;
    }
    if (formData.warehouse_from_id === formData.warehouse_to_id) {
      setError('Склад-отправитель и склад-получатель не могут быть одинаковыми');
      return;
    }
  }

  setLoading(true);
  try {
    // Подготавливаем данные для разных типов перемещений
    let movementData;
    
    if (formData.type === 'internal') {
      // Внутреннее перемещение
      movementData = {
        type: 'internal',
        warehouse_from_id: parseInt(formData.warehouse_from_id),
        warehouse_to_id: parseInt(formData.warehouse_from_id), // Тот же склад
        storage_cell_from_id: parseInt(formData.storage_cell_from_id),
        storage_cell_to_id: parseInt(formData.storage_cell_to_id),
        reason: formData.reason,
        comment: formData.comment || '',
        items: formData.items.map(item => ({
          nomenclature_id: parseInt(item.nomenclature_id),
          quantity: parseFloat(item.quantity),
          unit: item.unit || 'шт',
          batch: item.batch || ''
        }))
      };
    } else {
      // Межскладское перемещение
      movementData = {
        type: 'external',
        warehouse_from_id: parseInt(formData.warehouse_from_id),
        warehouse_to_id: parseInt(formData.warehouse_to_id),
        storage_cell_from_id: parseInt(formData.storage_cell_from_id),
        storage_cell_to_id: parseInt(formData.storage_cell_to_id),
        reason: formData.reason,
        comment: formData.comment || '',
        items: formData.items.map(item => ({
          nomenclature_id: parseInt(item.nomenclature_id),
          quantity: parseFloat(item.quantity),
          unit: item.unit || 'шт',
          batch: item.batch || ''
        }))
      };
    }

    console.log('Отправка данных перемещения:', JSON.stringify(movementData, null, 2));
    console.log('Тип перемещения:', formData.type);
    console.log('Ячейка-получатель:', formData.storage_cell_to_id);

    let response;
    if (formData.id) {
      response = await api.put(`/api/movements/${formData.id}`, movementData);
    } else {
      response = await api.post('/api/movements', movementData);
    }

    if (response.data.success) {
      setSuccess(formData.id ? 'Перемещение обновлено' : 'Перемещение создано');
      
      await fetchMovements();
      
      setTimeout(() => {
        handleCloseDialog();
      }, 1500);
    } else {
      setError(response.data.error || 'Ошибка сохранения');
    }
  } catch (err) {
    console.error('Ошибка при сохранении:', err);
    
    // Подробная информация об ошибке
    if (err.response?.data?.error) {
      setError('Ошибка: ' + err.response.data.error);
    } else if (err.response?.data?.details) {
      setError('Ошибка: ' + err.response.data.details);
    } else if (err.response?.data?.message) {
      setError('Ошибка: ' + err.response.data.message);
    } else if (err.message) {
      setError('Ошибка: ' + err.message);
    } else {
      setError('Неизвестная ошибка при сохранении');
    }
    
    console.log('Детали ошибки:', {
      status: err.response?.status,
      data: err.response?.data,
      config: err.config?.data
    });
  } finally {
    setLoading(false);
  }
};

  // Проведение перемещения
  const handleComplete = async (id) => {
    if (!window.confirm('Провести перемещение? Это действие нельзя отменить.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/api/movements/${id}/complete`);
      
      if (response.data.success) {
        setSuccess('Перемещение проведено');
        fetchMovements();
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка проведения');
    } finally {
      setLoading(false);
    }
  };

  // Отмена перемещения
  const handleCancel = async (id) => {
    if (!window.confirm('Отменить перемещение?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/api/movements/${id}/cancel`);
      
      if (response.data.success) {
        setSuccess('Перемещение отменено');
        fetchMovements();
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка отмены');
    } finally {
      setLoading(false);
    }
  };

  // Удаление перемещения
  const handleDelete = async (id) => {
    if (!window.confirm('Удалить перемещение?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.delete(`/api/movements/${id}`);
      
      if (response.data.success) {
        setSuccess('Перемещение удалено');
        fetchMovements();
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления');
    } finally {
      setLoading(false);
    }
  };

  // Получение цвета статуса
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'info';
      case 'in_progress': return 'warning';
      case 'cancelled': return 'error';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  // Получение текста статуса
  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Завершено';
      case 'pending': return 'Ожидание';
      case 'in_progress': return 'В процессе';
      case 'cancelled': return 'Отменено';
      case 'draft': return 'Черновик';
      default: return status;
    }
  };

  // Получение текста типа
  const getTypeText = (type) => {
    return type === 'internal' ? 'Внутреннее' : 'Межскладское';
  };

  // Функция для получения имени склада по ID
  const getWarehouseName = (id) => {
    const warehouse = warehouses.find(w => w.id === id);
    return warehouse ? warehouse.name : id;
  };

  // Функция для получения имени ячейки по ID
  const getStorageCellName = (id, cells) => {
    const cell = cells.find(c => c.id === id);
    return cell ? cell.code : id;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <SwapHorizIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Перемещения товаров
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ mr: 1 }}
          >
            Новое перемещение
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchMovements}
            disabled={loading}
          >
            Обновить
          </Button>
        </Box>
      </Box>

      {/* Табы */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => {
            setTabValue(newValue);
            setFormData(prev => ({ ...prev, type: newValue === 0 ? 'internal' : 'external' }));
          }}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Внутренние перемещения" />
          <Tab label="Межскладские перемещения" />
        </Tabs>
      </Paper>

      {/* Фильтры */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Поиск (номер, причина)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={filters.status}
                label="Статус"
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <MenuItem value="all">Все</MenuItem>
                <MenuItem value="draft">Черновик</MenuItem>
                <MenuItem value="pending">Ожидание</MenuItem>
                <MenuItem value="in_progress">В процессе</MenuItem>
                <MenuItem value="completed">Завершено</MenuItem>
                <MenuItem value="cancelled">Отменено</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Дата с"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Дата по"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <Button
              variant="contained"
              fullWidth
              onClick={fetchMovements}
              disabled={loading}
            >
              Применить
            </Button>
          </Grid>
        </Grid>
      </Paper>

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

      {/* Таблица перемещений */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Номер</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>Отправитель</TableCell>
              <TableCell>Получатель</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Причина</TableCell>
              <TableCell>Товаров</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Нет перемещений
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => {
                return (
                  <TableRow key={movement.id} hover>
                    <TableCell>
                      <Typography fontWeight="bold">
                        {movement.document_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(movement.movement_date).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography>{movement.warehouse_from_name}</Typography>
                        {movement.storage_cell_from_code && (
                          <Typography variant="caption" color="text.secondary">
                            Ячейка: {movement.storage_cell_from_code}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {movement.type === 'internal' ? (
                        movement.storage_cell_to_code ? (
                          <>
                            <Typography>Внутреннее перемещение</Typography>
                            <Typography variant="caption" color="text.secondary">
                              На ячейку: {movement.storage_cell_to_code}
                            </Typography>
                          </>
                        ) : (
                          <Typography>Внутреннее перемещение</Typography>
                        )
                      ) : (
                        <Box>
                          <Typography>{movement.warehouse_to_name || 'Не указан'}</Typography>
                          {movement.storage_cell_to_code && (
                            <Typography variant="caption" color="text.secondary">
                              Ячейка: {movement.storage_cell_to_code}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTypeText(movement.type)}
                        color={movement.type === 'internal' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{movement.reason}</TableCell>
                    <TableCell>{movement.items_count}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(movement.status)}
                        color={getStatusColor(movement.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        {movement.status === 'draft' && (
                          <Tooltip title="Провести">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleComplete(movement.id)}
                              disabled={loading}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {movement.status === 'draft' && (
                          <Tooltip title="Редактировать">
                            <IconButton 
                              size="small"
                              onClick={() => handleOpenDialog(movement)}
                              disabled={loading}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {movement.status !== 'cancelled' && movement.status !== 'completed' && (
                          <Tooltip title="Отменить">
                            <IconButton 
                              size="small" 
                              color="warning"
                              onClick={() => handleCancel(movement.id)}
                              disabled={loading}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {movement.status === 'draft' && (
                          <Tooltip title="Удалить">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDelete(movement.id)}
                              disabled={loading}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
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
          {formData.id ? 'Редактирование перемещения' : 'Новое перемещение'}
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mt: 2, mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Тип перемещения</FormLabel>
                  <RadioGroup
                    row
                    name="type"
                    value={formData.type}
                    onChange={handleTypeChange}
                  >
                    <FormControlLabel value="internal" control={<Radio />} label="Внутреннее" />
                    <FormControlLabel value="external" control={<Radio />} label="Межскладское" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              {/* Склад-отправитель */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Склад-отправитель *</InputLabel>
                  <Select
                    name="warehouse_from_id"
                    value={formData.warehouse_from_id}
                    label="Склад-отправитель *"
                    onChange={handleFormChange}
                  >
                    <MenuItem value="">Выберите склад</MenuItem>
                    {warehouses
                      .filter(w => w.id !== 'all')
                      .map(warehouse => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </MenuItem>
                      ))
                    }
                  </Select>
                </FormControl>
              </Grid>

              {/* Для внутреннего перемещения склад-получатель равен складу-отправителю */}
              {formData.type === 'internal' && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Склад-получатель</InputLabel>
                    <Select
                      value={formData.warehouse_from_id}
                      label="Склад-получатель"
                      disabled
                    >
                      <MenuItem value={formData.warehouse_from_id}>
                        {getWarehouseName(formData.warehouse_from_id) || 'Не выбран'}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Для межскладского перемещения выбираем склад-получатель */}
              {formData.type === 'external' && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Склад-получатель *</InputLabel>
                    <Select
                      name="warehouse_to_id"
                      value={formData.warehouse_to_id}
                      label="Склад-получатель *"
                      onChange={handleFormChange}
                      disabled={!formData.warehouse_from_id}
                    >
                      <MenuItem value="">Выберите склад</MenuItem>
                      {warehouses
                        .filter(w => w.id !== 'all' && w.id !== formData.warehouse_from_id)
                        .map(warehouse => (
                          <MenuItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </MenuItem>
                        ))
                      }
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Ячейка-отправитель */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Ячейка-отправитель *</InputLabel>
                  <Select
                    name="storage_cell_from_id"
                    value={formData.storage_cell_from_id}
                    label="Ячейка-отправитель *"
                    onChange={handleFormChange}
                    disabled={!formData.warehouse_from_id}
                  >
                    <MenuItem value="">Выберите ячейку</MenuItem>
                    {storageCellsFrom.map(cell => (
                      <MenuItem key={cell.id} value={cell.id}>
                        <Box display="flex" alignItems="center">
                          <LocationIcon sx={{ mr: 1, fontSize: 16 }} />
                          <Typography variant="body2">
                            {cell.code} {cell.name ? `(${cell.name})` : ''}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Ячейка-получатель для внутреннего перемещения */}
              {formData.type === 'internal' && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Ячейка-получатель *</InputLabel>
                    <Select
                      name="storage_cell_to_id"
                      value={formData.storage_cell_to_id}
                      label="Ячейка-получатель *"
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        storage_cell_to_id: e.target.value 
                      }))}
                      disabled={!formData.warehouse_from_id || storageCellsFrom.length === 0}
                    >
                      <MenuItem value="">Выберите ячейку</MenuItem>
                      {storageCellsFrom
                        .filter(cell => cell.id !== formData.storage_cell_from_id)
                        .map(cell => (
                          <MenuItem key={cell.id} value={cell.id}>
                            <Box display="flex" alignItems="center">
                              <LocationIcon sx={{ mr: 1, fontSize: 16 }} />
                              <Typography variant="body2">
                                {cell.code} {cell.name ? `(${cell.name})` : ''}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))
                      }
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Ячейка-получатель для межскладского перемещения */}
              {formData.type === 'external' && formData.warehouse_to_id && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Ячейка-получатель *</InputLabel>
                    <Select
                      name="storage_cell_to_id"
                      value={formData.storage_cell_to_id}
                      label="Ячейка-получатель *"
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        storage_cell_to_id: e.target.value 
                      }))}
                      disabled={!formData.warehouse_to_id}
                    >
                      <MenuItem value="">Выберите ячейку</MenuItem>
                      {storageCellsTo.map(cell => (
                        <MenuItem key={cell.id} value={cell.id}>
                          <Box display="flex" alignItems="center">
                            <LocationIcon sx={{ mr: 1, fontSize: 16 }} />
                            <Typography variant="body2">
                              {cell.code} {cell.name ? `(${cell.name})` : ''}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="reason"
                  label="Причина перемещения *"
                  value={formData.reason}
                  onChange={handleFormChange}
                  required
                  multiline
                  rows={2}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="comment"
                  label="Комментарий"
                  value={formData.comment}
                  onChange={handleFormChange}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Товары для перемещения
              </Typography>

              {formData.warehouse_from_id && formData.storage_cell_from_id ? (
                <>
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={6}>
                        <Autocomplete
                          options={getAvailableNomenclature()}
                          getOptionLabel={(option) => `${option.code} - ${option.name}`}
                          value={itemForm.nomenclature}
                          onChange={handleNomenclatureSelect}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Товар *"
                              placeholder="Выберите товар"
                            />
                          )}
                          renderOption={(props, option) => {
                            const balance = stockBalancesFrom.find(
                              b => b.nomenclature_id === option.id && 
                                   b.storage_cell_id === formData.storage_cell_from_id
                            );
                            const available = balance ? parseFloat(balance.quantity) : 0;
                            
                            return (
                              <li {...props}>
                                <Box>
                                  <Typography variant="body2">
                                    {option.code} - {option.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {option.unit}, Доступно: {available} шт
                                  </Typography>
                                </Box>
                              </li>
                            );
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          name="quantity"
                          label="Количество *"
                          type="number"
                          value={itemForm.quantity}
                          onChange={(e) => setItemForm(prev => ({ 
                            ...prev, 
                            quantity: e.target.value 
                          }))}
                          inputProps={{ 
                            min: 0.001, 
                            step: 0.001,
                            max: getAvailableQuantity()
                          }}
                          helperText={
                            itemForm.nomenclature 
                              ? `Доступно: ${getAvailableQuantity()} ${itemForm.nomenclature.unit}`
                              : ''
                          }
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={handleAddItem}
                          sx={{ height: '56px' }}
                          disabled={!itemForm.nomenclature || !itemForm.quantity}
                        >
                          Добавить
                        </Button>
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          name="batch"
                          label="Партия (опционально)"
                          value={itemForm.batch}
                          onChange={(e) => setItemForm(prev => ({ 
                            ...prev, 
                            batch: e.target.value 
                          }))}
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Информационное сообщение */}
                  {getAvailableNomenclature().length === 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      В выбранной ячейке нет доступных товаров для перемещения
                    </Alert>
                  )}

                  {formData.items.length > 0 && (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Товар</TableCell>
                            <TableCell>Количество</TableCell>
                            <TableCell>Ед. изм.</TableCell>
                            <TableCell>Стоимость</TableCell>
                            <TableCell>Партия</TableCell>
                            <TableCell>Действия</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {formData.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {item.nomenclature_code} - {item.nomenclature_name}
                              </TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell>{item.cost_price?.toLocaleString('ru-RU')} ₽</TableCell>
                              <TableCell>{item.batch || '-'}</TableCell>
                              <TableCell>
                                <IconButton 
                                  size="small"
                                  onClick={() => handleRemoveItem(index)}
                                  color="error"
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {formData.items.length === 0 && getAvailableNomenclature().length > 0 && (
                    <Alert severity="info">
                      Добавьте товары для перемещения
                    </Alert>
                  )}
                </>
              ) : (
                <Alert severity="warning">
                  Выберите склад и ячейку-отправитель для добавления товаров
                </Alert>
              )}
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Alert severity="info">
                Подтвердите данные перемещения
              </Alert>
              
              <Box sx={{ mt: 2 }}>
                <Typography><strong>Тип:</strong> {getTypeText(formData.type)}</Typography>
                <Typography>
                  <strong>Отправитель:</strong> {
                    getWarehouseName(formData.warehouse_from_id)
                  } (Ячейка: {
                    getStorageCellName(formData.storage_cell_from_id, storageCellsFrom)
                  })
                </Typography>
                
                {formData.type === 'internal' ? (
                  <Typography>
                    <strong>Получатель:</strong> {
                      getWarehouseName(formData.warehouse_from_id)
                    } (Ячейка: {
                      getStorageCellName(formData.storage_cell_to_id, storageCellsFrom)
                    })
                  </Typography>
                ) : (
                  <Typography>
                    <strong>Получатель:</strong> {
                      getWarehouseName(formData.warehouse_to_id)
                    } (Ячейка: {
                      getStorageCellName(formData.storage_cell_to_id, storageCellsTo)
                    })
                  </Typography>
                )}
                
                <Typography><strong>Причина:</strong> {formData.reason}</Typography>
                <Typography><strong>Товаров:</strong> {formData.items.length}</Typography>
                <Typography><strong>Общее количество:</strong> {
                  formData.items.reduce((sum, item) => sum + parseFloat(item.quantity), 0)
                }</Typography>
                <Typography><strong>Общая стоимость:</strong> {
                  formData.items.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString('ru-RU')
                } ₽</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          
          {activeStep > 0 && (
            <Button onClick={() => setActiveStep(activeStep - 1)}>
              Назад
            </Button>
          )}
          
          {activeStep < steps.length - 1 ? (
            <Button 
              variant="contained" 
              onClick={() => setActiveStep(activeStep + 1)}
              disabled={
                !formData.warehouse_from_id || 
                !formData.reason || 
                !formData.storage_cell_from_id ||
                (formData.type === 'internal' && !formData.storage_cell_to_id) ||
                (formData.type === 'external' && (!formData.warehouse_to_id || !formData.storage_cell_to_id))
              }
            >
              Далее
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              disabled={loading || formData.items.length === 0}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : formData.id ? (
                'Обновить перемещение'
              ) : (
                'Создать перемещение'
              )}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Movements;