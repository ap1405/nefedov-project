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
  InputAdornment,
  Menu,
  Checkbox,
  FormControlLabel,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  MoreVert as MoreVertIcon,
  FileCopy as FileCopyIcon
} from '@mui/icons-material';
import { useWarehouse } from '../contexts/WarehouseContext';
import { nomenclatureAPI, categoriesAPI } from '../services/api';

const Nomenclature = () => {
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const { selectedWarehouse } = useWarehouse();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category_id: null,
    type: 'product',
    unit: 'шт',
    description: '',
    min_quantity: null,
    max_quantity: null,
    barcode: '',
    vendor_code: '',
    purchase_price: null,
    selling_price: null,
    is_active: true
  });

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, [selectedWarehouse, filterType, filterCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterType !== 'all') params.type = filterType;
      if (filterCategory !== 'all') params.category = filterCategory;
      
      const response = await nomenclatureAPI.getAll(params);
      
      if (response.data.success) {
        setItems(response.data.items);
      } else {
        setError(response.data.error || 'Ошибка загрузки номенклатуры');
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки номенклатуры:', err);
      setError('Ошибка загрузки номенклатуры');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки категорий:', err);
    }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setFormData({
        code: item.code,
        name: item.name,
        category_id: item.category_id || null,
        type: item.type,
        unit: item.unit,
        description: item.description || '',
        min_quantity: item.min_quantity || null,
        max_quantity: item.max_quantity || null,
        barcode: item.barcode || '',
        vendor_code: item.vendor_code || '',
        purchase_price: item.purchase_price || null,
        selling_price: item.selling_price || null,
        is_active: item.is_active
      });
      setSelectedItem(item);
    } else {
      setFormData({
        code: '',
        name: '',
        category_id: null,
        type: 'product',
        unit: 'шт',
        description: '',
        min_quantity: null,
        max_quantity: null,
        barcode: '',
        vendor_code: '',
        purchase_price: null,
        selling_price: null,
        is_active: true
      });
      setSelectedItem(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
    setSelectedItem(null);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Преобразуем числовые поля
    let processedValue = value;
    
    if (type === 'number' && value !== '') {
      processedValue = parseFloat(value);
    } else if (name === 'min_quantity' || name === 'max_quantity' || 
               name === 'purchase_price' || name === 'selling_price') {
      if (value === '') {
        processedValue = null;
      } else {
        processedValue = parseFloat(value);
      }
    } else if (name === 'category_id') {
      processedValue = value === '' ? null : parseInt(value);
    } else if (type === 'checkbox') {
      processedValue = checked;
    }
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: processedValue 
    }));
  };

  const validateForm = () => {
    if (!formData.code.trim()) {
      setError('Введите код товара');
      return false;
    }
    if (!formData.name.trim()) {
      setError('Введите наименование товара');
      return false;
    }
    if (!formData.unit.trim()) {
      setError('Введите единицу измерения');
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
      // Подготовка данных для отправки
      const submitData = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        category_id: formData.category_id,
        type: formData.type,
        unit: formData.unit.trim(),
        description: formData.description || '',
        min_quantity: formData.min_quantity,
        max_quantity: formData.max_quantity,
        barcode: formData.barcode || '',
        vendor_code: formData.vendor_code || '',
        purchase_price: formData.purchase_price || 0,
        selling_price: formData.selling_price || 0,
        is_active: formData.is_active
      };

      console.log('📤 Отправка данных товара:', submitData);

      if (selectedItem) {
        // Обновление товара
        const response = await nomenclatureAPI.update(selectedItem.id, submitData);
        if (response.data.success) {
          setSuccess('Товар успешно обновлен');
          fetchData();
          handleCloseDialog();
        } else {
          setError(response.data.error || 'Ошибка обновления товара');
        }
      } else {
        // Создание товара
        const response = await nomenclatureAPI.create(submitData);
        if (response.data.success) {
          setSuccess('Товар успешно создан');
          fetchData();
          handleCloseDialog();
        } else {
          setError(response.data.error || 'Ошибка создания товара');
        }
      }
    } catch (err) {
      console.error('💥 Ошибка сохранения товара:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Ошибка сохранения товара: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот товар?')) return;
    
    setLoading(true);
    try {
      const response = await nomenclatureAPI.delete(id);
      if (response.data.success) {
        setSuccess('Товар успешно удален');
        fetchData();
      } else {
        setError(response.data.error || 'Ошибка удаления товара');
      }
    } catch (err) {
      console.error('❌ Ошибка удаления товара:', err);
      setError('Ошибка удаления товара: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, id) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowId(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowId(null);
  };

  const handleDuplicate = async (item) => {
    const newCode = `${item.code}-COPY`;
    const newName = `${item.name} (копия)`;
    
    setFormData({
      code: newCode,
      name: newName,
      category_id: item.category_id,
      type: item.type,
      unit: item.unit,
      description: item.description,
      min_quantity: item.min_quantity,
      max_quantity: item.max_quantity,
      barcode: '',
      vendor_code: '',
      purchase_price: item.purchase_price,
      selling_price: item.selling_price,
      is_active: item.is_active
    });
    
    setSelectedItem(null);
    setOpenDialog(true);
    handleMenuClose();
  };

  const getStockStatus = (current, min) => {
    if (!min || min === 0) return { color: 'default', text: 'Без контроля' };
    if (current === 0) return { color: 'error', text: 'Нет в наличии' };
    if (current < min) return { color: 'warning', text: 'Ниже минимума' };
    if (current <= min * 1.5) return { color: 'info', text: 'Норма' };
    return { color: 'success', text: 'Выше нормы' };
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Номенклатура
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Новый товар
        </Button>
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

      {/* Фильтры и поиск */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Поиск товара"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchData()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setSearchTerm(''); fetchData(); }}>
                      ✕
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Тип</InputLabel>
              <Select
                value={filterType}
                label="Тип"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">Все типы</MenuItem>
                <MenuItem value="product">Товары</MenuItem>
                <MenuItem value="material">Материалы</MenuItem>
                <MenuItem value="service">Услуги</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Категория</InputLabel>
              <Select
                value={filterCategory}
                label="Категория"
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <MenuItem value="all">Все категории</MenuItem>
                {categories.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              variant="contained"
              fullWidth
              onClick={fetchData}
              disabled={loading}
            >
              Применить
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Статистика */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Всего позиций
              </Typography>
              <Typography variant="h3">
                {items.length}
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
              <Typography variant="h3">
                {items.filter(i => i.is_active).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Товары
              </Typography>
              <Typography variant="h3">
                {items.filter(i => i.type === 'product').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Низкие остатки
              </Typography>
              <Typography variant="h3" color="warning.main">
                {items.filter(i => i.total_stock < i.min_quantity).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Таблица номенклатуры */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Код</TableCell>
              <TableCell>Наименование</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Категория</TableCell>
              <TableCell>Ед. изм.</TableCell>
              <TableCell>Остаток</TableCell>
              <TableCell>Мин.</TableCell>
              <TableCell>Закупка</TableCell>
              <TableCell>Продажа</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  Товары не найдены
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const status = getStockStatus(item.total_stock, item.min_quantity);
                
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        {item.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.type === 'product' ? 'Товар' : 
                               item.type === 'material' ? 'Материал' : 'Услуга'}
                        color={item.type === 'product' ? 'primary' : 
                               item.type === 'material' ? 'secondary' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{item.category_name || '-'}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Typography sx={{ mr: 1, fontWeight: 'bold' }}>
                          {item.total_stock || 0}
                        </Typography>
                        {item.min_quantity > 0 && (
                          <Chip
                            label={status.text}
                            color={status.color}
                            size="small"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {item.min_quantity > 0 ? item.min_quantity : '-'}
                    </TableCell>
                    <TableCell>
                      {item.purchase_price ? `${item.purchase_price.toLocaleString('ru-RU')} ₽` : '-'}
                    </TableCell>
                    <TableCell>
                      {item.selling_price ? `${item.selling_price.toLocaleString('ru-RU')} ₽` : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.is_active ? 'Активен' : 'Неактивен'}
                        color={item.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Редактировать">
                          <IconButton size="small" onClick={() => handleOpenDialog(item)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Дополнительно">
                          <IconButton 
                            size="small" 
                            onClick={(e) => handleMenuOpen(e, item.id)}
                          >
                            <MoreVertIcon fontSize="small" />
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
          {selectedItem ? 'Редактирование товара' : 'Новый товар'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="code"
                label="Код *"
                value={formData.code}
                onChange={handleFormChange}
                required
                disabled={!!selectedItem}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Тип *</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  label="Тип *"
                  onChange={handleFormChange}
                  required
                >
                  <MenuItem value="product">Товар</MenuItem>
                  <MenuItem value="material">Материал</MenuItem>
                  <MenuItem value="service">Услуга</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="name"
                label="Наименование *"
                value={formData.name}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Категория</InputLabel>
                <Select
                  name="category_id"
                  value={formData.category_id || ''}
                  label="Категория"
                  onChange={handleFormChange}
                >
                  <MenuItem value="">Не выбрана</MenuItem>
                  {categories.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="unit"
                label="Единица измерения *"
                value={formData.unit}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="min_quantity"
                label="Минимальный остаток"
                type="number"
                value={formData.min_quantity || ''}
                onChange={handleFormChange}
                disabled={formData.type === 'service'}
                inputProps={{ min: 0, step: 0.001 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="max_quantity"
                label="Максимальный остаток"
                type="number"
                value={formData.max_quantity || ''}
                onChange={handleFormChange}
                disabled={formData.type === 'service'}
                inputProps={{ min: 0, step: 0.001 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="barcode"
                label="Штрихкод"
                value={formData.barcode}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="vendor_code"
                label="Артикул поставщика"
                value={formData.vendor_code}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="purchase_price"
                label="Цена закупки"
                type="number"
                value={formData.purchase_price || ''}
                onChange={handleFormChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                }}
                inputProps={{ min: 0, step: 0.01 }}
                disabled={formData.type === 'service'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="selling_price"
                label="Цена продажи"
                type="number"
                value={formData.selling_price || ''}
                onChange={handleFormChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                }}
                inputProps={{ min: 0, step: 0.01 }}
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
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.is_active}
                    onChange={handleFormChange}
                    name="is_active"
                    color="primary"
                  />
                }
                label="Активный"
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

      {/* Меню действий */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const item = items.find(i => i.id === selectedRowId);
          if (item) {
            handleDuplicate(item);
          }
        }}>
          <ListItemIcon>
            <FileCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Создать копию</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          const item = items.find(i => i.id === selectedRowId);
          if (item) {
            handleDelete(item.id);
            handleMenuClose();
          }
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Удалить</ListItemText>
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default Nomenclature;