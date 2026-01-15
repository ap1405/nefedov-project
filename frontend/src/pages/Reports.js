import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip as MuiChip
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  Warehouse as WarehouseIcon,
  Storage as StorageIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  FilterList as FilterListIcon,
  Business as BusinessIcon,
  DateRange as DateRangeIcon,
  Inventory as InventoryIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';
import { useWarehouse } from '../contexts/WarehouseContext';
import api from '../services/api';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [reportScope, setReportScope] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Данные отчетов
  const [lowStockReport, setLowStockReport] = useState([]);
  const [stockBalancesReport, setStockBalancesReport] = useState([]);
  const [movementLogReport, setMovementLogReport] = useState([]);
  const [financialStats, setFinancialStats] = useState({
    total_value: 0,
    total_items: 0,
    critical_items: 0,
    monthly_receipts: 0,
    monthly_writeoffs: 0
  });
  
  const { selectedWarehouse, warehouses } = useWarehouse();

  useEffect(() => {
    // Устанавливаем даты по умолчанию (последние 30 дней)
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);
    
    setDateFrom(lastMonth.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
    
    fetchReports();
  }, [selectedWarehouse, reportScope]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Получаем отчет по низким остаткам
      await fetchLowStockReport();
      
      // Получаем отчет по остаткам на складах
      await fetchStockBalancesReport();
      
      // Получаем журнал движений
      await fetchMovementLogReport();
      
      // Получаем финансовую статистику
      await fetchFinancialStats();
      
    } catch (err) {
      setError('Ошибка загрузки отчетов: ' + err.message);
      console.error('Ошибка загрузки отчетов:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStockReport = async () => {
    try {
      const response = await api.get('/api/reports/low-stock');
      if (response.data.success) {
        // Фильтруем по выбранному складу если нужно
        let reportData = response.data.items || [];
        
        if (reportScope === 'warehouse' && selectedWarehouse?.id !== 'all') {
          // Здесь нужно фильтровать по складу на сервере
          // Временное решение - получить все данные и фильтровать на клиенте
          const stockResponse = await api.get('/api/reports/stock-balances', {
            params: { warehouse_id: selectedWarehouse.id }
          });
          
          if (stockResponse.data.success) {
            const warehouseItems = stockResponse.data.report || [];
            const warehouseItemIds = new Set(warehouseItems.map(item => item.id));
            reportData = reportData.filter(item => warehouseItemIds.has(item.id));
          }
        }
        
        setLowStockReport(reportData);
      }
    } catch (err) {
      console.error('Ошибка загрузки отчета по низким остаткам:', err);
      setLowStockReport([]);
    }
  };

  const fetchStockBalancesReport = async () => {
    try {
      const params = {};
      if (reportScope === 'warehouse' && selectedWarehouse?.id !== 'all') {
        params.warehouse_id = selectedWarehouse.id;
      }

      const response = await api.get('/api/reports/stock-balances', { params });
      
      if (response.data.success) {
        setStockBalancesReport(response.data.report || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки отчета по остаткам:', err);
      setStockBalancesReport([]);
    }
  };

  const fetchMovementLogReport = async () => {
    try {
      const params = {};
      if (reportScope === 'warehouse' && selectedWarehouse?.id !== 'all') {
        params.warehouse_id = selectedWarehouse.id;
      }
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;

      const response = await api.get('/api/reports/movement-log', { params });
      
      if (response.data.success) {
        setMovementLogReport(response.data.movements || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки журнала движений:', err);
      setMovementLogReport([]);
    }
  };

  const fetchFinancialStats = async () => {
    try {
      const params = {};
      if (reportScope === 'warehouse' && selectedWarehouse?.id !== 'all') {
        params.warehouse_id = selectedWarehouse.id;
      }

      const response = await api.get('/api/dashboard/stats', { params });
      
      if (response.data.success) {
        setFinancialStats({
          total_value: response.data.stats?.total_value || 0,
          total_items: response.data.stats?.items_in_stock || 0,
          critical_items: response.data.stats?.critical_items || 0,
          monthly_receipts: 0, // Рассчитывается отдельно
          monthly_writeoffs: 0  // Рассчитывается отдельно
        });
      }
    } catch (err) {
      console.error('Ошибка загрузки финансовой статистики:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleExportReport = () => {
    const scopeText = reportScope === 'warehouse' && selectedWarehouse?.id !== 'all' 
      ? `по складу ${selectedWarehouse?.name}` 
      : 'по всей организации';
    
    // Формируем данные для экспорта
    let reportData = '';
    let fileName = '';
    
    switch (tabValue) {
      case 0: // Низкие остатки
        reportData = lowStockReport.map(item => ({
          'Код товара': item.code,
          'Наименование': item.name,
          'Категория': item.category_name,
          'Текущий остаток': item.current_quantity || item.total_quantity,
          'Минимальный остаток': item.min_quantity,
          'Единица измерения': item.unit,
          'Статус': getStockStatus(item.current_quantity || item.total_quantity, item.min_quantity).text
        }));
        fileName = `low_stock_report_${new Date().toISOString().split('T')[0]}.csv`;
        break;
        
      case 1: // Остатки по складам
        reportData = stockBalancesReport.map(item => ({
          'Склад': item.warehouse_name,
          'Ячейка': item.cell_code || '-',
          'Код товара': item.item_code,
          'Наименование': item.item_name,
          'Количество': item.quantity,
          'Единица измерения': item.unit,
          'Средняя стоимость': item.average_cost,
          'Общая стоимость': (item.quantity * (item.average_cost || 0)).toFixed(2)
        }));
        fileName = `stock_balances_${new Date().toISOString().split('T')[0]}.csv`;
        break;
        
      case 2: // Журнал движений
        reportData = movementLogReport.map(item => ({
          'Дата': new Date(item.movement_date).toLocaleString('ru-RU'),
          'Документ': item.document_number,
          'Тип': getDocumentTypeText(item.document_type),
          'Склад': item.warehouse_name,
          'Ячейка': item.cell_code || '-',
          'Товар': `${item.item_code} - ${item.item_name}`,
          'Изменение': item.quantity_change,
          'Остаток после': item.quantity_after,
          'Пользователь': item.user_name || '-'
        }));
        fileName = `movement_log_${dateFrom}_${dateTo}.csv`;
        break;
    }
    
    // Конвертируем в CSV
    const csvContent = convertToCSV(reportData);
    downloadCSV(csvContent, fileName);
    
    setSuccess(`Отчет "${fileName}" подготовлен для скачивания`);
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(';'),
      ...data.map(row => 
        headers.map(header => 
          JSON.stringify(row[header], (key, value) => 
            value === null ? '' : value
          )
        ).join(';')
      )
    ];
    
    return csvRows.join('\n');
  };

  const downloadCSV = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateStockStatus = (current, min) => {
    if (!current || current === 0) return { status: 'out_of_stock', color: 'error', text: 'Нет в наличии' };
    if (!min || min === 0) return { status: 'no_control', color: 'default', text: 'Без контроля' };
    if (current < min) return { status: 'low', color: 'warning', text: 'Ниже минимума' };
    if (current <= min * 1.2) return { status: 'warning', color: 'info', text: 'На минимуме' };
    return { status: 'normal', color: 'success', text: 'Норма' };
  };

  const getDocumentTypeText = (type) => {
    switch (type) {
      case 'receipt': return 'Поступление';
      case 'writeoff': return 'Списание';
      case 'movement': return 'Перемещение';
      default: return type;
    }
  };

  const getDocumentTypeColor = (type) => {
    switch (type) {
      case 'receipt': return 'success';
      case 'writeoff': return 'error';
      case 'movement': return 'info';
      default: return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleViewReportDetails = (report) => {
    setSelectedReport(report);
    setReportOpen(true);
  };

  const handleCloseReportDetails = () => {
    setReportOpen(false);
    setSelectedReport(null);
  };

  const ReportTabs = () => (
    <Paper sx={{ mb: 3 }}>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Минимальные остатки" />
        <Tab label="Остатки по складам" />
        <Tab label="Журнал движений" />
        <Tab label="Финансовые показатели" />
      </Tabs>
    </Paper>
  );

  const ReportFilters = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Область отчета</InputLabel>
            <Select
              value={reportScope}
              label="Область отчета"
              onChange={(e) => setReportScope(e.target.value)}
            >
              <MenuItem value="all">Вся организация</MenuItem>
              <MenuItem value="warehouse">Выбранный склад</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        {reportScope === 'warehouse' && (
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Склад</InputLabel>
              <Select
                value={selectedWarehouse?.id || ''}
                label="Склад"
                disabled
              >
                <MenuItem value={selectedWarehouse?.id}>
                  {selectedWarehouse?.name || 'Не выбран'}
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}
        
        <Grid item xs={12} md={2}>
          <TextField
            fullWidth
            label="Дата с"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: <DateRangeIcon sx={{ mr: 1, color: 'action.active', fontSize: 18 }} />,
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <TextField
            fullWidth
            label="Дата по"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: <DateRangeIcon sx={{ mr: 1, color: 'action.active', fontSize: 18 }} />,
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<RefreshIcon />}
            onClick={fetchReports}
            disabled={loading}
          >
            Обновить
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderReportContent = () => {
    switch (tabValue) {
      case 0: // Минимальные остатки
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Товары с низкими остатками {reportScope === 'warehouse' && selectedWarehouse?.id !== 'all' && 
                `на ${selectedWarehouse?.name}`}
            </Typography>
            
            {lowStockReport.length === 0 ? (
              <Alert severity="success">
                Нет товаров с низкими остатками для выбранной области отчета
              </Alert>
            ) : (
              <>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Внимание: {lowStockReport.filter(item => 
                    calculateStockStatus(item.current_quantity || item.total_quantity, item.min_quantity).status === 'low'
                  ).length} товаров требуют пополнения
                </Alert>
                
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Товар</TableCell>
                        <TableCell>Код</TableCell>
                        {reportScope === 'all' && <TableCell>Склад</TableCell>}
                        <TableCell align="center">Текущий</TableCell>
                        <TableCell align="center">Минимальный</TableCell>
                        <TableCell align="center">Статус</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lowStockReport.map((item, index) => {
                        const status = calculateStockStatus(item.current_quantity || item.total_quantity, item.min_quantity);
                        return (
                          <TableRow 
                            key={item.id || index}
                            hover
                            onClick={() => handleViewReportDetails(item)}
                            sx={{ 
                              cursor: 'pointer',
                              backgroundColor: status.status === 'low' ? 'warning.light' : 'transparent'
                            }}
                          >
                            <TableCell>
                              <Typography fontWeight="medium">
                                {item.name}
                              </Typography>
                              {item.category_name && (
                                <Typography variant="caption" color="text.secondary">
                                  {item.category_name}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>{item.code}</TableCell>
                            {reportScope === 'all' && (
                              <TableCell>
                                {item.warehouse_name || '-'}
                              </TableCell>
                            )}
                            <TableCell align="center">
                              <Typography 
                                color={status.status === 'low' ? 'error' : 'inherit'}
                                fontWeight="bold"
                              >
                                {item.current_quantity || item.total_quantity} {item.unit}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              {item.min_quantity || 0} {item.unit}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={status.text}
                                color={status.color}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        );

      case 1: // Остатки по складам
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Остатки товаров {reportScope === 'warehouse' && selectedWarehouse?.id !== 'all' ? 
                `на ${selectedWarehouse?.name}` : 'по складам организации'}
            </Typography>
            
            {stockBalancesReport.length === 0 ? (
              <Alert severity="info">
                Нет данных об остатках для выбранной области отчета
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Склад</TableCell>
                      <TableCell>Ячейка</TableCell>
                      <TableCell>Товар</TableCell>
                      <TableCell align="right">Количество</TableCell>
                      <TableCell align="right">Средняя стоимость</TableCell>
                      <TableCell align="right">Общая стоимость</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stockBalancesReport.map((item, index) => (
                      <TableRow 
                        key={item.id || index}
                        hover
                        onClick={() => handleViewReportDetails(item)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <WarehouseIcon sx={{ mr: 1, fontSize: 16 }} />
                            <Typography variant="body2">
                              {item.warehouse_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {item.cell_code || '-'}
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {item.item_code} - {item.item_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.unit}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="medium">
                            {item.quantity}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {item.average_cost ? formatCurrency(item.average_cost) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="bold">
                            {formatCurrency(item.quantity * (item.average_cost || 0))}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        );

      case 2: // Журнал движений
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Журнал движений товаров {reportScope === 'warehouse' && selectedWarehouse?.id !== 'all' && 
                `на ${selectedWarehouse?.name}`}
            </Typography>
            
            {movementLogReport.length === 0 ? (
              <Alert severity="info">
                Нет движений товаров за выбранный период
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Дата</TableCell>
                      <TableCell>Документ</TableCell>
                      <TableCell>Тип</TableCell>
                      <TableCell>Склад</TableCell>
                      <TableCell>Товар</TableCell>
                      <TableCell align="right">Изменение</TableCell>
                      <TableCell>Пользователь</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {movementLogReport.map((item, index) => (
                      <TableRow 
                        key={item.id || index}
                        hover
                        onClick={() => handleViewReportDetails(item)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          {new Date(item.movement_date).toLocaleString('ru-RU')}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.document_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getDocumentTypeText(item.document_type)}
                            color={getDocumentTypeColor(item.document_type)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {item.warehouse_name}
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {item.item_code} - {item.item_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Ячейка: {item.cell_code || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            color={item.quantity_change > 0 ? 'success.main' : 'error.main'}
                            fontWeight="bold"
                          >
                            {item.quantity_change > 0 ? '+' : ''}{item.quantity_change}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Остаток: {item.quantity_after}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {item.user_name || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        );

      case 3: // Финансовые показатели
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Финансовые показатели {reportScope === 'warehouse' && selectedWarehouse?.id !== 'all' && 
                `по ${selectedWarehouse?.name}`}
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <AttachMoneyIcon color="primary" sx={{ mr: 1 }} />
                      <Typography color="text.secondary">
                        Общая стоимость запасов
                      </Typography>
                    </Box>
                    <Typography variant="h4">
                      {formatCurrency(financialStats.total_value)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      на складах организации
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <InventoryIcon color="secondary" sx={{ mr: 1 }} />
                      <Typography color="text.secondary">
                        Товаров на складе
                      </Typography>
                    </Box>
                    <Typography variant="h4">
                      {financialStats.total_items}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      единиц товара
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <WarningIcon color="warning" sx={{ mr: 1 }} />
                      <Typography color="text.secondary">
                        Критических остатков
                      </Typography>
                    </Box>
                    <Typography variant="h4" color="warning.main">
                      {financialStats.critical_items}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      требуют срочного пополнения
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            <Alert severity="info">
              Подробная финансовая статистика находится в разработке. Скоро здесь появятся графики и динамика изменений.
            </Alert>
          </Box>
        );

      default:
        return (
          <Alert severity="info">
            Выберите тип отчета для просмотра
          </Alert>
        );
    }
  };

  // Диалог с деталями отчета
  const ReportDetailsDialog = () => (
    <Dialog 
      open={reportOpen} 
      onClose={handleCloseReportDetails}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Детали отчета
      </DialogTitle>
      <DialogContent>
        {selectedReport && (
          <Box sx={{ mt: 2 }}>
            {tabValue === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Информация о товаре
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Код:</Typography>
                  <Typography>{selectedReport.code}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Наименование:</Typography>
                  <Typography>{selectedReport.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Текущий остаток:</Typography>
                  <Typography color="error" fontWeight="bold">
                    {selectedReport.current_quantity || selectedReport.total_quantity} {selectedReport.unit}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Минимальный остаток:</Typography>
                  <Typography>{selectedReport.min_quantity} {selectedReport.unit}</Typography>
                </Grid>
                {selectedReport.category_name && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Категория:</Typography>
                    <Typography>{selectedReport.category_name}</Typography>
                  </Grid>
                )}
              </Grid>
            )}
            
            {tabValue === 1 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Информация об остатке
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Склад:</Typography>
                  <Typography>{selectedReport.warehouse_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Ячейка:</Typography>
                  <Typography>{selectedReport.cell_code || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Товар:</Typography>
                  <Typography>{selectedReport.item_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Код:</Typography>
                  <Typography>{selectedReport.item_code}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Количество:</Typography>
                  <Typography fontWeight="bold">{selectedReport.quantity}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Стоимость:</Typography>
                  <Typography color="primary" fontWeight="bold">
                    {formatCurrency(selectedReport.quantity * (selectedReport.average_cost || 0))}
                  </Typography>
                </Grid>
              </Grid>
            )}
            
            {tabValue === 2 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Движение товара
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Дата:</Typography>
                  <Typography>
                    {new Date(selectedReport.movement_date).toLocaleString('ru-RU')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Документ:</Typography>
                  <Typography>{selectedReport.document_number}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Тип:</Typography>
                  <MuiChip
                    label={getDocumentTypeText(selectedReport.document_type)}
                    color={getDocumentTypeColor(selectedReport.document_type)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Склад:</Typography>
                  <Typography>{selectedReport.warehouse_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Изменение:</Typography>
                  <Typography 
                    color={selectedReport.quantity_change > 0 ? 'success.main' : 'error.main'}
                    fontWeight="bold"
                  >
                    {selectedReport.quantity_change > 0 ? '+' : ''}{selectedReport.quantity_change}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Остаток после:</Typography>
                  <Typography>{selectedReport.quantity_after}</Typography>
                </Grid>
              </Grid>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseReportDetails}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Отчеты и аналитика
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            sx={{ mr: 1 }}
            onClick={() => window.print()}
          >
            Печать
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportReport}
            disabled={loading}
          >
            Экспорт
          </Button>
        </Box>
      </Box>

      {/* Информация о выбранной области отчета */}
      {reportScope === 'warehouse' && selectedWarehouse?.id !== 'all' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Область отчета:</strong> Только по складу "{selectedWarehouse?.name}"
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

      {/* Фильтры отчетов */}
      <ReportFilters />

      {/* Табы отчетов */}
      <ReportTabs />

      {/* Загрузка */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
          <Box sx={{ ml: 2 }}>
            Загрузка отчетов...
          </Box>
        </Box>
      ) : (
        /* Контент отчета */
        renderReportContent()
      )}

      {/* Панель информации */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Отчет сформирован: {new Date().toLocaleString('ru-RU')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Область данных: {reportScope === 'all' ? 'Вся организация' : `Склад: ${selectedWarehouse?.name}`}
            </Typography>
            {dateFrom && dateTo && (
              <Typography variant="body2" color="text.secondary">
                Период: {new Date(dateFrom).toLocaleDateString('ru-RU')} - {new Date(dateTo).toLocaleDateString('ru-RU')}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="text"
                startIcon={<FilterListIcon />}
                onClick={() => setReportScope(reportScope === 'all' ? 'warehouse' : 'all')}
              >
                {reportScope === 'all' ? 'Фильтр по складу' : 'Показать все'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Диалог с деталями */}
      <ReportDetailsDialog />
    </Container>
  );
};

export default Reports;