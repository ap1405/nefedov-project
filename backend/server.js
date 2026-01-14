const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключение к базе данных
const pool = new Pool({
    user: process.env.DB_USER || 'admin',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'warehouse_db',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

// Проверка подключения к БД
pool.connect()
    .then(client => {
        console.log('✅ Подключение к PostgreSQL установлено');
        client.release();
    })
    .catch(err => {
        console.error('❌ Ошибка подключения к PostgreSQL:', err);
    });

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'warehouse_secret_key_2024', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
};

// Middleware для проверки прав администратора компании
const checkCompanyAdmin = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const companyId = req.user.companyId;
        
        const result = await pool.query(
            'SELECT role FROM users WHERE id = $1 AND company_id = $2',
            [userId, companyId]
        );
        
        if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Требуются права администратора компании' });
        }
        
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка проверки прав доступа' });
    }
};

// Функция для проверки пароля с fallback
async function checkPassword(inputPassword, storedHash) {
    try {
        // Пробуем bcrypt
        const isValid = await bcrypt.compare(inputPassword, storedHash);
        console.log('🔐 bcrypt сравнение:', isValid ? '✅ Совпадает' : '❌ Не совпадает');
        return isValid;
    } catch (error) {
        console.warn('⚠️  bcrypt ошибка, используем прямое сравнение:', error.message);
        
        // Для отладки: если пароль "admin123" и хэш совпадает с известным
        const knownHash = '$2a$10$N9qo8uLOickgx2ZMRZoMye.MH6J4bH3Bx7KjK6Z6BvR7V5vQ5Q5W2';
        if (inputPassword === 'admin123' && storedHash === knownHash) {
            console.log('✅ Прямое сравнение: пароль совпадает');
            return true;
        }
        
        return false;
    }
}

