import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { warehousesAPI } from '../services/api';

const WarehouseContext = createContext({});

export const useWarehouse = () => useContext(WarehouseContext);

export const WarehouseProvider = ({ children }) => {
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const filterBySelectedWarehouse = (data) => {
    if (!selectedWarehouse || selectedWarehouse.id === 'all') {
      return data;
    }
    
    if (data.length > 0 && data[0].warehouse_id !== undefined) {
      return data.filter(item => item.warehouse_id === selectedWarehouse.id);
    }
    
    if (data.length > 0 && data[0].warehouse !== undefined) {
      return data.filter(item => item.warehouse_id === selectedWarehouse.id || 
                                item.warehouse === selectedWarehouse.name);
    }
    
    return data;
  };

  const fetchWarehouses = async () => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    try {
      console.log('📦 Загрузка складов через API...');
      
      const response = await warehousesAPI.getAll();
      
      if (response.data.success && mountedRef.current) {
        console.log('✅ Склады загружены:', response.data.warehouses.length);
        
        // Добавляем опцию "Все склады"
        const allWarehousesOption = {
          id: 'all',
          name: 'Все склады',
          code: 'ALL',
          address: 'Все склады компании'
        };
        
        const warehousesWithAll = [allWarehousesOption, ...response.data.warehouses];
        setWarehouses(warehousesWithAll);
        
        // Восстанавливаем выбранный склад
        const savedWarehouseId = localStorage.getItem('selectedWarehouseId');
        if (savedWarehouseId) {
          const savedWarehouse = warehousesWithAll.find(w => 
            w.id === parseInt(savedWarehouseId) || w.id === savedWarehouseId
          );
          if (savedWarehouse) {
            setSelectedWarehouse(savedWarehouse);
          } else if (warehousesWithAll.length > 0) {
            setSelectedWarehouse(warehousesWithAll[0]);
          }
        } else if (warehousesWithAll.length > 0) {
          setSelectedWarehouse(warehousesWithAll[0]);
        }
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки складов:', err);
      if (err.response?.status === 401) {
        console.log('🔒 Неавторизованный запрос, токен недействителен');
        localStorage.removeItem('token');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Загружаем склады при монтировании
  useEffect(() => {
    fetchWarehouses();
  }, []);

  const selectWarehouse = (warehouse) => {
    if (mountedRef.current) {
      setSelectedWarehouse(warehouse);
      if (warehouse) {
        localStorage.setItem('selectedWarehouseId', warehouse.id);
      } else {
        localStorage.removeItem('selectedWarehouseId');
      }
    }
  };

  const value = {
    selectedWarehouse,
    setSelectedWarehouse: selectWarehouse,
    warehouses,
    loading,
    fetchWarehouses,
    filterBySelectedWarehouse
  };

  return (
    <WarehouseContext.Provider value={value}>
      {children}
    </WarehouseContext.Provider>
  );
};