import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Warehouse as WarehouseIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useWarehouse } from '../contexts/WarehouseContext';
import { dashboardAPI } from '../services/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_warehouses: 0,
    total_items: 0,
    active_items: 0,
    items_in_stock: 0,
    low_stock_items: 0,
    critical_items: 0,
    total_value: 0,
    total_quantity: 0,
    today_movements: 0,
    today_receipts: 0,
    today_writeoffs: 0
  });
  
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [recentWriteoffs, setRecentWriteoffs] = useState([]);
  const [warehouseStats, setWarehouseStats] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  
  const { selectedWarehouse, warehouses } = useWarehouse();
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedWarehouse]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const warehouseId = selectedWarehouse?.id === 'all' ? '' : selectedWarehouse?.id;
      
      // Основная статистика
      const statsResponse = await dashboardAPI.getStats('/api/dashboard/stats', {
        warehouse_id: warehouseId 
      });
      
      if (statsResponse.data.success) {
        setStats(statsResponse.data.stats);
        setRecentReceipts(statsResponse.data.recent_receipts || []);
        setRecentWriteoffs(statsResponse.data.recent_writeoffs || []);
        setWarehouseStats(statsResponse.data.warehouse_stats || []);
      }
      
      // Если выбран конкретный склад, получаем детальную статистику
      if (warehouseId && warehouseId !== 'all') {
        const warehouseStatsResponse = await dashboardAPI.get(`/api/dashboard/warehouse-stats/${warehouseId}`);
        
        if (warehouseStatsResponse.data.success) {
          setLowStockItems(warehouseStatsResponse.data.low_stock_items || []);
          setRecentMovements(warehouseStatsResponse.data.recent_movements || []);
        }
      }
      
    } catch (err) {
      console.error('❌ Ошибка загрузки данных дашборда:', err);
      setError('Ошибка загрузки данных дашборда: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'receipt': return <TrendingUpIcon color="success" />;
      case 'writeoff': return <WarningIcon color="error" />;
      case 'movement': return <ArrowForwardIcon color="info" />;
      default: return <InventoryIcon color="primary" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'receipt': return 'success';
      case 'writeoff': return 'error';
      case 'movement': return 'info';
      default: return 'primary';
    }
  };

  const getActivityText = (type) => {
    switch (type) {
      case 'receipt': return 'Поступление';
      case 'writeoff': return 'Списание';
      case 'movement': return 'Перемещение';
      default: return 'Движение';
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

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">
            📊 Панель управления
          </Typography>
          {selectedWarehouse && (
            <Box display="flex" alignItems="center" mt={1}>
              <WarehouseIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1" color="text.secondary">
                {selectedWarehouse.id === 'all' 
                  ? 'Показаны данные по всем складам организации' 
                  : `Склад: ${selectedWarehouse.name}`}
              </Typography>
            </Box>
          )}
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchDashboardData}
          disabled={loading}
        >
          Обновить
        </Button>
      </Box>

      {/* Сообщения об ошибках */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Статистика */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Стоимость запасов */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <MoneyIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                    <Box>
                      <Typography color="text.secondary">Стоимость запасов</Typography>
                      <Typography variant="h4">
                        {formatCurrency(stats.total_value)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stats.total_quantity} ед. на складе
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(stats.total_quantity / 1000 * 100, 100)} 
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            
            {/* Товаров на складе */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <InventoryIcon color="secondary" sx={{ mr: 2, fontSize: 40 }} />
                    <Box>
                      <Typography color="text.secondary">Товаров на складе</Typography>
                      <Typography variant="h4">{stats.items_in_stock}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        из {stats.total_items} позиций
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Низкие остатки */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <WarningIcon color="warning" sx={{ mr: 2, fontSize: 40 }} />
                    <Box>
                      <Typography color="text.secondary">Низкие остатки</Typography>
                      <Typography variant="h4">{stats.low_stock_items}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stats.critical_items} критических
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Активность сегодня */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <TrendingUpIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                    <Box>
                      <Typography color="text.secondary">Активность сегодня</Typography>
                      <Typography variant="h4">{stats.today_movements}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stats.today_receipts} поступлений / {stats.today_writeoffs} списаний
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Быстрые действия */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              🚀 Быстрые действия {selectedWarehouse?.id !== 'all' && `для ${selectedWarehouse?.name}`}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Button
                  component={Link}
                  to="/receipts"
                  variant="contained"
                  fullWidth
                  startIcon={<AddIcon />}
                >
                  Новое поступление
                </Button>
              </Grid>
              <Grid item xs={6} md={3}>
                <Button
                  component={Link}
                  to="/writeoffs"
                  variant="contained"
                  fullWidth
                  startIcon={<AddIcon />}
                >
                  Новое списание
                </Button>
              </Grid>
              <Grid item xs={6} md={3}>
                <Button
                  component={Link}
                  to="/movements"
                  variant="contained"
                  fullWidth
                  startIcon={<AddIcon />}
                >
                  Новое перемещение
                </Button>
              </Grid>
              <Grid item xs={6} md={3}>
                <Button
                  component={Link}
                  to="/nomenclature"
                  variant="contained"
                  fullWidth
                  startIcon={<AddIcon />}
                >
                  Новый товар
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Если выбран конкретный склад, показываем детальную информацию */}
          {selectedWarehouse?.id !== 'all' && (
            <>
              {/* Товары с низкими остатками */}
              {lowStockItems.length > 0 && (
                <Paper sx={{ p: 3, mb: 4 }}>
                  <Typography variant="h6" gutterBottom color="warning.main">
                    ⚠️ Товары с низкими остатками
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Товар</TableCell>
                          <TableCell>Код</TableCell>
                          <TableCell align="right">Текущее</TableCell>
                          <TableCell align="right">Минимальное</TableCell>
                          <TableCell>Статус</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lowStockItems.map((item) => (
                          <TableRow key={item.id} hover>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.code}</TableCell>
                            <TableCell align="right">
                              <Typography color="error">
                                {item.current_quantity} {item.unit}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{item.min_quantity} {item.unit}</TableCell>
                            <TableCell>
                              <Chip
                                label="Требует пополнения"
                                color="warning"
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              {/* Последние движения */}
              <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  📝 Последние движения
                </Typography>
                {recentMovements.length === 0 ? (
                  <Alert severity="info">Нет движений за выбранный период</Alert>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Дата</TableCell>
                          <TableCell>Тип</TableCell>
                          <TableCell>Товар</TableCell>
                          <TableCell>Количество</TableCell>
                          <TableCell>Ячейка</TableCell>
                          <TableCell>Пользователь</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentMovements.map((movement) => (
                          <TableRow key={movement.id} hover>
                            <TableCell>
                              {new Date(movement.movement_date).toLocaleString('ru-RU')}
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={getActivityIcon(movement.document_type)}
                                label={getActivityText(movement.document_type)}
                                color={getActivityColor(movement.document_type)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{movement.item_name}</TableCell>
                            <TableCell>
                              {movement.quantity_change > 0 ? '+' : ''}
                              {movement.quantity_change}
                            </TableCell>
                            <TableCell>{movement.cell_code || '-'}</TableCell>
                            <TableCell>{movement.user_name || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </>
          )}

          {/* Статистика по складам (если выбраны все склады) */}
          {selectedWarehouse?.id === 'all' && warehouseStats.length > 0 && (
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                📦 Распределение по складам
              </Typography>
              <Grid container spacing={2}>
                {warehouseStats.map((warehouse) => (
                  <Grid item xs={12} md={4} key={warehouse.id}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <WarehouseIcon sx={{ mr: 1 }} />
                          <Typography variant="h6">{warehouse.name}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Код: {warehouse.code}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          Товаров: {warehouse.items_count || 0}
                        </Typography>
                        <Typography variant="body1">
                          Количество: {warehouse.total_quantity || 0} ед.
                        </Typography>
                        <Typography variant="body1">
                          Стоимость: {formatCurrency(warehouse.total_value || 0)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Ячеек: {warehouse.cells_count || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Последние документы */}
          <Grid container spacing={3}>
            {/* Последние поступления */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📥 Последние поступления
                </Typography>
                {recentReceipts.length === 0 ? (
                  <Alert severity="info">Нет поступлений</Alert>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Номер</TableCell>
                          <TableCell>Дата</TableCell>
                          <TableCell>Поставщик</TableCell>
                          <TableCell align="right">Сумма</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentReceipts.map((receipt) => (
                          <TableRow key={receipt.id} hover>
                            <TableCell>{receipt.document_number}</TableCell>
                            <TableCell>
                              {new Date(receipt.receipt_date).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell>{receipt.supplier_name}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(receipt.total_amount || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>

            {/* Последние списания */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📤 Последние списания
                </Typography>
                {recentWriteoffs.length === 0 ? (
                  <Alert severity="info">Нет списаний</Alert>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Номер</TableCell>
                          <TableCell>Дата</TableCell>
                          <TableCell>Причина</TableCell>
                          <TableCell align="right">Сумма</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentWriteoffs.map((writeoff) => (
                          <TableRow key={writeoff.id} hover>
                            <TableCell>{writeoff.document_number}</TableCell>
                            <TableCell>
                              {new Date(writeoff.writeoff_date).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell>{writeoff.reason}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(writeoff.total_amount || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default Dashboard;