// API: Регистрация компании
app.post('/api/auth/register-company', async (req, res) => {
    try {
        const { company_name, email, password, phone, address } = req.body;
        
        console.log('📝 Регистрация компании:', { company_name, email });
        
        // Проверяем, существует ли компания с таким email
        const checkCompany = await pool.query(
            'SELECT id FROM companies WHERE email = $1',
            [email]
        );
        
        if (checkCompany.rows.length > 0) {
            console.log('❌ Компания уже существует');
            return res.status(400).json({ error: 'Компания с таким email уже существует' });
        }
        
        // Хэшируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Генерируем уникальный код компании
        const companyCode = 'COMP' + Date.now().toString().slice(-6);
        
        // Создаем компанию
        const result = await pool.query(
            `INSERT INTO companies 
             (company_code, company_name, email, password_hash, phone, address)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, company_code, company_name, email, phone, address`,
            [companyCode, company_name, email, hashedPassword, phone, address]
        );
        
        const company = result.rows[0];
        
        // Создаем администратора компании
        await pool.query(
            `INSERT INTO users 
             (company_id, email, password_hash, full_name, role, phone)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [company.id, email, hashedPassword, 'Администратор', 'admin', phone]
        );
        
        console.log('✅ Компания зарегистрирована:', company.email);
        
        res.status(201).json({
            success: true,
            message: 'Компания успешно зарегистрирована',
            company: {
                id: company.id,
                code: company.company_code,
                name: company.company_name,
                email: company.email
            }
        });
    } catch (error) {
        console.error('💥 Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка регистрации компании: ' + error.message });
    }
});

// API: Вход для компании
app.post('/api/auth/login-company', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Попытка входа для компании:', email);
        
        // Находим компанию
        const result = await pool.query(
            'SELECT id, company_code, company_name, email, password_hash, is_active FROM companies WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            console.log('❌ Компания не найдена');
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        const company = result.rows[0];
        
        if (!company.is_active) {
            console.log('❌ Компания заблокирована');
            return res.status(403).json({ error: 'Компания заблокирована' });
        }
        
        // Проверяем пароль с нашей функцией
        const validPassword = await checkPassword(password, company.password_hash);
        
        if (!validPassword) {
            console.log('❌ Неверный пароль');
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        // Находим пользователя-администратора компании
        const userResult = await pool.query(
            'SELECT id, full_name, role FROM users WHERE company_id = $1 AND email = $2',
            [company.id, email]
        );
        
        const user = userResult.rows[0];
        
        // Обновляем время последнего входа
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );
        
        // Создаем JWT токен
        const token = jwt.sign(
            {
                userId: user.id,
                companyId: company.id,
                companyCode: company.company_code,
                role: user.role,
                email: email
            },
            process.env.JWT_SECRET || 'warehouse_secret_key_2024',
            { expiresIn: '24h' }
        );
        
        console.log('✅ Успешный вход для:', email);
        
        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                email: email,
                full_name: user.full_name,
                role: user.role,
                company: {
                    id: company.id,
                    code: company.company_code,
                    name: company.company_name
                }
            }
        });
    } catch (error) {
        console.error('💥 Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка входа: ' + error.message });
    }
});

// API: Вход для пользователя
app.post('/api/auth/login-user', async (req, res) => {
    try {
        const { email, password, company_code } = req.body;
        
        console.log('👤 Попытка входа пользователя:', { email, company_code });
        
        // Находим компанию по коду
        const companyResult = await pool.query(
            'SELECT id, company_code, company_name FROM companies WHERE company_code = $1 AND is_active = true',
            [company_code]
        );
        
        if (companyResult.rows.length === 0) {
            console.log('❌ Компания не найдена или заблокирована');
            return res.status(401).json({ error: 'Компания не найдена или заблокирована' });
        }
        
        const company = companyResult.rows[0];
        
        // Находим пользователя в компании
        const userResult = await pool.query(
            `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.is_active
             FROM users u
             WHERE u.company_id = $1 AND u.email = $2`,
            [company.id, email]
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ Пользователь не найден');
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        
        const user = userResult.rows[0];
        
        if (!user.is_active) {
            console.log('❌ Пользователь заблокирован');
            return res.status(403).json({ error: 'Пользователь заблокирован' });
        }
        
        // Проверяем пароль
        const validPassword = await checkPassword(password, user.password_hash);
        if (!validPassword) {
            console.log('❌ Неверный пароль');
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        // Обновляем время последнего входа
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );
        
        // Создаем JWT токен
        const token = jwt.sign(
            {
                userId: user.id,
                companyId: company.id,
                companyCode: company.company_code,
                role: user.role,
                email: email
            },
            process.env.JWT_SECRET || 'warehouse_secret_key_2024',
            { expiresIn: '8h' }
        );
        
        console.log('✅ Успешный вход пользователя:', email);
        
        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                company: {
                    id: company.id,
                    code: company.company_code,
                    name: company.company_name
                }
            }
        });
    } catch (error) {
        console.error('💥 Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка входа: ' + error.message });
    }
});

// API: Диагностика базы данных (для отладки)
app.get('/api/debug/db-info', async (req, res) => {
    try {
        const companies = await pool.query('SELECT id, company_code, email FROM companies');
        const users = await pool.query('SELECT id, email, role, company_id FROM users');
        
        res.json({
            success: true,
            companies: companies.rows,
            users: users.rows,
            counts: {
                companies: companies.rows.length,
                users: users.rows.length
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Проверка пароля (для отладки)
app.post('/api/debug/check-auth', async (req, res) => {
    try {
        const { email, password, company_code } = req.body;
        
        let result = {};
        
        // Проверяем компанию
        const companyResult = await pool.query(
            'SELECT * FROM companies WHERE email = $1 OR company_code = $2',
            [email, company_code]
        );
        
        if (companyResult.rows.length > 0) {
            const company = companyResult.rows[0];
            const validPassword = await checkPassword(password, company.password_hash);
            
            result.company = {
                exists: true,
                email: company.email,
                company_code: company.company_code,
                password_valid: validPassword
            };
        } else {
            result.company = { exists: false };
        }
        
        // Проверяем пользователя
        if (company_code) {
            const userResult = await pool.query(
                `SELECT u.* FROM users u
                 JOIN companies c ON u.company_id = c.id
                 WHERE u.email = $1 AND c.company_code = $2`,
                [email, company_code]
            );
            
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                const validPassword = await checkPassword(password, user.password_hash);
                
                result.user = {
                    exists: true,
                    email: user.email,
                    role: user.role,
                    password_valid: validPassword
                };
            } else {
                result.user = { exists: false };
            }
        }
        
        res.json({
            success: true,
            ...result,
            test_hash_admin123: await bcrypt.hash('admin123', 10)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Создание пользователя
app.post('/api/users', authenticateToken, checkCompanyAdmin, async (req, res) => {
    try {
        const { email, password, full_name, role, phone } = req.body;
        const companyId = req.user.companyId;
        
        console.log('👥 Создание пользователя:', { email, companyId });
        
        // Проверяем, существует ли пользователь с таким email в компании
        const checkUser = await pool.query(
            'SELECT id FROM users WHERE company_id = $1 AND email = $2',
            [companyId, email]
        );
        
        if (checkUser.rows.length > 0) {
            console.log('❌ Пользователь уже существует');
            return res.status(400).json({ error: 'Пользователь с таким email уже существует в компании' });
        }
        
        // Хэшируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Создаем пользователя
        const result = await pool.query(
            `INSERT INTO users 
             (company_id, email, password_hash, full_name, role, phone)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, email, full_name, role, phone, is_active, created_at`,
            [companyId, email, hashedPassword, full_name, role, phone]
        );
        
        const newUser = result.rows[0];
        
        console.log('✅ Пользователь создан:', newUser.email);
        
        res.status(201).json({
            success: true,
            message: 'Пользователь успешно создан',
            user: newUser
        });
    } catch (error) {
        console.error('💥 Ошибка создания пользователя:', error);
        res.status(500).json({ error: 'Ошибка создания пользователя: ' + error.message });
    }
});

// API: Получение складов компании
app.get('/api/warehouses', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const userRole = req.user.role;
        
        let warehouses;
        
        if (userRole === 'admin') {
            // Администратор видит все склады компании
            const result = await pool.query(
                `SELECT w.*, 
                 (SELECT COUNT(*) FROM storage_cells sc WHERE sc.warehouse_id = w.id) as cells_count,
                 (SELECT COUNT(*) FROM stock_balances sb WHERE sb.warehouse_id = w.id) as items_count
                 FROM warehouses w
                 WHERE w.company_id = $1
                 ORDER BY w.created_at DESC`,
                [companyId]
            );
            warehouses = result.rows;
        } else {
            // Менеджер и сотрудник видят только склады, к которым имеют доступ
            const result = await pool.query(
                `SELECT w.*, uwa.can_view, uwa.can_edit, uwa.can_delete,
                 (SELECT COUNT(*) FROM storage_cells sc WHERE sc.warehouse_id = w.id) as cells_count,
                 (SELECT COUNT(*) FROM stock_balances sb WHERE sb.warehouse_id = w.id) as items_count
                 FROM warehouses w
                 JOIN user_warehouse_access uwa ON w.id = uwa.warehouse_id
                 WHERE w.company_id = $1 AND uwa.user_id = $2 AND uwa.can_view = true
                 ORDER BY w.created_at DESC`,
                [companyId, userId]
            );
            warehouses = result.rows;
        }
        
        res.json({
            success: true,
            warehouses: warehouses
        });
    } catch (error) {
        console.error('💥 Ошибка получения складов:', error);
        res.status(500).json({ error: 'Ошибка получения складов' });
    }
});

// API: Получение складов компании
app.get('/api/warehouses', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    console.log('📦 Запрос складов для:', { companyId, userId, role: userRole });
    
    let warehouses;
    
    if (userRole === 'admin') {
      // Администратор видит все склады компании
      const result = await pool.query(
        `SELECT w.*, 
         (SELECT COUNT(*) FROM storage_cells sc WHERE sc.warehouse_id = w.id) as cells_count,
         (SELECT COUNT(*) FROM stock_balances sb WHERE sb.warehouse_id = w.id) as items_count
         FROM warehouses w
         WHERE w.company_id = $1
         ORDER BY w.created_at DESC`,
        [companyId]
      );
      warehouses = result.rows;
    } else {
      // Менеджер и сотрудник видят только склады, к которым имеют доступ
      const result = await pool.query(
        `SELECT w.*, uwa.can_view, uwa.can_edit, uwa.can_delete,
         (SELECT COUNT(*) FROM storage_cells sc WHERE sc.warehouse_id = w.id) as cells_count,
         (SELECT COUNT(*) FROM stock_balances sb WHERE sb.warehouse_id = w.id) as items_count
         FROM warehouses w
         JOIN user_warehouse_access uwa ON w.id = uwa.warehouse_id
         WHERE w.company_id = $1 AND uwa.user_id = $2 AND uwa.can_view = true
         ORDER BY w.created_at DESC`,
        [companyId, userId]
      );
      warehouses = result.rows;
    }
    
    console.log('✅ Найдено складов:', warehouses.length);
    
    res.json({
      success: true,
      warehouses: warehouses
    });
  } catch (error) {
    console.error('💥 Ошибка получения складов:', error);
    res.status(500).json({ error: 'Ошибка получения складов' });
  }
});

// API: Создание пользователя
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const { email, password, full_name, role, phone } = req.body;
    const companyId = req.user.companyId;
    const currentUserId = req.user.userId;
    
    console.log('👥 Создание пользователя:', { email, companyId, currentUserId });
    
    // Проверяем права администратора
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1 AND company_id = $2',
      [currentUserId, companyId]
    );
    
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      console.log('❌ Нет прав администратора');
      return res.status(403).json({ error: 'Требуются права администратора компании' });
    }
    
    // Проверяем существование пользователя
    const checkResult = await pool.query(
      'SELECT id FROM users WHERE company_id = $1 AND email = $2',
      [companyId, email]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('❌ Пользователь уже существует');
      return res.status(400).json({ error: 'Пользователь с таким email уже существует в компании' });
    }
    
    // Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создаем пользователя
    const result = await pool.query(
      `INSERT INTO users 
       (company_id, email, password_hash, full_name, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, phone, is_active, created_at`,
      [companyId, email, hashedPassword, full_name, role, phone]
    );
    
    const newUser = result.rows[0];
    
    console.log('✅ Пользователь создан:', newUser.email);
    
    res.status(201).json({
      success: true,
      user: newUser
    });
  } catch (error) {
    console.error('💥 Ошибка создания пользователя:', error);
    res.status(500).json({ error: 'Ошибка создания пользователя' });
  }
});

// API: Получение пользователей компании
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const currentUserId = req.user.userId;
    
    console.log('👥 Получение пользователей компании:', { companyId, currentUserId });
    
    // Проверяем права администратора
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1 AND company_id = $2',
      [currentUserId, companyId]
    );
    
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      console.log('❌ Нет прав администратора для просмотра пользователей');
      return res.status(403).json({ error: 'Требуются права администратора' });
    }
    
    const result = await pool.query(
      `SELECT id, email, full_name, role, phone, is_active, 
       last_login, created_at, updated_at
       FROM users 
       WHERE company_id = $1
       ORDER BY created_at DESC`,
      [companyId]
    );
    
    console.log('✅ Найдено пользователей:', result.rows.length);
    
    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('💥 Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
});

// API: Получение складов компании
app.get('/api/warehouses', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    console.log('📦 Запрос складов для:', { companyId, userId, role: userRole });
    
    let warehouses;
    
    if (userRole === 'admin') {
      // Администратор видит все склады компании
      const result = await pool.query(
        `SELECT w.*, 
         (SELECT COUNT(*) FROM storage_cells sc WHERE sc.warehouse_id = w.id) as cells_count,
         (SELECT COUNT(*) FROM stock_balances sb WHERE sb.warehouse_id = w.id) as items_count
         FROM warehouses w
         WHERE w.company_id = $1
         ORDER BY w.created_at DESC`,
        [companyId]
      );
      warehouses = result.rows;
    } else {
      // Менеджер и сотрудник видят только склады, к которым имеют доступ
      const result = await pool.query(
        `SELECT w.*, uwa.can_view, uwa.can_edit, uwa.can_delete,
         (SELECT COUNT(*) FROM storage_cells sc WHERE sc.warehouse_id = w.id) as cells_count,
         (SELECT COUNT(*) FROM stock_balances sb WHERE sb.warehouse_id = w.id) as items_count
         FROM warehouses w
         JOIN user_warehouse_access uwa ON w.id = uwa.warehouse_id
         WHERE w.company_id = $1 AND uwa.user_id = $2 AND uwa.can_view = true
         ORDER BY w.created_at DESC`,
        [companyId, userId]
      );
      warehouses = result.rows;
    }
    
    console.log('✅ Найдено складов:', warehouses.length);
    
    res.json({
      success: true,
      warehouses: warehouses
    });
  } catch (error) {
    console.error('💥 Ошибка получения складов:', error);
    res.status(500).json({ error: 'Ошибка получения складов' });
  }
});

// API: Создание склада
app.post('/api/warehouses', authenticateToken, checkCompanyAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { name, address, description, contact_person, contact_phone } = req.body;
    
    console.log('🏗️ Создание склада:', { companyId, name });
    
    // Генерируем код склада
    const warehouseCode = 'WH' + Date.now().toString().slice(-6);
    
    // Создаем склад
    const result = await pool.query(
      `INSERT INTO warehouses 
       (company_id, code, name, address, description, contact_person, contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, code, name, address, description, contact_person, contact_phone, status, created_at`,
      [companyId, warehouseCode, name, address, description, contact_person, contact_phone]
    );
    
    const newWarehouse = result.rows[0];
    
    console.log('✅ Склад создан:', newWarehouse.code);
    
    res.status(201).json({
      success: true,
      warehouse: newWarehouse
    });
  } catch (error) {
    console.error('💥 Ошибка создания склада:', error);
    res.status(500).json({ error: 'Ошибка создания склада' });
  }
});

// Удаление склада
app.delete('/api/warehouses/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const warehouseId = req.params.id;

    // Проверяем, что склад принадлежит компании
    const checkResult = await pool.query(
      'SELECT id FROM warehouses WHERE id = $1 AND company_id = $2',
      [warehouseId, companyId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Склад не найден' 
      });
    }

    // Проверяем, нет ли связанных данных (ячеек хранения, остатков, документов)
    const hasStorageCells = await pool.query(
      'SELECT COUNT(*) FROM storage_cells WHERE warehouse_id = $1',
      [warehouseId]
    );

    const hasStockBalances = await pool.query(
      'SELECT COUNT(*) FROM stock_balances WHERE warehouse_id = $1',
      [warehouseId]
    );

    const hasReceipts = await pool.query(
      'SELECT COUNT(*) FROM receipts WHERE warehouse_id = $1',
      [warehouseId]
    );

    const hasWriteoffs = await pool.query(
      'SELECT COUNT(*) FROM writeoffs WHERE warehouse_id = $1',
      [warehouseId]
    );

    const hasMovementsFrom = await pool.query(
      'SELECT COUNT(*) FROM movements WHERE warehouse_from_id = $1',
      [warehouseId]
    );

    const hasMovementsTo = await pool.query(
      'SELECT COUNT(*) FROM movements WHERE warehouse_to_id = $1',
      [warehouseId]
    );

    // Если есть связанные данные, запрещаем удаление
    if (
      parseInt(hasStorageCells.rows[0].count) > 0 ||
      parseInt(hasStockBalances.rows[0].count) > 0 ||
      parseInt(hasReceipts.rows[0].count) > 0 ||
      parseInt(hasWriteoffs.rows[0].count) > 0 ||
      parseInt(hasMovementsFrom.rows[0].count) > 0 ||
      parseInt(hasMovementsTo.rows[0].count) > 0
    ) {
      return res.status(400).json({ 
        success: false, 
        error: 'Невозможно удалить склад, так как с ним связаны другие данные. ' +
               'Сначала удалите все связанные ячейки, остатки и документы.'
      });
    }

    // Если нет связанных данных, удаляем склад
    await pool.query('DELETE FROM warehouses WHERE id = $1', [warehouseId]);

    res.json({ 
      success: true, 
      message: 'Склад успешно удален' 
    });
  } catch (error) {
    console.error('Ошибка удаления склада:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Создание пользователя
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const { email, password, full_name, role, phone } = req.body;
    const companyId = req.user.companyId;
    const currentUserId = req.user.userId;
    
    console.log('👥 Создание пользователя:', { email, companyId, currentUserId });
    
    // Проверяем права администратора
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1 AND company_id = $2',
      [currentUserId, companyId]
    );
    
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      console.log('❌ Нет прав администратора');
      return res.status(403).json({ error: 'Требуются права администратора компании' });
    }
    
    // Проверяем существование пользователя
    const checkResult = await pool.query(
      'SELECT id FROM users WHERE company_id = $1 AND email = $2',
      [companyId, email]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('❌ Пользователь уже существует');
      return res.status(400).json({ error: 'Пользователь с таким email уже существует в компании' });
    }
    
    // Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создаем пользователя
    const result = await pool.query(
      `INSERT INTO users 
       (company_id, email, password_hash, full_name, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, phone, is_active, created_at`,
      [companyId, email, hashedPassword, full_name, role, phone]
    );
    
    const newUser = result.rows[0];
    
    console.log('✅ Пользователь создан:', newUser.email);
    
    res.status(201).json({
      success: true,
      user: newUser
    });
  } catch (error) {
    console.error('💥 Ошибка создания пользователя:', error);
    res.status(500).json({ error: 'Ошибка создания пользователя' });
  }
});

// API: Получение пользователей компании
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const currentUserId = req.user.userId;
    
    console.log('👥 Получение пользователей компании:', { companyId, currentUserId });
    
    // Проверяем права администратора
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1 AND company_id = $2',
      [currentUserId, companyId]
    );
    
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      console.log('❌ Нет прав администратора для просмотра пользователей');
      return res.status(403).json({ error: 'Требуются права администратора' });
    }
    
    const result = await pool.query(
      `SELECT id, email, full_name, role, phone, is_active, 
       last_login, created_at, updated_at
       FROM users 
       WHERE company_id = $1
       ORDER BY created_at DESC`,
      [companyId]
    );
    
    console.log('✅ Найдено пользователей:', result.rows.length);
    
    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('💥 Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
});
// API: Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'OK',
            message: 'Warehouse API работает',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Проблемы с подключением к базе данных',
            error: error.message
        });
    }
});

// API: Категории для номенклатуры
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const result = await pool.query(
      `SELECT * FROM categories 
       WHERE company_id = $1 
       ORDER BY parent_id NULLS FIRST, sort_order, name`,
      [companyId]
    );
    
    res.json({
      success: true,
      categories: result.rows
    });
  } catch (error) {
    console.error('💥 Ошибка получения категорий:', error);
    res.status(500).json({ error: 'Ошибка получения категорий' });
  }
});
// API: Создание категории
app.post('/api/categories', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { code, name, description, parent_id, image_url } = req.body;
    
    console.log('📝 Создание категории:', { code, name, companyId });

    // Проверяем уникальность кода
    const checkResult = await pool.query(
      'SELECT id FROM categories WHERE company_id = $1 AND code = $2',
      [companyId, code]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('❌ Категория с таким кодом уже существует');
      return res.status(400).json({ error: 'Категория с таким кодом уже существует' });
    }

    const result = await pool.query(
      `INSERT INTO categories 
       (company_id, code, name, description, parent_id, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [companyId, code, name, description || '', parent_id || null, image_url || '']
    );

    console.log('✅ Категория создана:', result.rows[0].code);
    
    res.status(201).json({
      success: true,
      message: 'Категория успешно создана',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('💥 Ошибка создания категории:', error);
    res.status(500).json({ error: 'Ошибка создания категории: ' + error.message });
  }
});

// API: Обновление категории
app.put('/api/categories/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { name, description, parent_id, image_url } = req.body;
    
    // Проверяем существование категории
    const checkResult = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    const result = await pool.query(
      `UPDATE categories SET
        name = $1, description = $2, parent_id = $3, image_url = $4
       WHERE id = $5 AND company_id = $6
       RETURNING *`,
      [name, description || '', parent_id || null, image_url || '', id, companyId]
    );

    res.json({
      success: true,
      message: 'Категория успешно обновлена',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('💥 Ошибка обновления категории:', error);
    res.status(500).json({ error: 'Ошибка обновления категории: ' + error.message });
  }
});

// API: Удаление категории
app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    
    // Проверяем, есть ли товары в этой категории
    const itemsCheck = await pool.query(
      'SELECT id FROM nomenclature WHERE category_id = $1 AND company_id = $2 LIMIT 1',
      [id, companyId]
    );
    
    if (itemsCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Нельзя удалить категорию, в которой есть товары' 
      });
    }
    
    // Проверяем, есть ли подкатегории
    const childrenCheck = await pool.query(
      'SELECT id FROM categories WHERE parent_id = $1 AND company_id = $2 LIMIT 1',
      [id, companyId]
    );
    
    if (childrenCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Нельзя удалить категорию, у которой есть подкатегории' 
      });
    }

    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    res.json({
      success: true,
      message: 'Категория успешно удалена'
    });
  } catch (error) {
    console.error('💥 Ошибка удаления категории:', error);
    res.status(500).json({ error: 'Ошибка удаления категории: ' + error.message });
  }
});

