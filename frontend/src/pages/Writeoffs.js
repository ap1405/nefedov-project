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
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Autocomplete,
  IconButton as MuiIconButton
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
  Warning as WarningIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useWarehouse } from '../contexts/WarehouseContext';
import api, { writeoffsAPI, nomenclatureAPI, warehousesAPI, storageCellsAPI } from '../services/api';

const Writeoffs = () => {
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [writeoffs, setWriteoffs] = useState([]);
  const { selectedWarehouse } = useWarehouse();

  const [formData, setFormData] = useState({
    id: null,
    writeoff_date: new Date().toISOString().split('T')[0],
    warehouse_id: '',
    reason: '',
    total_amount: 0,
    comment: '',
    items: [],
    status: 'draft'
  });

  const [itemForm, setItemForm] = useState({
    nomenclature_id: '',
    quantity: '',
    batch: '',
    storage_cell_id: ''
  });

  const [nomenclatureList, setNomenclatureList] = useState([]);
  const [warehousesList, setWarehousesList] = useState([]);
  const [storageCells, setStorageCells] = useState([]);
  const [stockBalances, setStockBalances] = useState([]);
  const [selectedNomenclature, setSelectedNomenclature] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);

  useEffect(() => {
    fetchData();
    fetchDropdowns();
  }, [selectedWarehouse]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await writeoffsAPI.getAll();
      
      if (response.data.success) {
        // Фильтруем по выбранному складу если нужно
        let filteredWriteoffs = response.data.writeoffs || [];
        
        if (selectedWarehouse && selectedWarehouse.id !== 'all') {
          filteredWriteoffs = filteredWriteoffs.filter(
            writeoff => writeoff.warehouse_id === selectedWarehouse.id
          );
        }
        
        setWriteoffs(filteredWriteoffs);
      }
    } catch (err) {
      setError('Ошибка загрузки списаний: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      // Загружаем номенклатуру
      const nomResponse = await nomenclatureAPI.getAll();
      if (nomResponse.data.success) {
        setNomenclatureList(nomResponse.data.items || []);
      }

      // Загружаем склады
      const whResponse = await warehousesAPI.getAll();
      if (whResponse.data.success) {
        setWarehousesList(whResponse.data.warehouses || []);
      }

    } catch (err) {
      console.error('Ошибка загрузки справочников:', err);
    }
  };

  const fetchStorageCells = async (warehouseId) => {
    try {
      const response = await storageCellsAPI.getAll({ warehouse_id: warehouseId });
      if (response.data.success) {
        setStorageCells(response.data.cells || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки ячеек:', err);
      setStorageCells([]);
    }
  };

  const fetchStockBalances = async (warehouseId) => {
    try {
      const response = await api.get('/api/reports/stock-balances', {
        params: { warehouse_id: warehouseId }
      });
      
      if (response.data.success) {
        setStockBalances(response.data.report || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки остатков:', err);
      setStockBalances([]);
    }
  };

  const handleOpenDialog = (writeoff = null) => {
    if (writeoff) {
      setFormData({
        id: writeoff.id,
        writeoff_date: writeoff.writeoff_date || new Date().toISOString().split('T')[0],
        warehouse_id: writeoff.warehouse_id || '',
        reason: writeoff.reason || '',
        total_amount: writeoff.total_amount || 0,
        comment: writeoff.comment || '',
        items: writeoff.items || [],
        status: writeoff.status || 'draft'
      });
      setActiveStep(0);
      
      // Загружаем ячейки и остатки для выбранного склада
      if (writeoff.warehouse_id) {
        fetchStorageCells(writeoff.warehouse_id);
        fetchStockBalances(writeoff.warehouse_id);
      }
    } else {
      setFormData({
        id: null,
        writeoff_date: new Date().toISOString().split('T')[0],
        warehouse_id: selectedWarehouse?.id !== 'all' ? selectedWarehouse?.id : '',
        reason: '',
        total_amount: 0,
        comment: '',
        items: [],
        status: 'draft'
      });
      setItemForm({
        nomenclature_id: '',
        quantity: '',
        batch: '',
        storage_cell_id: ''
      });
      setSelectedNomenclature(null);
      setSelectedCell(null);
      setActiveStep(0);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
    setSuccess('');
    setStorageCells([]);
    setStockBalances([]);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'warehouse_id' && value) {
      fetchStorageCells(value);
      fetchStockBalances(value);
    }
  };

  const handleItemFormChange = (e) => {
    const { name, value } = e.target;
    setItemForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNomenclatureSelect = (event, value) => {
    setSelectedNomenclature(value);
    setItemForm(prev => ({ 
      ...prev, 
      nomenclature_id: value?.id || ''
    }));
  };

  const handleCellSelect = (event, value) => {
    setSelectedCell(value);
    setItemForm(prev => ({ 
      ...prev, 
      storage_cell_id: value?.id || ''
    }));
  };

  const getAvailableQuantity = () => {
    if (!selectedNomenclature || !selectedCell) return 0;
    
    const balance = stockBalances.find(
      item => item.nomenclature_id === selectedNomenclature.id && 
              item.storage_cell_id === selectedCell.id
    );
    
    return balance ? parseFloat(balance.quantity) : 0;
  };

  const handleAddItem = () => {
    if (!selectedNomenclature || !itemForm.quantity || !selectedCell) {
      setError('Заполните все обязательные поля товара');
      return;
    }

    // Проверяем доступное количество
    const availableQuantity = getAvailableQuantity();
    const requestedQuantity = parseFloat(itemForm.quantity);
    
    if (requestedQuantity > availableQuantity) {
      setError(`Недостаточно товара на ячейке. Доступно: ${availableQuantity}`);
      return;
    }

    // Проверяем, не добавлен ли уже этот товар с этой ячейки
    const alreadyAdded = formData.items.some(
      item => item.nomenclature_id === selectedNomenclature.id && 
              item.storage_cell_id === selectedCell.id
    );
    
    if (alreadyAdded) {
      setError('Этот товар уже добавлен с выбранной ячейки');
      return;
    }

    // Получаем стоимость товара
    const balance = stockBalances.find(
      item => item.nomenclature_id === selectedNomenclature.id && 
              item.storage_cell_id === selectedCell.id
    );
    
    const costPrice = balance ? parseFloat(balance.average_cost) : 0;

    const newItem = {
      id: Date.now(),
      nomenclature_id: selectedNomenclature.id,
      nomenclature_code: selectedNomenclature.code,
      nomenclature_name: selectedNomenclature.name,
      quantity: requestedQuantity,
      unit: selectedNomenclature.unit || 'шт',
      cost_price: costPrice,
      batch: itemForm.batch || '',
      storage_cell_id: selectedCell.id,
      storage_cell_code: selectedCell.code,
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
      quantity: '',
      batch: '',
      storage_cell_id: ''
    });
    setSelectedNomenclature(null);
    setSelectedCell(null);

    setSuccess('Товар добавлен');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRemoveItem = (itemId) => {
    const itemToRemove = formData.items.find(item => item.id === itemId);
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
      total_amount: prev.total_amount - (itemToRemove?.amount || 0)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.warehouse_id || !formData.reason || formData.items.length === 0) {
      setError('Заполните все обязательные поля');
      return;
    }

    setLoading(true);
    try {
      const writeoffData = {
        writeoff_date: formData.writeoff_date,
        warehouse_id: formData.warehouse_id,
        reason: formData.reason,
        comment: formData.comment || '',
        items: formData.items.map(item => ({
          nomenclature_id: item.nomenclature_id,
          quantity: item.quantity,
          storage_cell_id: item.storage_cell_id,
          batch: item.batch
        }))
      };

      console.log('Сохранение списания:', writeoffData);
      
      let response;
      if (formData.id) {
        response = await writeoffsAPI.update(formData.id, writeoffData);
      } else {
        response = await writeoffsAPI.create(writeoffData);
      }
      
      if (response.data.success) {
        setSuccess(formData.id ? 'Списание обновлено' : 'Списание успешно создано');
        
        setTimeout(() => {
          handleCloseDialog();
          fetchData();
        }, 1500);
      } else {
        setError(response.data.error || 'Ошибка сохранения списания');
      }
    } catch (err) {
      setError('Ошибка сохранения списания: ' + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (writeoffId) => {
    if (!window.confirm('Провести списание?')) return;
    
    setLoading(true);
    try {
      const response = await writeoffsAPI.complete(writeoffId);
      
      if (response.data.success) {
        setSuccess('Списание успешно проведено');
        fetchData();
      } else {
        setError(response.data.error || 'Ошибка проведения списания');
      }
    } catch (err) {
      setError('Ошибка проведения списания: ' + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (writeoffId) => {
    if (!window.confirm('Удалить списание?')) return;
    
    setLoading(true);
    try {
      const response = await writeoffsAPI.delete(writeoffId);
      
      if (response.data.success) {
        setSuccess('Списание удалено');
        fetchData();
      } else {
        setError(response.data.error || 'Ошибка удаления списания');
      }
    } catch (err) {
      setError('Ошибка удаления списания: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Завершено';
      case 'pending': return 'Ожидание';
      case 'cancelled': return 'Отменено';
      case 'draft': return 'Черновик';
      default: return status;
    }
  };

  const steps = ['Основные данные', 'Товары', 'Подтверждение'];

  // Фильтруем номенклатуру - только товары, которые есть на выбранном складе
  const availableNomenclature = nomenclatureList.filter(item => {
    if (!stockBalances.length) return false;
    return stockBalances.some(balance => balance.nomenclature_id === item.id);
  });

  // Фильтруем ячейки - только те, где есть выбранный товар
  const availableCells = selectedNomenclature 
    ? storageCells.filter(cell => 
        stockBalances.some(
          balance => balance.nomenclature_id === selectedNomenclature.id && 
                     balance.storage_cell_id === cell.id &&
                     parseFloat(balance.quantity) > 0
        )
      )
    : [];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Списание товаров
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={loading}
        >
          Новое списание
        </Button>
      </Box>

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
            <TextField
              fullWidth
              label="Дата с"
              type="date"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Дата по"
              type="date"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select label="Статус" defaultValue="all">
                <MenuItem value="all">Все</MenuItem>
                <MenuItem value="draft">Черновики</MenuItem>
                <MenuItem value="pending">Ожидание</MenuItem>
                <MenuItem value="completed">Завершено</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<RefreshIcon />}
              onClick={fetchData}
              disabled={loading}
            >
              Обновить
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

      {/* Таблица списаний */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Номер</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>Склад</TableCell>
              <TableCell>Причина</TableCell>
              <TableCell>Товаров</TableCell>
              <TableCell>Сумма</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : writeoffs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Списания не найдены
                </TableCell>
              </TableRow>
            ) : (
              writeoffs.map((writeoff) => {
                const warehouse = warehousesList.find(w => w.id === writeoff.warehouse_id);
                
                return (
                  <TableRow key={writeoff.id} hover>
                    <TableCell>
                      <Typography fontWeight="bold">
                        {writeoff.document_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(writeoff.writeoff_date).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell>{warehouse?.name || writeoff.warehouse_id}</TableCell>
                    <TableCell>{writeoff.reason}</TableCell>
                    <TableCell>{writeoff.items_count || 0}</TableCell>
                    <TableCell>
                      {writeoff.total_amount?.toLocaleString('ru-RU') || 0} ₽
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(writeoff.status)}
                        color={getStatusColor(writeoff.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        {writeoff.status === 'draft' && (
                          <Tooltip title="Провести">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleComplete(writeoff.id)}
                              disabled={loading}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {writeoff.status === 'draft' && (
                          <Tooltip title="Редактировать">
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenDialog(writeoff)}
                              disabled={loading}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Просмотр">
                          <IconButton 
                            size="small" 
                            onClick={() => handleOpenDialog(writeoff)}
                            disabled={loading}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {writeoff.status === 'draft' && (
                          <Tooltip title="Удалить">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDelete(writeoff.id)}
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
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {formData.id ? 'Редактирование списания' : 'Новое списание'}
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
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Дата списания"
                  type="date"
                  name="writeoff_date"
                  value={formData.writeoff_date}
                  onChange={handleFormChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Склад *</InputLabel>
                  <Select
                    name="warehouse_id"
                    value={formData.warehouse_id}
                    label="Склад *"
                    onChange={handleFormChange}
                  >
                    <MenuItem value="">Выберите склад</MenuItem>
                    {warehousesList.map(wh => (
                      <MenuItem key={wh.id} value={wh.id}>
                        {wh.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="reason"
                  label="Причина списания *"
                  value={formData.reason}
                  onChange={handleFormChange}
                  multiline
                  rows={2}
                  required
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
                Товары для списания
              </Typography>
              
              {formData.warehouse_id ? (
                <>
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <Autocomplete
                          options={availableNomenclature}
                          getOptionLabel={(option) => `${option.code} - ${option.name}`}
                          value={selectedNomenclature}
                          onChange={handleNomenclatureSelect}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Товар *"
                              placeholder="Выберите товар"
                            />
                          )}
                          renderOption={(props, option) => {
                            const balance = stockBalances.find(b => b.nomenclature_id === option.id);
                            const totalQty = balance ? parseFloat(balance.quantity) : 0;
                            
                            return (
                              <li {...props}>
                                <Box>
                                  <Typography variant="body2">
                                    {option.code} - {option.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {option.unit}, Доступно: {totalQty} шт
                                  </Typography>
                                </Box>
                              </li>
                            );
                          }}
                          disabled={!formData.warehouse_id}
                        />
                      </Grid>
                      
                      {selectedNomenclature && (
                        <Grid item xs={12} md={4}>
                          <Autocomplete
                            options={availableCells}
                            getOptionLabel={(option) => `${option.code} - ${option.name || ''}`}
                            value={selectedCell}
                            onChange={handleCellSelect}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Ячейка хранения *"
                                placeholder="Выберите ячейку"
                              />
                            )}
                            renderOption={(props, option) => {
                              const balance = stockBalances.find(
                                b => b.nomenclature_id === selectedNomenclature.id && 
                                     b.storage_cell_id === option.id
                              );
                              const qty = balance ? parseFloat(balance.quantity) : 0;
                              
                              return (
                                <li {...props}>
                                  <Box>
                                    <Typography variant="body2">
                                      {option.code}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {option.name || ''}, Количество: {qty} шт
                                    </Typography>
                                  </Box>
                                </li>
                              );
                            }}
                          />
                        </Grid>
                      )}
                      
                      <Grid item xs={6} md={2}>
                        <TextField
                          fullWidth
                          name="quantity"
                          label="Количество *"
                          type="number"
                          value={itemForm.quantity}
                          onChange={handleItemFormChange}
                          inputProps={{ 
                            min: 0.001, 
                            max: selectedNomenclature && selectedCell ? getAvailableQuantity() : undefined,
                            step: 0.001 
                          }}
                          helperText={
                            selectedNomenclature && selectedCell 
                              ? `Доступно: ${getAvailableQuantity()}`
                              : ''
                          }
                        />
                      </Grid>
                      
                      <Grid item xs={6} md={2}>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={handleAddItem}
                          sx={{ height: '56px' }}
                          disabled={
                            !selectedNomenclature || 
                            !itemForm.quantity || 
                            !selectedCell ||
                            parseFloat(itemForm.quantity) > getAvailableQuantity()
                          }
                        >
                          Добавить
                        </Button>
                      </Grid>
                    </Grid>
                    
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          name="batch"
                          label="Партия"
                          value={itemForm.batch}
                          onChange={handleItemFormChange}
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                  {formData.items.length > 0 && (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Товар</TableCell>
                            <TableCell>Ячейка</TableCell>
                            <TableCell align="right">Количество</TableCell>
                            <TableCell align="right">Стоимость</TableCell>
                            <TableCell>Партия</TableCell>
                            <TableCell>Действия</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {formData.items.map((item) => {
                            const nomenclature = nomenclatureList.find(n => n.id === item.nomenclature_id);
                            const cell = storageCells.find(c => c.id === item.storage_cell_id);
                            
                            return (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <Typography variant="body2">
                                    {item.nomenclature_code} - {item.nomenclature_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.unit}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {cell ? cell.code : item.storage_cell_code}
                                </TableCell>
                                <TableCell align="right">
                                  {item.quantity}
                                </TableCell>
                                <TableCell align="right">
                                  {item.cost_price?.toLocaleString('ru-RU')} ₽
                                </TableCell>
                                <TableCell>
                                  {item.batch || '-'}
                                </TableCell>
                                <TableCell>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleRemoveItem(item.id)}
                                    color="error"
                                  >
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" align="right">
                    Итого: {formData.total_amount.toLocaleString('ru-RU')} ₽
                  </Typography>
                </>
              ) : (
                <Alert severity="info">
                  Выберите склад для отображения доступных товаров
                </Alert>
              )}
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Alert severity="warning">
                Подтвердите списание товаров
              </Alert>
              <Box sx={{ mt: 2 }}>
                <Typography><strong>Дата:</strong> {formData.writeoff_date}</Typography>
                <Typography><strong>Склад:</strong> {warehousesList.find(w => w.id === formData.warehouse_id)?.name}</Typography>
                <Typography><strong>Причина:</strong> {formData.reason}</Typography>
                <Typography><strong>Товаров:</strong> {formData.items.length}</Typography>
                <Typography><strong>Общая сумма:</strong> {formData.total_amount.toLocaleString('ru-RU')} ₽</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          {activeStep > 0 && (
            <Button onClick={() => setActiveStep(activeStep - 1)}>Назад</Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button 
              variant="contained" 
              onClick={() => setActiveStep(activeStep + 1)}
              disabled={!formData.warehouse_id || !formData.reason}
            >
              Далее
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              disabled={loading || formData.items.length === 0}
              color={formData.id ? 'primary' : 'warning'}
            >
              {loading ? <CircularProgress size={24} /> : formData.id ? 'Обновить списание' : 'Создать списание'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Writeoffs;