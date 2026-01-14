import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  IconButton,
  Button,
  useMediaQuery,
  useTheme,
  alpha
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Warehouse as WarehouseIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon,
  ExitToApp as WriteoffIcon,
  CompareArrows as MovementIcon,
  Storage as StorageIcon,
  Assessment as ReportIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  People as PeopleIcon,
  Telegram as TelegramIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 280;

const menuItems = [
  { text: 'Дашборд', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Склады', icon: <WarehouseIcon />, path: '/warehouses' },
  { text: 'Номенклатура', icon: <InventoryIcon />, path: '/nomenclature' },
  { text: 'Ячейки хранения', icon: <StorageIcon />, path: '/storage-cells' },
  { text: 'Поступления', icon: <ReceiptIcon />, path: '/receipts' },
  { text: 'Списания', icon: <WriteoffIcon />, path: '/writeoffs' },
  { text: 'Перемещения', icon: <MovementIcon />, path: '/movements' },
  { text: 'Отчеты', icon: <ReportIcon />, path: '/reports' },
  { text: 'Пользователи', icon: <PeopleIcon />, path: '/users' },
  { text: 'Профиль', icon: <PersonIcon />, path: '/profile' }, // Добавлено
];

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, company, logout } = useAuth();

  // Отладочная информация
  console.log('🔧 Layout данные:', { 
    user: user ? `${user.email} (${user.role})` : 'нет', 
    company: company ? company.name : 'нет',
    hasChildren: !!children,
    location: location.pathname
  });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    console.log('🚪 Выход из системы');
    logout();
    handleMenuClose();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    console.log('📍 Навигация на:', path);
    navigate(path);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const handleTelegramSupport = () => {
    const telegramLink = company?.telegram_support_link || 'https://t.me/supwarehousebot';
    window.open(telegramLink, '_blank');
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Заголовок боковой панели */}
      <Toolbar sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
          <WarehouseIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
          <Box>
            <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: 'primary.main' }}>
              Мой склад
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {company?.code || 'Ваша компания'}
            </Typography>
          </Box>
        </Box>
      </Toolbar>

      {/* Информация о компании - всегда показываем */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Компания:
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {company?.name || company?.company_name || company?.code || 'Не указана'}
            {company?.code && <span style={{ color: '#666', marginLeft: '4px' }}>({company.code})</span>}
          </Typography>
        </Box>

      {/* Информация о пользователе - всегда показываем */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Пользователь:
        </Typography>
        <Box display="flex" alignItems="center">
          <Avatar sx={{ 
            mr: 1, 
            width: 32, 
            height: 32, 
            bgcolor: 'primary.main',
            fontSize: '14px'
          }}>
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="bold">
              {user?.full_name || user?.email || 'Пользователь'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.role === 'admin' ? 'Администратор' : 
               user?.role === 'manager' ? 'Менеджер' : 
               user?.role === 'employee' ? 'Сотрудник' : 'Роль не указана'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Навигация */}
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {menuItems.map((item) => {
          // Для не-администраторов скрываем пункт "Пользователи"
          if (item.text === 'Пользователи' && user?.role !== 'admin') {
            return null;
          }
          
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                    },
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.primary.main,
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? 'primary.main' : 'text.secondary',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ 
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.95rem'
                  }}
                />
                {isActive && (
                  <Box
                    sx={{
                      width: 4,
                      height: 24,
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                      ml: 1,
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Кнопка техподдержки */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<TelegramIcon />}
          onClick={handleTelegramSupport}
          color="primary"
        >
          Техподдержка в Telegram
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Верхняя панель */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600, flexGrow: 1 }}>
            📦 Панель управления
          </Typography>

          {/* Профиль пользователя */}
          <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.main',
              }}
            >
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Боковая панель */}
      <Box
        component="nav"
        sx={{
          width: { sm: drawerWidth },
          flexShrink: { sm: 0 },
        }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                border: 'none',
                boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                border: 'none',
                boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      {/* Основной контент */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          bgcolor: 'background.default',
          minHeight: '100vh',
          mt: '64px' // Отступ для фиксированного AppBar
        }}
      >
        {/* Отладочная информация если нет children */}
        {!children ? (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            bgcolor: 'white',
            borderRadius: 2,
            boxShadow: 1
          }}>
            <Typography variant="h6" color="error" gutterBottom>
              ⚠️ Нет контента для отображения
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Layout не получил children. Проверьте структуру роутинга.
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 2 }}
              onClick={() => navigate('/test')}
            >
              Перейти на тестовую страницу
            </Button>
          </Box>
        ) : (
          // Основной контент страницы
          <Box sx={{ 
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            minHeight: 'calc(100vh - 100px)',
            p: { xs: 2, sm: 3 }
          }}>
            {children}
          </Box>
        )}
      </Box>

      {/* Меню пользователя */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            width: 200,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          },
        }}
      >
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Выйти</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default Layout;