// API: Номенклатура
app.get('/api/nomenclature', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search, category, type } = req.query;
    
    let query = `
      SELECT n.*, c.name as category_name,
      COALESCE((
        SELECT SUM(sb.quantity) 
        FROM stock_balances sb 
        WHERE sb.nomenclature_id = n.id
      ), 0) as total_stock
      FROM nomenclature n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.company_id = $1
    `;
    
    const params = [companyId];
    let paramCount = 2;
    
    if (search) {
      query += ` AND (n.name ILIKE $${paramCount} OR n.code ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    if (category) {
      query += ` AND n.category_id = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    if (type) {
      query += ` AND n.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }
    
    query += ' ORDER BY n.created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      items: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('💥 Ошибка получения номенклатуры:', error);
    res.status(500).json({ error: 'Ошибка получения номенклатуры' });
  }
});

app.get('/api/nomenclature/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT n.*, c.name as category_name
       FROM nomenclature n
       LEFT JOIN categories c ON n.category_id = c.id
       WHERE n.id = $1 AND n.company_id = $2`,
      [id, companyId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json({
      success: true,
      item: result.rows[0]
    });
  } catch (error) {
    console.error('💥 Ошибка получения товара:', error);
    res.status(500).json({ error: 'Ошибка получения товара' });
  }
});

app.post('/api/nomenclature', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Создание товара - полученные данные:', req.body);
    
    const companyId = req.user.companyId;
    const {
      code, name, category_id, type, unit, description,
      specifications, min_quantity, max_quantity, barcode,
      vendor_code, purchase_price, selling_price
    } = req.body;

    // Проверяем обязательные поля
    if (!code || !name || !unit) {
      console.log('❌ Отсутствуют обязательные поля:', { code, name, unit });
      return res.status(400).json({ error: 'Заполните обязательные поля: Код, Наименование, Ед. изм.' });
    }

    // Проверяем уникальность кода
    const checkResult = await pool.query(
      'SELECT id FROM nomenclature WHERE company_id = $1 AND code = $2',
      [companyId, code]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('❌ Товар с таким кодом уже существует:', code);
      return res.status(400).json({ error: 'Товар с таким кодом уже существует' });
    }

    console.log('🔍 Выполняем запрос к БД...');
    
    const result = await pool.query(
      `INSERT INTO nomenclature (
        company_id, code, name, category_id, type, unit, description,
        specifications, min_quantity, max_quantity, barcode,
        vendor_code, purchase_price, selling_price, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
      RETURNING *`,
      [
        companyId, 
        code, 
        name, 
        category_id || null,
        type || 'product',
        unit,
        description || '',
        specifications || {},
        min_quantity || null,
        max_quantity || null,
        barcode || '',
        vendor_code || '',
        purchase_price || 0,
        selling_price || 0
      ]
    );

    console.log('✅ Товар создан успешно:', result.rows[0]);
    
    res.status(201).json({
      success: true,
      message: 'Товар успешно создан',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('💥 Ошибка создания товара:', error);
    console.error('💥 Детали ошибки:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Ошибка создания товара: ' + error.message });
  }
});

app.put('/api/nomenclature/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const {
      name, category_id, type, unit, description,
      specifications, min_quantity, max_quantity, barcode,
      vendor_code, purchase_price, selling_price, is_active
    } = req.body;
    
    // Проверяем существование товара
    const checkResult = await pool.query(
      'SELECT id FROM nomenclature WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    const result = await pool.query(
      `UPDATE nomenclature SET
        name = $1, category_id = $2, type = $3, unit = $4, description = $5,
        specifications = $6, min_quantity = $7, max_quantity = $8, barcode = $9,
        vendor_code = $10, purchase_price = $11, selling_price = $12,
        is_active = $13, updated_at = CURRENT_TIMESTAMP
       WHERE id = $14 AND company_id = $15
       RETURNING *`,
      [
        name, category_id, type, unit, description,
        specifications || {}, min_quantity, max_quantity, barcode,
        vendor_code, purchase_price || 0, selling_price || 0,
        is_active !== undefined ? is_active : true,
        id, companyId
      ]
    );
    
    res.json({
      success: true,
      message: 'Товар успешно обновлен',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('💥 Ошибка обновления товара:', error);
    res.status(500).json({ error: 'Ошибка обновления товара' });
  }
});

app.delete('/api/nomenclature/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    
    // Проверяем, есть ли остатки товара
    const stockResult = await pool.query(
      'SELECT id FROM stock_balances WHERE nomenclature_id = $1 AND quantity > 0',
      [id]
    );
    
    if (stockResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Нельзя удалить товар, у которого есть остатки на складе' 
      });
    }
    
    // Проверяем, используется ли товар в документах
    const documentsCheck = await pool.query(
      `SELECT 'receipt' as type, id FROM receipt_items WHERE nomenclature_id = $1
       UNION ALL
       SELECT 'writeoff' as type, id FROM writeoff_items WHERE nomenclature_id = $1
       UNION ALL
       SELECT 'movement' as type, id FROM movement_items WHERE nomenclature_id = $1
       LIMIT 1`,
      [id]
    );
    
    if (documentsCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Нельзя удалить товар, который используется в документах' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM nomenclature WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json({
      success: true,
      message: 'Товар успешно удален'
    });
  } catch (error) {
    console.error('💥 Ошибка удаления товара:', error);
    res.status(500).json({ error: 'Ошибка удаления товара' });
  }
});

// API: Профиль пользователя
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    
    const result = await pool.query(
      `SELECT u.*, c.company_name, c.company_code
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1 AND u.company_id = $2`,
      [userId, companyId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = result.rows[0];
    
    // Не возвращаем пароль
    delete user.password_hash;
    
    res.json({
      success: true,
      profile: user
    });
  } catch (error) {
    console.error('💥 Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    const { full_name, phone, avatar_url } = req.body;
    
    const result = await pool.query(
      `UPDATE users 
       SET full_name = $1, phone = $2, avatar_url = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND company_id = $5
       RETURNING id, email, full_name, phone, avatar_url, role`,
      [full_name, phone, avatar_url, userId, companyId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json({
      success: true,
      message: 'Профиль успешно обновлен',
      profile: result.rows[0]
    });
  } catch (error) {
    console.error('💥 Ошибка обновления профиля:', error);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

app.post('/api/profile/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }
    
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Новый пароль должен содержать минимум 6 символов' });
    }
    
    // Получаем текущий хэш пароля
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1 AND company_id = $2',
      [userId, companyId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const currentHash = userResult.rows[0].password_hash;
    
    // Проверяем текущий пароль
    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(current_password, currentHash);
    
    if (!isValid) {
      return res.status(400).json({ error: 'Текущий пароль неверен' });
    }
    
    // Хэшируем новый пароль
    const newHash = await bcrypt.hash(new_password, 10);
    
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND company_id = $3',
      [newHash, userId, companyId]
    );
    
    res.json({
      success: true,
      message: 'Пароль успешно изменен'
    });
  } catch (error) {
    console.error('💥 Ошибка смены пароля:', error);
    res.status(500).json({ error: 'Ошибка смены пароля' });
  }
});

// API: Отчеты
app.get('/api/reports/stock-balances', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { warehouse_id, category_id } = req.query;
    
    let query = `
      SELECT 
        sb.*,
        w.name as warehouse_name,
        n.code as item_code,
        n.name as item_name,
        n.unit,
        n.min_quantity,
        c.name as category_name,
        sc.code as cell_code
      FROM stock_balances sb
      JOIN warehouses w ON sb.warehouse_id = w.id
      JOIN nomenclature n ON sb.nomenclature_id = n.id
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN storage_cells sc ON sb.storage_cell_id = sc.id
      WHERE sb.company_id = $1 AND sb.quantity > 0
    `;
    
    const params = [companyId];
    let paramCount = 2;
    
    if (warehouse_id) {
      query += ` AND sb.warehouse_id = $${paramCount}`;
      params.push(warehouse_id);
      paramCount++;
    }
    
    if (category_id) {
      query += ` AND n.category_id = $${paramCount}`;
      params.push(category_id);
      paramCount++;
    }
    
    query += ' ORDER BY w.name, n.name';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      report: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('💥 Ошибка формирования отчета по остаткам:', error);
    res.status(500).json({ error: 'Ошибка формирования отчета' });
  }
});

app.get('/api/reports/low-stock', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const result = await pool.query(
      `SELECT 
        n.*,
        c.name as category_name,
        COALESCE(SUM(sb.quantity), 0) as total_quantity,
        n.min_quantity
      FROM nomenclature n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN stock_balances sb ON n.id = sb.nomenclature_id
      WHERE n.company_id = $1 
        AND n.type = 'product'
        AND n.min_quantity > 0
        AND n.is_active = true
      GROUP BY n.id, c.name
      HAVING COALESCE(SUM(sb.quantity), 0) < n.min_quantity
      ORDER BY (n.min_quantity - COALESCE(SUM(sb.quantity), 0)) DESC`,
      [companyId]
    );
    
    res.json({
      success: true,
      items: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('💥 Ошибка формирования отчета по низким остаткам:', error);
    res.status(500).json({ error: 'Ошибка формирования отчета' });
  }
});

