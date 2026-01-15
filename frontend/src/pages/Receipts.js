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
  Receipt as ReceiptIcon,
  LocalShipping as LocalShippingIcon,
  Person as PersonIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useWarehouse } from '../contexts/WarehouseContext';
import api, { receiptsAPI, nomenclatureAPI, warehousesAPI, storageCellsAPI } from '../services/api';

const Receipts = () => {
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [receipts, setReceipts] = useState([]);
  const { selectedWarehouse } = useWarehouse();

  const [formData, setFormData] = useState({
    id: null,
    receipt_date: new Date().toISOString().split('T')[0],
    warehouse_id: '',
    supplier_name: '',
    supplier_invoice: '',
    total_amount: 0,
    comment: '',
    items: [],
    status: 'draft'
  });

  const [itemForm, setItemForm] = useState({
    nomenclature_id: '',
    quantity: '',
    purchase_price: '',
    selling_price: '',
    batch: '',
    expiry_date: '',
    storage_cell_id: ''
  });

  const [nomenclatureList, setNomenclatureList] = useState([]);
  const [warehousesList, setWarehousesList] = useState([]);
  const [storageCells, setStorageCells] = useState([]);
  const [selectedNomenclature, setSelectedNomenclature] = useState(null);

  useEffect(() => {
    fetchData();
    fetchDropdowns();
  }, [selectedWarehouse]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await receiptsAPI.getAll();
      
      if (response.data.success) {
        // Фильтруем по выбранному складу если нужно
        let filteredReceipts = response.data.receipts || [];
        
        if (selectedWarehouse && selectedWarehouse.id !== 'all') {
          filteredReceipts = filteredReceipts.filter(
            receipt => receipt.warehouse_id === selectedWarehouse.id
          );
        }
        
        setReceipts(filteredReceipts);
      }
    } catch (err) {
      setError('Ошибка загрузки поступлений: ' + err.message);
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

  const handleOpenDialog = (receipt = null) => {
    if (receipt) {
      setFormData({
        id: receipt.id,
        receipt_date: receipt.receipt_date || new Date().toISOString().split('T')[0],
        warehouse_id: receipt.warehouse_id || '',
        supplier_name: receipt.supplier_name || '',
        supplier_invoice: receipt.supplier_invoice || '',
        total_amount: receipt.total_amount || 0,
        comment: receipt.comment || '',
        items: receipt.items || [],
        status: receipt.status || 'draft'
      });
      setActiveStep(0);
    } else {
      setFormData({
        id: null,
        receipt_date: new Date().toISOString().split('T')[0],
        warehouse_id: selectedWarehouse?.id !== 'all' ? selectedWarehouse?.id : '',
        supplier_name: '',
        supplier_invoice: '',
        total_amount: 0,
        comment: '',
        items: [],
        status: 'draft'
      });
      setItemForm({
        nomenclature_id: '',
        quantity: '',
        purchase_price: '',
        selling_price: '',
        batch: '',
        expiry_date: '',
        storage_cell_id: ''
      });
      setSelectedNomenclature(null);
      setActiveStep(0);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
    setSuccess('');
    setStorageCells([]);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'warehouse_id' && value) {
      fetchStorageCells(value);
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
      nomenclature_id: value?.id || '',
      selling_price: value?.selling_price || ''
    }));
  };

  const handleAddItem = () => {
    if (!selectedNomenclature || !itemForm.quantity || !itemForm.purchase_price) {
      setError('Заполните все обязательные поля товара');
      return;
    }

    // Проверяем, не добавлен ли уже этот товар
    const alreadyAdded = formData.items.some(
      item => item.nomenclature_id === selectedNomenclature.id
    );
    
    if (alreadyAdded) {
      setError('Этот товар уже добавлен в документ');
      return;
    }

    const newItem = {
      id: Date.now(),
      nomenclature_id: selectedNomenclature.id,
      nomenclature_code: selectedNomenclature.code,
      nomenclature_name: selectedNomenclature.name,
      quantity: parseFloat(itemForm.quantity),
      unit: selectedNomenclature.unit || 'шт',
      purchase_price: parseFloat(itemForm.purchase_price),
      selling_price: parseFloat(itemForm.selling_price) || parseFloat(itemForm.purchase_price) * 1.2,
      batch: itemForm.batch || '',
      expiry_date: itemForm.expiry_date || null,
      storage_cell_id: itemForm.storage_cell_id, // Обязательное поле
      amount: parseFloat(itemForm.quantity) * parseFloat(itemForm.purchase_price)
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      total_amount: prev.total_amount + newItem.amount
    }));

    setItemForm({
      nomenclature_id: '',
      quantity: '',
      purchase_price: '',
      selling_price: '',
      batch: '',
      expiry_date: '',
      storage_cell_id: ''
    });
    setSelectedNomenclature(null);

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
    if (!formData.warehouse_id || !formData.supplier_name || formData.items.length === 0) {
      setError('Заполните все обязательные поля');
      return;
    }
  const itemsWithoutCells = formData.items.filter(item => !item.storage_cell_id);
    if (itemsWithoutCells.length > 0) {
      setError(`Укажите ячейку хранения для товаров: ${itemsWithoutCells.map(item => item.nomenclature_name).join(', ')}`);
      return;
    }
    setLoading(true);
    try {
      const receiptData = {
        receipt_date: formData.receipt_date,
        warehouse_id: formData.warehouse_id,
        supplier_name: formData.supplier_name,
        supplier_invoice: formData.supplier_invoice || '',
        comment: formData.comment || '',
        items: formData.items.map(item => ({
          nomenclature_id: item.nomenclature_id,
          quantity: item.quantity,
           unit: item.unit || 'шт', // Убедитесь что unit всегда есть
          purchase_price: item.purchase_price,
          selling_price: item.selling_price,
          batch: item.batch,
          expiry_date: item.expiry_date,
          storage_cell_id: item.storage_cell_id // Теперь обязательное поле
        }))
      };

      console.log('Сохранение поступления:', receiptData);
      
      const response = await receiptsAPI.create(receiptData);
      
      if (response.data.success) {
        setSuccess('Поступление успешно создано');
        
        setTimeout(() => {
          handleCloseDialog();
          fetchData();
        }, 1500);
      } else {
        setError(response.data.error || 'Ошибка сохранения поступления');
      }
    } catch (err) {
      setError('Ошибка сохранения поступления: ' + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (receiptId) => {
    if (!window.confirm('Провести поступление?')) return;
    
    setLoading(true);
    try {
      const response = await receiptsAPI.complete(receiptId);
      
      if (response.data.success) {
        setSuccess('Поступление успешно проведено');
        fetchData();
      } else {
        setError(response.data.error || 'Ошибка проведения поступления');
      }
    } catch (err) {
      setError('Ошибка проведения поступления: ' + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (receiptId) => {
    if (!window.confirm('Удалить поступление?')) return;
    
    setLoading(true);
    try {
      const response = await receiptsAPI.delete(receiptId);
      
      if (response.data.success) {
        setSuccess('Поступление удалено');
        fetchData();
      } else {
        setError(response.data.error || 'Ошибка удаления поступления');
      }
    } catch (err) {
      setError('Ошибка удаления поступления: ' + err.message);
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

  // Фильтруем номенклатуру - убираем уже добавленные товары
  const availableNomenclature = nomenclatureList.filter(
    item => !formData.items.some(addedItem => addedItem.nomenclature_id === item.id)
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Поступления товаров
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Новое поступление
        </Button>
      </Box>

      {/* Фильтры и поиск */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Поиск (номер, поставщик)"
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

      {/* Таблица поступлений */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Номер</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>Склад</TableCell>
              <TableCell>Поставщик</TableCell>
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
            ) : receipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Поступления не найдены
                </TableCell>
              </TableRow>
            ) : (
              receipts.map((receipt) => {
                const warehouse = warehousesList.find(w => w.id === receipt.warehouse_id);
                
                return (
                  <TableRow key={receipt.id} hover>
                    <TableCell>
                      <Typography fontWeight="bold">
                        {receipt.document_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(receipt.receipt_date).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell>{warehouse?.name || receipt.warehouse_id}</TableCell>
                    <TableCell>{receipt.supplier_name}</TableCell>
                    <TableCell>{receipt.items_count || 0}</TableCell>
                    <TableCell>
                      {receipt.total_amount?.toLocaleString('ru-RU') || 0} ₽
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(receipt.status)}
                        color={getStatusColor(receipt.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        {receipt.status === 'draft' && (
                          <Tooltip title="Провести">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleComplete(receipt.id)}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {receipt.status === 'draft' && (
                          <Tooltip title="Редактировать">
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenDialog(receipt)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Просмотр">
                          <IconButton 
                            size="small" 
                            onClick={() => handleOpenDialog(receipt)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {receipt.status === 'draft' && (
                          <Tooltip title="Удалить">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDelete(receipt.id)}
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
          {formData.id ? 'Редактирование поступления' : 'Новое поступление'}
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
                  label="Дата поступления"
                  type="date"
                  name="receipt_date"
                  value={formData.receipt_date}
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
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="supplier_name"
                  label="Поставщик *"
                  value={formData.supplier_name}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="supplier_invoice"
                  label="Номер счета"
                  value={formData.supplier_invoice}
                  onChange={handleFormChange}
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
                Товары
              </Typography>
              
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
                      renderOption={(props, option) => (
                        <li {...props}>
                          <Box>
                            <Typography variant="body2">
                              {option.code} - {option.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.unit}, Цена: {option.selling_price} ₽
                            </Typography>
                          </Box>
                        </li>
                      )}
                      disabled={formData.items.length >= availableNomenclature.length}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      name="quantity"
                      label="Количество *"
                      type="number"
                      value={itemForm.quantity}
                      onChange={handleItemFormChange}
                      inputProps={{ min: 0.001, step: 0.001 }}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      name="purchase_price"
                      label="Цена закупки *"
                      type="number"
                      value={itemForm.purchase_price}
                      onChange={handleItemFormChange}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      name="selling_price"
                      label="Цена продажи"
                      type="number"
                      value={itemForm.selling_price}
                      onChange={handleItemFormChange}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleAddItem}
                      sx={{ height: '56px' }}
                      disabled={!selectedNomenclature || !itemForm.quantity || !itemForm.purchase_price}
                    >
                      Добавить
                    </Button>
                  </Grid>
                </Grid>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      name="batch"
                      label="Партия"
                      value={itemForm.batch}
                      onChange={handleItemFormChange}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      name="expiry_date"
                      label="Срок годности"
                      type="date"
                      value={itemForm.expiry_date}
                      onChange={handleItemFormChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth required>
                      <InputLabel>Ячейка хранения *</InputLabel>
                      <Select
                        name="storage_cell_id"
                        value={itemForm.storage_cell_id}
                        label="Ячейка хранения *"
                        onChange={handleItemFormChange}
                        disabled={!formData.warehouse_id}
                      >
                        <MenuItem value="">Выберите ячейку</MenuItem>
                        {storageCells.map(cell => (
                          <MenuItem key={cell.id} value={cell.id}>
                            {cell.code} {cell.name ? `(${cell.name})` : ''}
                            {cell.current_capacity && cell.max_capacity && 
                              ` - заполнено: ${((cell.current_capacity / cell.max_capacity) * 100).toFixed(0)}%`
                            }
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>

              {formData.items.length > 0 && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Товар</TableCell>
                        <TableCell align="right">Количество</TableCell>
                        <TableCell align="right">Цена закупки</TableCell>
                        <TableCell align="right">Сумма</TableCell>
                        <TableCell>Ячейка</TableCell>
                        <TableCell>Действия</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.items.map((item) => {
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
                            <TableCell align="right">
                              {item.quantity}
                            </TableCell>
                            <TableCell align="right">
                              {item.purchase_price?.toLocaleString('ru-RU')} ₽
                            </TableCell>
                            <TableCell align="right">
                              {(item.quantity * item.purchase_price).toLocaleString('ru-RU')} ₽
                            </TableCell>
                            <TableCell>
                              {cell ? cell.code : '-'}
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
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Alert severity="info">
                Подтвердите данные поступления
              </Alert>
              <Box sx={{ mt: 2 }}>
                <Typography><strong>Дата:</strong> {formData.receipt_date}</Typography>
                <Typography><strong>Склад:</strong> {warehousesList.find(w => w.id === formData.warehouse_id)?.name}</Typography>
                <Typography><strong>Поставщик:</strong> {formData.supplier_name}</Typography>
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
              disabled={!formData.warehouse_id || !formData.supplier_name}
            >
              Далее
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              disabled={loading || formData.items.length === 0}
            >
              {loading ? <CircularProgress size={24} /> : 'Сохранить поступление'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Receipts;