app.get('/api/reports/movement-log', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { start_date, end_date, warehouse_id } = req.query;
    
    let query = `
      SELECT 
        sm.*,
        w.name as warehouse_name,
        sc.code as cell_code,
        n.code as item_code,
        n.name as item_name,
        u.full_name as user_name
      FROM stock_movements sm
      JOIN warehouses w ON sm.warehouse_id = w.id
      LEFT JOIN storage_cells sc ON sm.storage_cell_id = sc.id
      JOIN nomenclature n ON sm.nomenclature_id = n.id
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE sm.company_id = $1
    `;
    
    const params = [companyId];
    let paramCount = 2;
    
    if (start_date) {
      query += ` AND sm.movement_date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }
    
    if (end_date) {
      query += ` AND sm.movement_date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }
    
    if (warehouse_id) {
      query += ` AND sm.warehouse_id = $${paramCount}`;
      params.push(warehouse_id);
      paramCount++;
    }
    
    query += ' ORDER BY sm.movement_date DESC LIMIT 100';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      movements: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('💥 Ошибка формирования журнала движений:', error);
    res.status(500).json({ error: 'Ошибка формирования отчета' });
  }
});

// API: Получение ячеек хранения по складу
app.get('/api/storage-cells', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { warehouse_id } = req.query;
    
    let query = `
      SELECT sc.*, 
      w.name as warehouse_name,
      COUNT(sb.id) as items_count,
      COALESCE(SUM(sb.quantity), 0) as total_quantity,
      COALESCE(SUM(sb.quantity * COALESCE(sb.average_cost, 0)), 0) as total_value
      FROM storage_cells sc
      JOIN warehouses w ON sc.warehouse_id = w.id
      LEFT JOIN stock_balances sb ON sc.id = sb.storage_cell_id
      WHERE w.company_id = $1
    `;
    
    const params = [companyId];
    
    if (warehouse_id && warehouse_id !== 'all') {
      query += ' AND sc.warehouse_id = $2';
      params.push(warehouse_id);
    }
    
    query += ' GROUP BY sc.id, w.name ORDER BY sc.zone, sc.aisle, sc.rack, sc.level, sc.position';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      cells: result.rows
    });
  } catch (error) {
    console.error('💥 Ошибка получения ячеек хранения:', error);
    res.status(500).json({ error: 'Ошибка получения ячеек хранения' });
  }
});

// API: Создание ячейки хранения
app.post('/api/storage-cells', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const {
      warehouse_id, code, name, zone, aisle, rack, level, position,
      cell_type, max_capacity, description
    } = req.body;
    
    // Проверяем, существует ли склад
    const warehouseCheck = await pool.query(
      'SELECT id FROM warehouses WHERE id = $1 AND company_id = $2',
      [warehouse_id, companyId]
    );
    
    if (warehouseCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Склад не найден' });
    }
    
    // Проверяем уникальность кода в рамках склада
    const codeCheck = await pool.query(
      'SELECT id FROM storage_cells WHERE warehouse_id = $1 AND code = $2',
      [warehouse_id, code]
    );
    
    if (codeCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Ячейка с таким кодом уже существует на этом складе' });
    }

    const result = await pool.query(
      `INSERT INTO storage_cells (
        warehouse_id, code, name, zone, aisle, rack, level, position,
        cell_type, max_capacity, description, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
      RETURNING *`,
      [
        warehouse_id, code, name || '', zone || '', aisle || '', rack || '',
        level || 1, position || 1, cell_type || 'standard', 
        max_capacity || 0, description || ''
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Ячейка хранения успешно создана',
      cell: result.rows[0]
    });
  } catch (error) {
    console.error('💥 Ошибка создания ячейки хранения:', error);
    res.status(500).json({ error: 'Ошибка создания ячейки хранения: ' + error.message });
  }
});

// API: Обновление ячейки хранения
app.put('/api/storage-cells/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const {
      code, name, zone, aisle, rack, level, position,
      cell_type, max_capacity, description, is_active
    } = req.body;
    
    // Проверяем существование ячейки
    const cellCheck = await pool.query(
      `SELECT sc.id FROM storage_cells sc
       JOIN warehouses w ON sc.warehouse_id = w.id
       WHERE sc.id = $1 AND w.company_id = $2`,
      [id, companyId]
    );
    
    if (cellCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ячейка хранения не найдена' });
    }

    const result = await pool.query(
      `UPDATE storage_cells SET
        code = $1, name = $2, zone = $3, aisle = $4, rack = $5,
        level = $6, position = $7, cell_type = $8,
        max_capacity = $9, description = $10, is_active = $11,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        code, name || '', zone || '', aisle || '', rack || '',
        level || 1, position || 1, cell_type || 'standard',
        max_capacity || 0, description || '', 
        is_active !== undefined ? is_active : true,
        id
      ]
    );
    
    res.json({
      success: true,
      message: 'Ячейка хранения успешно обновлена',
      cell: result.rows[0]
    });
  } catch (error) {
    console.error('💥 Ошибка обновления ячейки хранения:', error);
    res.status(500).json({ error: 'Ошибка обновления ячейки хранения: ' + error.message });
  }
});

// API: Удаление ячейки хранения
app.delete('/api/storage-cells/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    
    // Проверяем существование ячейки
    const cellCheck = await pool.query(
      `SELECT sc.id FROM storage_cells sc
       JOIN warehouses w ON sc.warehouse_id = w.id
       WHERE sc.id = $1 AND w.company_id = $2`,
      [id, companyId]
    );
    
    if (cellCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ячейка хранения не найдена' });
    }
    
    // Проверяем, есть ли товары в ячейке
    const stockCheck = await pool.query(
      'SELECT id FROM stock_balances WHERE storage_cell_id = $1 AND quantity > 0 LIMIT 1',
      [id]
    );
    
    if (stockCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Нельзя удалить ячейку, в которой есть товары' 
      });
    }

    const result = await pool.query(
      'DELETE FROM storage_cells WHERE id = $1 RETURNING id',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Ячейка хранения успешно удалена'
    });
  } catch (error) {
    console.error('💥 Ошибка удаления ячейки хранения:', error);
    res.status(500).json({ error: 'Ошибка удаления ячейки хранения: ' + error.message });
  }
});

// API: Получение поступлений
app.get('/api/receipts', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { warehouse_id, status, date_from, date_to, search } = req.query;
    
    let query = `
      SELECT r.*, w.name as warehouse_name, u.full_name as created_by_name,
      (SELECT COUNT(*) FROM receipt_items ri WHERE ri.receipt_id = r.id) as items_count
      FROM receipts r
      JOIN warehouses w ON r.warehouse_id = w.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.company_id = $1
    `;
    
    const params = [companyId];
    let paramCount = 2;
    
    if (warehouse_id && warehouse_id !== 'all') {
      query += ` AND r.warehouse_id = $${paramCount}`;
      params.push(warehouse_id);
      paramCount++;
    }
    
    if (status && status !== 'all') {
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (date_from) {
      query += ` AND r.receipt_date >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }
    
    if (date_to) {
      query += ` AND r.receipt_date <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }
    
    if (search) {
      query += ` AND (r.document_number ILIKE $${paramCount} OR r.supplier_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    query += ' ORDER BY r.receipt_date DESC, r.created_at DESC';
    
    const result = await pool.query(query, params);
    
    // Получаем товары для каждого поступления
    const receiptsWithItems = await Promise.all(
      result.rows.map(async (receipt) => {
        const itemsResult = await pool.query(
          `SELECT ri.*, n.code as item_code, n.name as item_name, n.unit,
           sc.code as cell_code
           FROM receipt_items ri
           JOIN nomenclature n ON ri.nomenclature_id = n.id
           LEFT JOIN storage_cells sc ON ri.storage_cell_id = sc.id
           WHERE ri.receipt_id = $1`,
          [receipt.id]
        );
        
        return {
          ...receipt,
          items: itemsResult.rows
        };
      })
    );
    
    res.json({
      success: true,
      receipts: receiptsWithItems,
      total: receiptsWithItems.length
    });
  } catch (error) {
    console.error('💥 Ошибка получения поступлений:', error);
    res.status(500).json({ error: 'Ошибка получения поступлений' });
  }
});

// API: Создание поступления
app.post('/api/receipts', authenticateToken, async (req, res) => {
  try {
    const { 
      receipt_date, 
      warehouse_id, 
      supplier_name, 
      supplier_invoice, 
      comment, 
      items 
    } = req.body;
    
    const userId = req.user.userId;
    const companyId = req.user.companyId;

    console.log('Создание поступления:', { 
      companyId, 
      warehouse_id, 
      items_count: items?.length || 0 
    });

    // Валидация
    if (!warehouse_id || !supplier_name || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Заполните все обязательные поля: склад, поставщик, товары' 
      });
    }

    // Проверяем, что все товары имеют ячейку хранения
    for (const item of items) {
      if (!item.storage_cell_id) {
        return res.status(400).json({ 
          success: false, 
          error: `Для товара "${item.nomenclature_name || item.nomenclature_id}" не указана ячейка хранения` 
        });
      }
    }

    // Генерация уникального номера документа с текущим годом и месяцем
    const currentDate = new Date();
    const year = currentDate.getFullYear().toString().slice(-2);
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const prefix = `ПР-${year}${month}`;
    
    // Получаем последний номер для данного префикса
    const lastNumberResult = await pool.query(
      `SELECT MAX(CAST(SUBSTRING(document_number FROM '${prefix}-(\\d+)') AS INTEGER)) as last_number
       FROM receipts 
       WHERE company_id = $1 AND document_number LIKE $2`,
      [companyId, `${prefix}-%`]
    );

    let nextNumber = 1;
    if (lastNumberResult.rows[0]?.last_number) {
      nextNumber = parseInt(lastNumberResult.rows[0].last_number) + 1;
    }
    
    const documentNumber = `${prefix}-${String(nextNumber).padStart(5, '0')}`;

    // Начинаем транзакцию
    await pool.query('BEGIN');

    try {
      // Создание документа поступления
      const receiptResult = await pool.query(
        `INSERT INTO receipts (
          company_id, document_number, receipt_date, warehouse_id,
          supplier_name, supplier_invoice, comment, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8)
        RETURNING *`,
        [
          companyId, 
          documentNumber, 
          receipt_date || currentDate.toISOString().split('T')[0],
          warehouse_id,
          supplier_name,
          supplier_invoice || '',
          comment || '',
          userId
        ]
      );

      const receipt = receiptResult.rows[0];
      let totalAmount = 0;

      // Добавление позиций товаров
      for (const item of items) {
        const amount = item.quantity * (item.purchase_price || 0);
        totalAmount += amount;

        await pool.query(
          `INSERT INTO receipt_items (
            receipt_id, nomenclature_id, quantity, unit, 
            purchase_price, selling_price, batch, expiry_date, storage_cell_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            receipt.id,
            item.nomenclature_id,
            parseFloat(item.quantity),
            item.unit,
            item.purchase_price || 0,
            item.selling_price || item.purchase_price || 0,
            item.batch || null,
            item.expiry_date || null,
            item.storage_cell_id // Теперь обязательное поле
          ]
        );
      }

      // Обновление общей суммы
      await pool.query(
        'UPDATE receipts SET total_amount = $1 WHERE id = $2',
        [totalAmount, receipt.id]
      );

      await pool.query('COMMIT');

      res.json({ 
        success: true, 
        message: 'Поступление создано',
        receipt: { ...receipt, total_amount: totalAmount }
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('💥 Ошибка создания поступления:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.detail || 'Проверьте уникальность номера документа'
    });
  }
});

// API: Завершение поступления (проводка)
// Исправленная версия API проведения поступления в server.js
// API: Завершение поступления (проводка)
app.post('/api/receipts/:id/complete', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const companyId = req.user.companyId;
    const { id } = req.params;
    
    // Проверяем существование поступления
    const receiptCheck = await client.query(
      `SELECT r.* FROM receipts r
       WHERE r.id = $1 AND r.company_id = $2 AND r.status = 'draft'`,
      [id, companyId]
    );
    
    if (receiptCheck.rows.length === 0) {
      throw new Error('Поступление не найдено или уже проведено');
    }
    
    const receipt = receiptCheck.rows[0];
    
    // Получаем товары поступления
    const itemsResult = await client.query(
      `SELECT ri.*, n.code as item_code, n.name as item_name
       FROM receipt_items ri
       JOIN nomenclature n ON ri.nomenclature_id = n.id
       WHERE ri.receipt_id = $1`,
      [id]
    );
    
    const items = itemsResult.rows;
    
    // Обновляем остатки для каждого товара
    for (const item of items) {
      // Убеждаемся, что числа корректно преобразованы
      const itemQuantity = parseFloat(item.quantity) || 0;
      const itemPurchasePrice = parseFloat(item.purchase_price) || 0;
      
      // Ищем существующий остаток
      const stockResult = await client.query(
        `SELECT * FROM stock_balances 
         WHERE warehouse_id = $1 AND storage_cell_id = $2 AND nomenclature_id = $3`,
        [receipt.warehouse_id, item.storage_cell_id, item.nomenclature_id]
      );
      
      if (stockResult.rows.length > 0) {
        // Обновляем существующий остаток
        const stock = stockResult.rows[0];
        
        // Убеждаемся, что значения корректно преобразованы
        const stockQuantity = parseFloat(stock.quantity) || 0;
        const stockAverageCost = parseFloat(stock.average_cost) || 0;
        
        const newQuantity = stockQuantity + itemQuantity;
        
        // Рассчитываем новую среднюю стоимость
        let newAverageCost = stockAverageCost;
        if (newQuantity > 0) {
          const totalValue = (stockQuantity * stockAverageCost) + (itemQuantity * itemPurchasePrice);
          newAverageCost = totalValue / newQuantity;
        }
        
        // Округляем значения для PostgreSQL
        const roundedNewQuantity = parseFloat(newQuantity.toFixed(3));
        const roundedNewAverageCost = parseFloat(newAverageCost.toFixed(2));
        
        await client.query(
          `UPDATE stock_balances SET
            quantity = $1, average_cost = $2, last_movement_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [roundedNewQuantity, roundedNewAverageCost, stock.id]
        );
      } else {
        // Создаем новый остаток
        const roundedQuantity = parseFloat(itemQuantity.toFixed(3));
        const roundedPurchasePrice = parseFloat(itemPurchasePrice.toFixed(2));
        
        await client.query(
          `INSERT INTO stock_balances (
            company_id, warehouse_id, storage_cell_id, nomenclature_id,
            quantity, average_cost, last_movement_date
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [
            companyId, 
            receipt.warehouse_id, 
            item.storage_cell_id, 
            item.nomenclature_id,
            roundedQuantity, 
            roundedPurchasePrice
          ]
        );
      }
      
      // Добавляем запись в историю движений
      const finalQuantity = parseFloat(itemQuantity.toFixed(3));
      const itemName = item.item_name || 'Товар';
      
      await client.query(
        `INSERT INTO stock_movements (
          company_id, document_type, document_id, document_number,
          warehouse_id, storage_cell_id, nomenclature_id,
          quantity_change, quantity_after, user_id, comment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          companyId, 
          'receipt', 
          receipt.id, 
          receipt.document_number,
          receipt.warehouse_id, 
          item.storage_cell_id, 
          item.nomenclature_id,
          finalQuantity, 
          finalQuantity, 
          req.user.userId,
          `Поступление от ${receipt.supplier_name}: ${itemName}`
        ]
      );
    }
    
    // Обновляем статус поступления
    await client.query(
      `UPDATE receipts SET 
        status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Поступление успешно проведено'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Ошибка проведения поступления:', error);
    res.status(500).json({ 
      error: 'Ошибка проведения поступления: ' + error.message,
      details: 'Проверьте корректность числовых значений в товарах'
    });
  } finally {
    client.release();
  }
});

// API: Удаление поступления
app.delete('/api/receipts/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    
    // Проверяем существование поступления
    const receiptCheck = await pool.query(
      'SELECT id, status FROM receipts WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    
    if (receiptCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Поступление не найдено' });
    }
    
    const receipt = receiptCheck.rows[0];
    
    // Нельзя удалить проведенное поступление
    if (receipt.status === 'completed') {
      return res.status(400).json({ 
        error: 'Нельзя удалить проведенное поступление' 
      });
    }
    
    // Удаляем поступление
    await pool.query('DELETE FROM receipts WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Поступление успешно удалено'
    });
  } catch (error) {
    console.error('💥 Ошибка удаления поступления:', error);
    res.status(500).json({ error: 'Ошибка удаления поступления: ' + error.message });
  }
});

// API: Получение списаний
app.get('/api/writeoffs', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { warehouse_id, status, date_from, date_to, search } = req.query;
    
    let query = `
      SELECT w.*, wh.name as warehouse_name, u.full_name as created_by_name,
      (SELECT COUNT(*) FROM writeoff_items wi WHERE wi.writeoff_id = w.id) as items_count
      FROM writeoffs w
      JOIN warehouses wh ON w.warehouse_id = wh.id
      LEFT JOIN users u ON w.created_by = u.id
      WHERE w.company_id = $1
    `;
    
    const params = [companyId];
    let paramCount = 2;
    
    if (warehouse_id && warehouse_id !== 'all') {
      query += ` AND w.warehouse_id = $${paramCount}`;
      params.push(warehouse_id);
      paramCount++;
    }
    
    if (status && status !== 'all') {
      query += ` AND w.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (date_from) {
      query += ` AND w.writeoff_date >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }
    
    if (date_to) {
      query += ` AND w.writeoff_date <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }
    
    if (search) {
      query += ` AND (w.document_number ILIKE $${paramCount} OR w.reason ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    query += ' ORDER BY w.writeoff_date DESC, w.created_at DESC';
    
    const result = await pool.query(query, params);
    
    // Получаем товары для каждого списания
    const writeoffsWithItems = await Promise.all(
      result.rows.map(async (writeoff) => {
        const itemsResult = await pool.query(
          `SELECT wi.*, n.code as item_code, n.name as item_name, n.unit,
           sc.code as cell_code
           FROM writeoff_items wi
           JOIN nomenclature n ON wi.nomenclature_id = n.id
           LEFT JOIN storage_cells sc ON wi.storage_cell_id = sc.id
           WHERE wi.writeoff_id = $1`,
          [writeoff.id]
        );
        
        return {
          ...writeoff,
          items: itemsResult.rows
        };
      })
    );
    
    res.json({
      success: true,
      writeoffs: writeoffsWithItems,
      total: writeoffsWithItems.length
    });
  } catch (error) {
    console.error('💥 Ошибка получения списаний:', error);
    res.status(500).json({ error: 'Ошибка получения списаний' });
  }
});

// API: Создание списания
app.post('/api/writeoffs', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    const {
      writeoff_date, warehouse_id, reason, comment, items
    } = req.body;
    
    console.log('📝 Создание списания:', { companyId, warehouse_id, items_count: items?.length });
    
    // Проверяем обязательные поля
    if (!writeoff_date || !warehouse_id || !reason || !items || items.length === 0) {
      throw new Error('Заполните все обязательные поля: дата, склад, причина, товары');
    }
    
    // Проверяем существование склада
    const warehouseCheck = await client.query(
      'SELECT id FROM warehouses WHERE id = $1 AND company_id = $2',
      [warehouse_id, companyId]
    );
    
    if (warehouseCheck.rows.length === 0) {
      throw new Error('Склад не найден');
    }
    
    // Генерируем номер документа
    const docNumberResult = await client.query(
      `SELECT COUNT(*) as count FROM writeoffs 
       WHERE company_id = $1 AND EXTRACT(YEAR FROM writeoff_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [companyId]
    );
    
    const count = parseInt(docNumberResult.rows[0].count) + 1;
    const documentNumber = `СП-${new Date().getFullYear().toString().slice(-2)}-${count.toString().padStart(5, '0')}`;
    
    // Создаем документ списания
    const writeoffResult = await client.query(
      `INSERT INTO writeoffs (
        company_id, document_number, writeoff_date, warehouse_id,
        reason, comment, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7)
      RETURNING *`,
      [
        companyId, documentNumber, writeoff_date, warehouse_id,
        reason, comment || '', userId
      ]
    );
    
    const writeoff = writeoffResult.rows[0];
    let totalAmount = 0;
    
    // Добавляем товары
    for (const item of items) {
      const { nomenclature_id, quantity, storage_cell_id, batch } = item;
      
      // Проверяем существование товара
      const itemCheck = await client.query(
        'SELECT id FROM nomenclature WHERE id = $1 AND company_id = $2',
        [nomenclature_id, companyId]
      );
      
      if (itemCheck.rows.length === 0) {
        throw new Error(`Товар с ID ${nomenclature_id} не найден`);
      }
      
      // Проверяем наличие товара на складе
      const stockCheck = await client.query(
        `SELECT quantity, average_cost FROM stock_balances 
         WHERE warehouse_id = $1 AND storage_cell_id = $2 AND nomenclature_id = $3`,
        [warehouse_id, storage_cell_id, nomenclature_id]
      );
      
      if (stockCheck.rows.length === 0) {
        throw new Error(`Товар отсутствует на указанной ячейке хранения`);
      }
      
      const stock = stockCheck.rows[0];
      
      if (stock.quantity < quantity) {
        throw new Error(`Недостаточно товара на складе. Доступно: ${stock.quantity}, требуется: ${quantity}`);
      }
      
      const itemAmount = quantity * (stock.average_cost || 0);
      totalAmount += itemAmount;
      
      await client.query(
        `INSERT INTO writeoff_items (
          writeoff_id, nomenclature_id, quantity, unit,
          cost_price, batch, storage_cell_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          writeoff.id, nomenclature_id, quantity, 'шт',
          stock.average_cost || 0, batch || '', storage_cell_id
        ]
      );
    }
    
    // Обновляем общую сумму
    await client.query(
      'UPDATE writeoffs SET total_amount = $1 WHERE id = $2',
      [totalAmount, writeoff.id]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Списание успешно создано',
      writeoff: {
        ...writeoff,
        total_amount: totalAmount
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Ошибка создания списания:', error);
    res.status(500).json({ error: 'Ошибка создания списания: ' + error.message });
  } finally {
    client.release();
  }
});

// API: Завершение списания (проводка)
// API: Завершение списания (проводка)
app.post('/api/writeoffs/:id/complete', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const companyId = req.user.companyId;
    const { id } = req.params;
    
    // Проверяем существование списания
    const writeoffCheck = await client.query(
      `SELECT w.* FROM writeoffs w
       WHERE w.id = $1 AND w.company_id = $2 AND w.status = 'draft'`,
      [id, companyId]
    );
    
    if (writeoffCheck.rows.length === 0) {
      throw new Error('Списание не найдено или уже проведено');
    }
    
    const writeoff = writeoffCheck.rows[0];
    
    // Получаем товары списания
    const itemsResult = await client.query(
      `SELECT wi.*, n.code as item_code, n.name as item_name
       FROM writeoff_items wi
       JOIN nomenclature n ON wi.nomenclature_id = n.id
       WHERE wi.writeoff_id = $1`,
      [id]
    );
    
    const items = itemsResult.rows;
    
    // Обновляем остатки для каждого товара
    for (const item of items) {
      // Убеждаемся, что числа корректно преобразованы
      const itemQuantity = parseFloat(item.quantity) || 0;
      
      // Получаем текущий остаток
      const stockResult = await client.query(
        `SELECT * FROM stock_balances 
         WHERE warehouse_id = $1 AND storage_cell_id = $2 AND nomenclature_id = $3`,
        [writeoff.warehouse_id, item.storage_cell_id, item.nomenclature_id]
      );
      
      if (stockResult.rows.length === 0) {
        throw new Error(`Остаток товара не найден`);
      }
      
      const stock = stockResult.rows[0];
      const stockQuantity = parseFloat(stock.quantity) || 0;
      const newQuantity = stockQuantity - itemQuantity;
      
      if (newQuantity < 0) {
        throw new Error(`Недостаточно товара для списания. Доступно: ${stockQuantity}, требуется: ${itemQuantity}`);
      }
      
      const roundedNewQuantity = parseFloat(newQuantity.toFixed(3));
      
      if (roundedNewQuantity === 0) {
        // Удаляем запись об остатке
        await client.query(
          'DELETE FROM stock_balances WHERE id = $1',
          [stock.id]
        );
      } else {
        // Обновляем остаток
        await client.query(
          `UPDATE stock_balances SET
            quantity = $1, last_movement_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [roundedNewQuantity, stock.id]
        );
      }
      
      // Добавляем запись в историю движений
      const itemName = item.item_name || 'Товар';
      await client.query(
        `INSERT INTO stock_movements (
          company_id, document_type, document_id, document_number,
          warehouse_id, storage_cell_id, nomenclature_id,
          quantity_change, quantity_after, user_id, comment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          companyId, 
          'writeoff', 
          writeoff.id, 
          writeoff.document_number,
          writeoff.warehouse_id, 
          item.storage_cell_id, 
          item.nomenclature_id,
          -itemQuantity, 
          roundedNewQuantity, 
          req.user.userId,
          `Списание: ${writeoff.reason} (${itemName})`
        ]
      );
    }
    
    // Обновляем статус списания
    await client.query(
      `UPDATE writeoffs SET 
        status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Списание успешно проведено'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Ошибка проведения списания:', error);
    res.status(500).json({ error: 'Ошибка проведения списания: ' + error.message });
  } finally {
    client.release();
  }
});

// API: Удаление списания
app.delete('/api/writeoffs/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    
    // Проверяем существование списания
    const writeoffCheck = await pool.query(
      'SELECT id, status FROM writeoffs WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    
    if (writeoffCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Списание не найдено' });
    }
    
    const writeoff = writeoffCheck.rows[0];
    
    // Нельзя удалить проведенное списание
    if (writeoff.status === 'completed') {
      return res.status(400).json({ 
        error: 'Нельзя удалить проведенное списание' 
      });
    }
    
    // Удаляем списание
    await pool.query('DELETE FROM writeoffs WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Списание успешно удалено'
    });
  } catch (error) {
    console.error('💥 Ошибка удаления списания:', error);
    res.status(500).json({ error: 'Ошибка удаления списания: ' + error.message });
  }
});

// API: Статистика для дашборда
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { warehouse_id } = req.query;
    
    // Основная статистика
    let warehouseCondition = '';
    const params = [companyId];
    
    if (warehouse_id && warehouse_id !== 'all') {
      warehouseCondition = ' AND warehouse_id = $2';
      params.push(warehouse_id);
    }
    
    // 1. Общая статистика
    const totalStats = await pool.query(
      `SELECT 
        COUNT(DISTINCT w.id) as total_warehouses,
        COUNT(DISTINCT n.id) as total_items,
        COUNT(DISTINCT CASE WHEN n.is_active THEN n.id END) as active_items,
        COUNT(DISTINCT CASE WHEN sb.quantity > 0 THEN sb.nomenclature_id END) as items_in_stock
       FROM warehouses w
       LEFT JOIN nomenclature n ON w.company_id = n.company_id
       LEFT JOIN stock_balances sb ON n.id = sb.nomenclature_id AND w.id = sb.warehouse_id
       WHERE w.company_id = $1${warehouseCondition}`,
      params
    );
    
    // 2. Статистика по низким остаткам
    const lowStockStats = await pool.query(
      `SELECT 
        COUNT(DISTINCT n.id) as low_stock_items,
        SUM(CASE WHEN COALESCE(sb.quantity, 0) < n.min_quantity AND n.min_quantity > 0 THEN 1 ELSE 0 END) as critical_items
       FROM nomenclature n
       LEFT JOIN (
         SELECT nomenclature_id, SUM(quantity) as quantity
         FROM stock_balances
         WHERE company_id = $1${warehouseCondition.replace('warehouse_id', 'warehouse_id')}
         GROUP BY nomenclature_id
       ) sb ON n.id = sb.nomenclature_id
       WHERE n.company_id = $1 AND n.is_active = true`,
      params
    );
    
    // 3. Стоимость запасов
    const valueStats = await pool.query(
      `SELECT 
        COALESCE(SUM(sb.quantity * COALESCE(sb.average_cost, 0)), 0) as total_value,
        COALESCE(SUM(sb.quantity), 0) as total_quantity
       FROM stock_balances sb
       JOIN warehouses w ON sb.warehouse_id = w.id
       WHERE w.company_id = $1${warehouseCondition}`,
      params
    );
    
    // 4. Последние поступления
    const recentReceipts = await pool.query(
      `SELECT r.*, w.name as warehouse_name
       FROM receipts r
       JOIN warehouses w ON r.warehouse_id = w.id
       WHERE r.company_id = $1 AND r.status = 'completed'
       ORDER BY r.receipt_date DESC, r.created_at DESC
       LIMIT 5`,
      [companyId]
    );
    
    // 5. Последние списания
    const recentWriteoffs = await pool.query(
      `SELECT w.*, wh.name as warehouse_name
       FROM writeoffs w
       JOIN warehouses wh ON w.warehouse_id = wh.id
       WHERE w.company_id = $1 AND w.status = 'completed'
       ORDER BY w.writeoff_date DESC, w.created_at DESC
       LIMIT 5`,
      [companyId]
    );
    
    // 6. Статистика по складам
    const warehouseStats = await pool.query(
      `SELECT 
        w.id, w.name, w.code,
        COUNT(DISTINCT sc.id) as cells_count,
        COUNT(DISTINCT sb.nomenclature_id) as items_count,
        COALESCE(SUM(sb.quantity), 0) as total_quantity,
        COALESCE(SUM(sb.quantity * COALESCE(sb.average_cost, 0)), 0) as total_value
       FROM warehouses w
       LEFT JOIN storage_cells sc ON w.id = sc.warehouse_id AND sc.is_active = true
       LEFT JOIN stock_balances sb ON w.id = sb.warehouse_id
       WHERE w.company_id = $1
       GROUP BY w.id, w.name, w.code
       ORDER BY w.name`,
      [companyId]
    );
    
    // 7. Активность за сегодня
    const today = new Date().toISOString().split('T')[0];
    const todayActivity = await pool.query(
      `SELECT 
        COUNT(*) as total_movements,
        SUM(CASE WHEN document_type = 'receipt' THEN 1 ELSE 0 END) as receipts_count,
        SUM(CASE WHEN document_type = 'writeoff' THEN 1 ELSE 0 END) as writeoffs_count
       FROM stock_movements
       WHERE company_id = $1 AND DATE(movement_date) = $2`,
      [companyId, today]
    );
    
    res.json({
      success: true,
      stats: {
        total_warehouses: parseInt(totalStats.rows[0]?.total_warehouses || 0),
        total_items: parseInt(totalStats.rows[0]?.total_items || 0),
        active_items: parseInt(totalStats.rows[0]?.active_items || 0),
        items_in_stock: parseInt(totalStats.rows[0]?.items_in_stock || 0),
        low_stock_items: parseInt(lowStockStats.rows[0]?.low_stock_items || 0),
        critical_items: parseInt(lowStockStats.rows[0]?.critical_items || 0),
        total_value: parseFloat(valueStats.rows[0]?.total_value || 0),
        total_quantity: parseFloat(valueStats.rows[0]?.total_quantity || 0),
        today_movements: parseInt(todayActivity.rows[0]?.total_movements || 0),
        today_receipts: parseInt(todayActivity.rows[0]?.receipts_count || 0),
        today_writeoffs: parseInt(todayActivity.rows[0]?.writeoffs_count || 0)
      },
      recent_receipts: recentReceipts.rows,
      recent_writeoffs: recentWriteoffs.rows,
      warehouse_stats: warehouseStats.rows
    });
  } catch (error) {
    console.error('💥 Ошибка получения статистики дашборда:', error);
    res.status(500).json({ error: 'Ошибка получения статистики дашборда' });
  }
});

// API: Детальная статистика по складу
app.get('/api/dashboard/warehouse-stats/:warehouse_id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { warehouse_id } = req.params;
    
    // Проверяем доступ к складу
    const warehouseCheck = await pool.query(
      'SELECT id, name FROM warehouses WHERE id = $1 AND company_id = $2',
      [warehouse_id, companyId]
    );
    
    if (warehouseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Склад не найден' });
    }
    
    const warehouse = warehouseCheck.rows[0];
    
    // Статистика по товарам на складе
    const itemsStats = await pool.query(
      `SELECT 
        COUNT(DISTINCT sb.nomenclature_id) as items_count,
        COALESCE(SUM(sb.quantity), 0) as total_quantity,
        COALESCE(SUM(sb.quantity * COALESCE(sb.average_cost, 0)), 0) as total_value,
        COUNT(DISTINCT sc.id) as cells_count,
        COUNT(DISTINCT CASE WHEN sc.is_active THEN sc.id END) as active_cells
       FROM stock_balances sb
       LEFT JOIN storage_cells sc ON sb.storage_cell_id = sc.id
       WHERE sb.warehouse_id = $1`,
      [warehouse_id]
    );
    
    // Товары с низкими остатками
    const lowStockItems = await pool.query(
      `SELECT 
        n.id, n.code, n.name, n.min_quantity,
        COALESCE(sb.quantity, 0) as current_quantity,
        n.unit
       FROM nomenclature n
       LEFT JOIN (
         SELECT nomenclature_id, SUM(quantity) as quantity
         FROM stock_balances
         WHERE warehouse_id = $1
         GROUP BY nomenclature_id
       ) sb ON n.id = sb.nomenclature_id
       WHERE n.company_id = $2 
         AND n.is_active = true
         AND n.min_quantity > 0
         AND COALESCE(sb.quantity, 0) < n.min_quantity
       ORDER BY (n.min_quantity - COALESCE(sb.quantity, 0)) DESC
       LIMIT 10`,
      [warehouse_id, companyId]
    );
    
    // Последние движения на складе
    const recentMovements = await pool.query(
      `SELECT 
        sm.*, n.code as item_code, n.name as item_name,
        sc.code as cell_code, u.full_name as user_name
       FROM stock_movements sm
       JOIN nomenclature n ON sm.nomenclature_id = n.id
       LEFT JOIN storage_cells sc ON sm.storage_cell_id = sc.id
       LEFT JOIN users u ON sm.user_id = u.id
       WHERE sm.warehouse_id = $1
       ORDER BY sm.movement_date DESC
       LIMIT 10`,
      [warehouse_id]
    );
    
    res.json({
      success: true,
      warehouse: warehouse,
      stats: itemsStats.rows[0] || {},
      low_stock_items: lowStockItems.rows,
      recent_movements: recentMovements.rows
    });
  } catch (error) {
    console.error('💥 Ошибка получения статистики по складу:', error);
    res.status(500).json({ error: 'Ошибка получения статистики по складу' });
  }
});

// Добавить в существующий app.js после других маршрутов

// Маршруты для перемещений
// API: Создание перемещения (обновленная версия)
app.post('/api/movements', authenticateToken, async (req, res) => {
  try {
    const { type, warehouse_from_id, warehouse_to_id, storage_cell_from_id, 
            storage_cell_to_id, reason, comment, items } = req.body;
    
    const userId = req.user.userId;
    const companyId = req.user.companyId;

    console.log('📝 Создание перемещения:', {
      type, 
      warehouse_from_id, 
      warehouse_to_id, 
      storage_cell_from_id, 
      storage_cell_to_id,
      reason, 
      items_count: items?.length || 0
    });

    // ВАЛИДАЦИЯ
    if (!warehouse_from_id || !reason || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Заполните все обязательные поля: склад-отправитель, причина, товары' 
      });
    }

    if (!storage_cell_from_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Укажите ячейку-отправитель' 
      });
    }

    // Проверка для внутренних перемещений
    if (type === 'internal') {
      if (!storage_cell_to_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Для внутреннего перемещения укажите ячейку-получатель' 
        });
      }
      if (storage_cell_from_id === storage_cell_to_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Ячейка-отправитель и ячейка-получатель не могут быть одинаковыми' 
        });
      }
    }

    // Проверка для межскладских перемещений
    if (type === 'external') {
      if (!warehouse_to_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Для межскладского перемещения укажите склад-получатель' 
        });
      }
      if (!storage_cell_to_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Для межскладского перемещения укажите ячейку-получатель' 
        });
      }
      if (warehouse_from_id === warehouse_to_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Склад-отправитель и склад-получатель не могут быть одинаковыми' 
        });
      }
      
      // Проверяем, что ячейка-получатель принадлежит складу-получателю
      const cellCheck = await pool.query(
        'SELECT id FROM storage_cells WHERE id = $1 AND warehouse_id = $2',
        [storage_cell_to_id, warehouse_to_id]
      );
      
      if (cellCheck.rows.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Указанная ячейка-получатель не принадлежит складу-получателю' 
        });
      }
    }

    // Проверяем, что ячейка-отправитель принадлежит складу-отправителю
    const fromCellCheck = await pool.query(
      'SELECT id FROM storage_cells WHERE id = $1 AND warehouse_id = $2',
      [storage_cell_from_id, warehouse_from_id]
    );
    
    if (fromCellCheck.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Указанная ячейка-отправитель не принадлежит складу-отправителю' 
      });
    }

    // Проверяем наличие товаров на ячейке-отправителе
    for (const item of items) {
      const stockCheck = await pool.query(
        `SELECT quantity FROM stock_balances 
         WHERE company_id = $1 AND warehouse_id = $2 
         AND storage_cell_id = $3 AND nomenclature_id = $4`,
        [companyId, warehouse_from_id, storage_cell_from_id, item.nomenclature_id]
      );

      const available = stockCheck.rows[0]?.quantity || 0;
      if (available < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Недостаточно товара "${item.nomenclature_name || item.nomenclature_id}" на ячейке. ` +
                 `Доступно: ${available}, запрошено: ${item.quantity}` 
        });
      }
    }

    // Генерация номера документа
    const prefix = type === 'internal' ? 'ПВ' : 'ПМ';
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM movements WHERE company_id = $1 AND document_number LIKE $2',
      [companyId, `${prefix}%`]
    );
    const nextNumber = parseInt(countResult.rows[0].count) + 1;
    const documentNumber = `${prefix}-${String(nextNumber).padStart(5, '0')}`;

    // Подготовка параметров
    const params = [
      companyId, 
      documentNumber, 
      type,
      warehouse_from_id,
      type === 'external' ? warehouse_to_id : warehouse_from_id, // Для internal тот же склад
      storage_cell_from_id,
      storage_cell_to_id,
      reason, 
      comment || '', 
      userId
    ];

    // Создание документа перемещения
    const movementResult = await pool.query(
      `INSERT INTO movements (
        company_id, document_number, movement_date, type,
        warehouse_from_id, warehouse_to_id,
        storage_cell_from_id, storage_cell_to_id,
        reason, comment, created_by, status
      ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
      RETURNING *`,
      params
    );

    const movement = movementResult.rows[0];
    let totalAmount = 0;

    // Добавление позиций товаров
    for (const item of items) {
      // Получаем стоимость товара из остатков
      const costResult = await pool.query(
        `SELECT average_cost FROM stock_balances 
         WHERE company_id = $1 AND warehouse_id = $2 
         AND storage_cell_id = $3 AND nomenclature_id = $4`,
        [companyId, warehouse_from_id, storage_cell_from_id, item.nomenclature_id]
      );
      
      const costPrice = costResult.rows[0]?.average_cost || 0;
      const amount = item.quantity * costPrice;
      totalAmount += amount;

      await pool.query(
        `INSERT INTO movement_items (
          movement_id, nomenclature_id, quantity, unit, cost_price, batch
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          movement.id, 
          item.nomenclature_id, 
          parseFloat(item.quantity),
          item.unit || 'шт', 
          costPrice, 
          item.batch || null
        ]
      );
    }

    // Обновление общей суммы
    await pool.query(
      'UPDATE movements SET total_amount = $1 WHERE id = $2',
      [totalAmount, movement.id]
    );

    res.json({ 
      success: true, 
      message: 'Перемещение создано',
      movement: { ...movement, total_amount: totalAmount }
    });
  } catch (error) {
    console.error('Ошибка создания перемещения:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.detail || 'Проверьте корректность введенных данных'
    });
  }
});

// Получение списка перемещений
app.get('/api/movements', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { type, status, warehouse_id, date_from, date_to } = req.query;
    
    let query = `
      SELECT m.*, 
        wf.name as warehouse_from_name,
        wt.name as warehouse_to_name,
        scf.code as storage_cell_from_code,
        sct.code as storage_cell_to_code,
        u.full_name as created_by_name,
        COUNT(mi.id) as items_count
      FROM movements m
      LEFT JOIN warehouses wf ON m.warehouse_from_id = wf.id
      LEFT JOIN warehouses wt ON m.warehouse_to_id = wt.id
      LEFT JOIN storage_cells scf ON m.storage_cell_from_id = scf.id
      LEFT JOIN storage_cells sct ON m.storage_cell_to_id = sct.id
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN movement_items mi ON m.id = mi.movement_id
      WHERE m.company_id = $1
    `;
    
    const params = [companyId];
    let paramCount = 2;

    if (type && type !== 'all') {
      query += ` AND m.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (status && status !== 'all') {
      query += ` AND m.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (warehouse_id) {
      query += ` AND (m.warehouse_from_id = $${paramCount} OR m.warehouse_to_id = $${paramCount})`;
      params.push(warehouse_id);
      paramCount++;
    }

    if (date_from) {
      query += ` AND m.movement_date >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      query += ` AND m.movement_date <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    query += ` GROUP BY m.id, wf.name, wt.name, scf.code, sct.code, u.full_name
               ORDER BY m.movement_date DESC, m.document_number DESC`;

    const result = await pool.query(query, params);
    
    // Получаем товары для каждого перемещения
    const movementsWithItems = await Promise.all(
      result.rows.map(async (movement) => {
        const itemsResult = await pool.query(
          `SELECT mi.*, n.code as nomenclature_code, n.name as nomenclature_name
           FROM movement_items mi
           JOIN nomenclature n ON mi.nomenclature_id = n.id
           WHERE mi.movement_id = $1`,
          [movement.id]
        );
        
        return {
          ...movement,
          items: itemsResult.rows
        };
      })
    );

    res.json({ success: true, movements: movementsWithItems });
  } catch (error) {
    console.error('Ошибка загрузки перемещений:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получение одного перемещения
app.get('/api/movements/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const movementId = req.params.id;

    const movementResult = await pool.query(
      `SELECT m.*, 
        wf.name as warehouse_from_name, wf.code as warehouse_from_code,
        wt.name as warehouse_to_name, wt.code as warehouse_to_code,
        scf.code as storage_cell_from_code, scf.name as storage_cell_from_name,
        sct.code as storage_cell_to_code, sct.name as storage_cell_to_name,
        u.full_name as created_by_name
       FROM movements m
       LEFT JOIN warehouses wf ON m.warehouse_from_id = wf.id
       LEFT JOIN warehouses wt ON m.warehouse_to_id = wt.id
       LEFT JOIN storage_cells scf ON m.storage_cell_from_id = scf.id
       LEFT JOIN storage_cells sct ON m.storage_cell_to_id = sct.id
       LEFT JOIN users u ON m.created_by = u.id
       WHERE m.id = $1 AND m.company_id = $2`,
      [movementId, companyId]
    );

    if (movementResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Перемещение не найдено' });
    }

    const movement = movementResult.rows[0];

    // Получаем товары
    const itemsResult = await pool.query(
      `SELECT mi.*, 
        n.code as nomenclature_code, n.name as nomenclature_name, n.unit,
        sb.quantity as available_quantity
       FROM movement_items mi
       JOIN nomenclature n ON mi.nomenclature_id = n.id
       LEFT JOIN stock_balances sb ON 
         sb.nomenclature_id = mi.nomenclature_id AND 
         sb.warehouse_id = $1 AND
         sb.storage_cell_id = $2
       WHERE mi.movement_id = $3`,
      [movement.warehouse_from_id, movement.storage_cell_from_id, movementId]
    );

    res.json({
      success: true,
      movement: {
        ...movement,
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('Ошибка загрузки перемещения:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Проведение перемещения
// API: Проведение перемещения (исправленная версия)
app.post('/api/movements/:id/complete', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const companyId = req.user.companyId;
    const movementId = req.params.id;

    // Получаем перемещение с деталями
    const movementResult = await client.query(
      `SELECT m.*, 
       wf.name as warehouse_from_name,
       wt.name as warehouse_to_name,
       scf.code as cell_from_code,
       sct.code as cell_to_code
       FROM movements m
       LEFT JOIN warehouses wf ON m.warehouse_from_id = wf.id
       LEFT JOIN warehouses wt ON m.warehouse_to_id = wt.id
       LEFT JOIN storage_cells scf ON m.storage_cell_from_id = scf.id
       LEFT JOIN storage_cells sct ON m.storage_cell_to_id = sct.id
       WHERE m.id = $1 AND m.company_id = $2 AND m.status = 'draft'`,
      [movementId, companyId]
    );

    if (movementResult.rows.length === 0) {
      throw new Error('Перемещение не найдено или уже проведено');
    }

    const movement = movementResult.rows[0];

    // Проверяем обязательные поля для межскладского перемещения
    if (movement.type === 'external') {
      if (!movement.warehouse_to_id || !movement.storage_cell_to_id) {
        throw new Error('Для межскладского перемещения укажите склад и ячейку получателя');
      }
    }

    // Получаем товары перемещения
    const itemsResult = await client.query(
      `SELECT mi.*, n.code as item_code, n.name as item_name
       FROM movement_items mi
       JOIN nomenclature n ON mi.nomenclature_id = n.id
       WHERE mi.movement_id = $1`,
      [movementId]
    );

    const items = itemsResult.rows;

    console.log('🔄 Проведение перемещения:', {
      id: movement.id,
      type: movement.type,
      document_number: movement.document_number,
      warehouse_from: movement.warehouse_from_name,
      warehouse_to: movement.warehouse_to_name,
      cell_from: movement.cell_from_code,
      cell_to: movement.cell_to_code,
      items_count: items.length
    });

    for (const item of items) {
      // Убеждаемся, что числа корректно преобразованы
      const itemQuantity = parseFloat(item.quantity) || 0;
      const itemCostPrice = parseFloat(item.cost_price) || 0;
      
      console.log(`📦 Обработка товара: ${item.item_name} (${itemQuantity} шт)`);

      // Проверяем наличие товара на складе-отправителе
      const fromBalanceResult = await client.query(
        `SELECT id, quantity, average_cost FROM stock_balances 
         WHERE company_id = $1 AND warehouse_id = $2 
         AND storage_cell_id = $3 AND nomenclature_id = $4
         FOR UPDATE`,
        [
          companyId, 
          movement.warehouse_from_id, 
          movement.storage_cell_from_id, 
          item.nomenclature_id
        ]
      );

      if (fromBalanceResult.rows.length === 0) {
        throw new Error(`Товар "${item.item_name}" отсутствует на складе-отправителе в указанной ячейке`);
      }

      const fromBalance = fromBalanceResult.rows[0];
      const fromQuantity = parseFloat(fromBalance.quantity) || 0;
      const fromCost = parseFloat(fromBalance.average_cost) || 0;
      
      console.log(`📊 Остаток на отправителе: ${fromQuantity} шт`);

      if (fromQuantity < itemQuantity) {
        throw new Error(`Недостаточно товара "${item.item_name}" на складе-отправителе. Доступно: ${fromQuantity}, требуется: ${itemQuantity}`);
      }

      // 1. Списание со склада-отправителя
      const newFromQuantity = fromQuantity - itemQuantity;
      const roundedNewFromQuantity = parseFloat(newFromQuantity.toFixed(3));
      
      if (roundedNewFromQuantity === 0) {
        console.log(`🗑️ Удаление остатка на отправителе`);
        await client.query(
          'DELETE FROM stock_balances WHERE id = $1',
          [fromBalance.id]
        );
      } else {
        console.log(`📉 Обновление остатка на отправителе: ${roundedNewFromQuantity} шт`);
        await client.query(
          `UPDATE stock_balances 
           SET quantity = $1,
               last_movement_date = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [roundedNewFromQuantity, fromBalance.id]
        );
      }

      // 2. Поступление на склад/ячейку-получатель
      if (movement.type === 'internal') {
        // ВНУТРЕННЕЕ ПЕРЕМЕЩЕНИЕ (между ячейками одного склада)
        console.log('🔄 Внутреннее перемещение между ячейками');
        
        const toBalanceResult = await client.query(
          `SELECT id, quantity, average_cost FROM stock_balances 
           WHERE company_id = $1 AND warehouse_id = $2 
           AND storage_cell_id = $3 AND nomenclature_id = $4`,
          [
            companyId, 
            movement.warehouse_from_id, // Тот же склад
            movement.storage_cell_to_id, // Другая ячейка
            item.nomenclature_id
          ]
        );

        if (toBalanceResult.rows.length > 0) {
          // Обновляем существующий остаток на ячейке-получателе
          const existing = toBalanceResult.rows[0];
          const existingQuantity = parseFloat(existing.quantity) || 0;
          const existingCost = parseFloat(existing.average_cost) || 0;
          
          const totalQuantity = existingQuantity + itemQuantity;
          const roundedTotalQuantity = parseFloat(totalQuantity.toFixed(3));
          
          // Расчет новой средней стоимости (взвешенная)
          let newAverageCost = existingCost;
          if (totalQuantity > 0) {
            const totalValue = (existingQuantity * existingCost) + (itemQuantity * fromCost);
            newAverageCost = totalValue / totalQuantity;
          }
          const roundedNewAverageCost = parseFloat(newAverageCost.toFixed(2));
          
          console.log(`📈 Обновление существующего остатка на получателе: ${roundedTotalQuantity} шт`);
          
          await client.query(
            `UPDATE stock_balances 
             SET quantity = $1,
                 average_cost = $2,
                 last_movement_date = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [roundedTotalQuantity, roundedNewAverageCost, existing.id]
          );
        } else {
          // Создаем новый остаток на ячейке-получателе
          const roundedItemQuantity = parseFloat(itemQuantity.toFixed(3));
          const roundedFromCost = parseFloat(fromCost.toFixed(2));
          
          console.log(`🆕 Создание нового остатка на получателе: ${roundedItemQuantity} шт`);
          
          await client.query(
            `INSERT INTO stock_balances (
              company_id, warehouse_id, storage_cell_id,
              nomenclature_id, quantity, average_cost, last_movement_date
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
            [
              companyId, 
              movement.warehouse_from_id,
              movement.storage_cell_to_id, 
              item.nomenclature_id,
              roundedItemQuantity, 
              roundedFromCost
            ]
          );
        }

        // Запись в историю движений для получения
        await client.query(
          `INSERT INTO stock_movements (
            company_id, movement_date, document_type,
            document_id, document_number, warehouse_id,
            storage_cell_id, nomenclature_id, quantity_change,
            quantity_after, user_id, comment
          ) VALUES ($1, CURRENT_TIMESTAMP, 'movement', $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            companyId, 
            movementId, 
            movement.document_number,
            movement.warehouse_from_id, 
            movement.storage_cell_to_id,
            item.nomenclature_id, 
            itemQuantity, 
            itemQuantity, 
            req.user.userId,
            `Поступление при внутреннем перемещении ${movement.document_number}`
          ]
        );

      } else if (movement.type === 'external') {
        // МЕЖСКЛАДСКОЕ ПЕРЕМЕЩЕНИЕ (между разными складами)
        console.log('🚚 Межскладское перемещение');
        
        // Проверяем остаток на складе-получателе
        const toBalanceResult = await client.query(
          `SELECT id, quantity, average_cost FROM stock_balances 
           WHERE company_id = $1 AND warehouse_id = $2 
           AND storage_cell_id = $3 AND nomenclature_id = $4`,
          [
            companyId, 
            movement.warehouse_to_id, // Другой склад
            movement.storage_cell_to_id, // Ячейка на другом складе
            item.nomenclature_id
          ]
        );

        if (toBalanceResult.rows.length > 0) {
          // Обновляем существующий остаток на складе-получателе
          const existing = toBalanceResult.rows[0];
          const existingQuantity = parseFloat(existing.quantity) || 0;
          const existingCost = parseFloat(existing.average_cost) || 0;
          
          const totalQuantity = existingQuantity + itemQuantity;
          const roundedTotalQuantity = parseFloat(totalQuantity.toFixed(3));
          
          // Расчет новой средней стоимости (взвешенная)
          let newAverageCost = existingCost;
          if (totalQuantity > 0) {
            const totalValue = (existingQuantity * existingCost) + (itemQuantity * fromCost);
            newAverageCost = totalValue / totalQuantity;
          }
          const roundedNewAverageCost = parseFloat(newAverageCost.toFixed(2));
          
          console.log(`📈 Обновление остатка на складе-получателе: ${roundedTotalQuantity} шт`);
          
          await client.query(
            `UPDATE stock_balances 
             SET quantity = $1,
                 average_cost = $2,
                 last_movement_date = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [roundedTotalQuantity, roundedNewAverageCost, existing.id]
          );
        } else {
          // Создаем новый остаток на складе-получателе
          const roundedItemQuantity = parseFloat(itemQuantity.toFixed(3));
          const roundedFromCost = parseFloat(fromCost.toFixed(2));
          
          console.log(`🆕 Создание остатка на складе-получателе: ${roundedItemQuantity} шт`);
          
          await client.query(
            `INSERT INTO stock_balances (
              company_id, warehouse_id, storage_cell_id,
              nomenclature_id, quantity, average_cost, last_movement_date
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
            [
              companyId, 
              movement.warehouse_to_id,
              movement.storage_cell_to_id, 
              item.nomenclature_id,
              roundedItemQuantity, 
              roundedFromCost
            ]
          );
        }

        // Запись в историю движений для получения
        await client.query(
          `INSERT INTO stock_movements (
            company_id, movement_date, document_type,
            document_id, document_number, warehouse_id,
            storage_cell_id, nomenclature_id, quantity_change,
            quantity_after, user_id, comment
          ) VALUES ($1, CURRENT_TIMESTAMP, 'movement', $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            companyId, 
            movementId, 
            movement.document_number,
            movement.warehouse_to_id, 
            movement.storage_cell_to_id,
            item.nomenclature_id, 
            itemQuantity, 
            itemQuantity, 
            req.user.userId,
            `Поступление при межскладском перемещении ${movement.document_number}`
          ]
        );
      }

      // Запись в историю движений для списания (общая для обоих типов)
      await client.query(
        `INSERT INTO stock_movements (
          company_id, movement_date, document_type,
          document_id, document_number, warehouse_id,
          storage_cell_id, nomenclature_id, quantity_change,
          quantity_after, user_id, comment
        ) VALUES ($1, CURRENT_TIMESTAMP, 'movement', $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          companyId, 
          movementId, 
          movement.document_number,
          movement.warehouse_from_id, 
          movement.storage_cell_from_id,
          item.nomenclature_id, 
          -itemQuantity, 
          roundedNewFromQuantity, 
          req.user.userId,
          `Списание при перемещении ${movement.document_number}`
        ]
      );
    }

    // Обновляем статус перемещения
    console.log('✅ Обновление статуса перемещения');
    await client.query(
      'UPDATE movements SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['completed', movementId]
    );

    await client.query('COMMIT');
    
    console.log('🎉 Перемещение успешно проведено');

    res.json({ 
      success: true, 
      message: 'Перемещение успешно проведено' 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Ошибка проведения перемещения:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.detail || 'Проверьте наличие товаров на складе-отправителе'
    });
  } finally {
    client.release();
  }
});

// Отмена перемещения
app.post('/api/movements/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const movementId = req.params.id;

    const result = await pool.query(
      'UPDATE movements SET status = $1 WHERE id = $2 AND company_id = $3 RETURNING *',
      ['cancelled', movementId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Перемещение не найдено' });
    }

    res.json({ 
      success: true, 
      message: 'Перемещение отменено' 
    });
  } catch (error) {
    console.error('Ошибка отмены перемещения:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Удаление перемещения
app.delete('/api/movements/:id', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const movementId = req.params.id;

    // Проверяем, можно ли удалить (только черновики)
    const checkResult = await pool.query(
      'SELECT status FROM movements WHERE id = $1 AND company_id = $2',
      [movementId, companyId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Перемещение не найдено' });
    }

    if (checkResult.rows[0].status !== 'draft') {
      return res.status(400).json({ 
        success: false, 
        error: 'Можно удалять только черновики' 
      });
    }

    await pool.query('DELETE FROM movements WHERE id = $1', [movementId]);

    res.json({ 
      success: true, 
      message: 'Перемещение удалено' 
    });
  } catch (error) {
    console.error('Ошибка удаления перемещения:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Запуск сервера
app.listen(PORT, () => {
    console.log(`
===========================================
🚀 Сервер запущен на порту ${PORT}
📡 URL: http://localhost:${PORT}
📊 Health check: http://localhost:${PORT}/api/health
📝 Debug: http://localhost:${PORT}/api/debug/db-info
===========================================
Тестовые данные для входа:
--------------------------------------------------
1. Вход как компания (администратор):
   - Email: admin@techmostore.ru
   - Пароль: admin123

2. Вход как сотрудник:
   - Код компании: COMP001
   - Email: admin@techmostore.ru (или manager@techmostore.ru, employee@techmostore.ru)
   - Пароль: user123
===========================================
    `);
});