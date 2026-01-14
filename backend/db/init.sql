-- База данных системы "Мой склад" - исправленная версия
-- Удаляем старые таблицы если они существуют
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS movement_items CASCADE;
DROP TABLE IF EXISTS movements CASCADE;
DROP TABLE IF EXISTS writeoff_items CASCADE;
DROP TABLE IF EXISTS writeoffs CASCADE;
DROP TABLE IF EXISTS receipt_items CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS stock_balances CASCADE;
DROP TABLE IF EXISTS storage_cells CASCADE;
DROP TABLE IF EXISTS nomenclature CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS user_warehouse_access CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Компании
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    telegram_support_link VARCHAR(500) DEFAULT 'https://t.me/your_support_bot',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Пользователи (сотрудники компании)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'employee')),
    phone VARCHAR(50),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, email)
);

-- Склады компании
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    description TEXT,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- Права пользователей на склады
CREATE TABLE user_warehouse_access (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT TRUE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, warehouse_id)
);

-- Категории товаров
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES categories(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- Номенклатура
CREATE TABLE nomenclature (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    type VARCHAR(20) NOT NULL DEFAULT 'product' CHECK (type IN ('product', 'material', 'service')),
    unit VARCHAR(20) NOT NULL,
    description TEXT,
    specifications JSONB,
    image_url VARCHAR(500),
    min_quantity DECIMAL(12,3) DEFAULT 0,
    max_quantity DECIMAL(12,3),
    barcode VARCHAR(100),
    vendor_code VARCHAR(100),
    purchase_price DECIMAL(12,2),
    selling_price DECIMAL(12,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- Ячейки хранения
CREATE TABLE storage_cells (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    zone VARCHAR(100),
    aisle VARCHAR(10),
    rack VARCHAR(10),
    level INTEGER,
    position INTEGER,
    cell_type VARCHAR(20) DEFAULT 'standard',
    max_capacity DECIMAL(10,2),
    current_capacity DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'available',
    description TEXT,  
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, code)
);

-- Остатки товаров
CREATE TABLE stock_balances (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    storage_cell_id INTEGER REFERENCES storage_cells(id),
    nomenclature_id INTEGER NOT NULL REFERENCES nomenclature(id),
    quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(12,3) DEFAULT 0,
    average_cost DECIMAL(12,2),
    last_movement_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, storage_cell_id, nomenclature_id)
);

-- Документы поступлений
CREATE TABLE receipts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_number VARCHAR(50) NOT NULL,
    receipt_date DATE NOT NULL,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    supplier_name VARCHAR(255),
    supplier_invoice VARCHAR(100),
    total_amount DECIMAL(15,2) DEFAULT 0,
    comment TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'completed', 'cancelled')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, document_number)
);

-- Позиции поступлений
CREATE TABLE receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    nomenclature_id INTEGER NOT NULL REFERENCES nomenclature(id),
    quantity DECIMAL(12,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    purchase_price DECIMAL(12,2),
    selling_price DECIMAL(12,2),
    batch VARCHAR(100),
    expiry_date DATE,
    storage_cell_id INTEGER REFERENCES storage_cells(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Документы списаний
CREATE TABLE writeoffs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_number VARCHAR(50) NOT NULL,
    writeoff_date DATE NOT NULL,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    reason TEXT NOT NULL,
    total_amount DECIMAL(15,2) DEFAULT 0,
    comment TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'completed', 'cancelled')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, document_number)
);

-- Позиции списаний
CREATE TABLE writeoff_items (
    id SERIAL PRIMARY KEY,
    writeoff_id INTEGER NOT NULL REFERENCES writeoffs(id) ON DELETE CASCADE,
    nomenclature_id INTEGER NOT NULL REFERENCES nomenclature(id),
    quantity DECIMAL(12,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    cost_price DECIMAL(12,2),
    batch VARCHAR(100),
    storage_cell_id INTEGER REFERENCES storage_cells(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Документы перемещений
CREATE TABLE movements (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_number VARCHAR(50) NOT NULL,
    movement_date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('internal', 'external')),
    warehouse_from_id INTEGER NOT NULL REFERENCES warehouses(id),
    warehouse_to_id INTEGER REFERENCES warehouses(id),
    storage_cell_from_id INTEGER REFERENCES storage_cells(id),
    storage_cell_to_id INTEGER REFERENCES storage_cells(id),
    reason TEXT NOT NULL,
    total_amount DECIMAL(15,2) DEFAULT 0,
    comment TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'in_progress', 'completed', 'cancelled')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, document_number)
);

-- Позиции перемещений
CREATE TABLE movement_items (
    id SERIAL PRIMARY KEY,
    movement_id INTEGER NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
    nomenclature_id INTEGER NOT NULL REFERENCES nomenclature(id),
    quantity DECIMAL(12,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    cost_price DECIMAL(12,2),
    batch VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- История движений товаров (аудит)
CREATE TABLE stock_movements (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    movement_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    document_type VARCHAR(20) NOT NULL,
    document_id INTEGER NOT NULL,
    document_number VARCHAR(50),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    storage_cell_id INTEGER REFERENCES storage_cells(id),
    nomenclature_id INTEGER NOT NULL REFERENCES nomenclature(id),
    quantity_change DECIMAL(12,3) NOT NULL,
    quantity_after DECIMAL(12,3) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    comment TEXT
);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nomenclature_updated_at BEFORE UPDATE ON nomenclature FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставляем тестовую компанию (пароль: admin123)
INSERT INTO companies (company_code, company_name, email, password_hash, phone, address) VALUES
('COMP001', 'ТехноСклад', 'admin@techmostore.ru', '$2a$10$N9qo8uLOickgx2ZMRZoMye.MH6J4bH3Bx7KjK6Z6BvR7V5vQ5Q5W2', '+7 (999) 123-45-67', 'г. Москва, ул. Промышленная, 15');

-- Пользователи компании (пароль для всех: user123)
INSERT INTO users (company_id, email, password_hash, full_name, role, phone) VALUES
(1, 'admin@techmostore.ru', '$2a$10$N9qo8uLOickgx2ZMRZoMye.MH6J4bH3Bx7KjK6Z6BvR7V5vQ5Q5W2', 'Иванов Иван Иванович', 'admin', '+7 (999) 111-22-33'),
(1, 'manager@techmostore.ru', '$2a$10$N9qo8uLOickgx2ZMRZoMye.MH6J4bH3Bx7KjK6Z6BvR7V5vQ5Q5W2', 'Петров Петр Петрович', 'manager', '+7 (999) 222-33-44'),
(1, 'employee@techmostore.ru', '$2a$10$N9qo8uLOickgx2ZMRZoMye.MH6J4bH3Bx7KjK6Z6BvR7V5vQ5Q5W2', 'Сидоров Сергей Сергеевич', 'employee', '+7 (999) 333-44-55');

-- Склады компании
INSERT INTO warehouses (company_id, code, name, address, description, contact_person, contact_phone) VALUES
(1, 'WH001', 'Основной склад', 'г. Москва, ул. Складская, 1', 'Главный склад компании', 'Иванов И.И.', '+7 (999) 111-22-33'),
(1, 'WH002', 'Филиал №1', 'г. Санкт-Петербург, ул. Заводская, 15', 'Склад в Санкт-Петербурге', 'Петров П.П.', '+7 (999) 222-33-44'),
(1, 'WH003', 'Производственный склад', 'г. Казань, ул. Промышленная, 7', 'Склад готовой продукции', 'Сидоров С.С.', '+7 (999) 333-44-55');

-- Права доступа пользователей
INSERT INTO user_warehouse_access (user_id, warehouse_id, can_view, can_edit, can_delete) VALUES
(1, 1, true, true, true),
(1, 2, true, true, true),
(1, 3, true, true, true),
(2, 1, true, true, false),
(2, 2, true, true, false),
(3, 1, true, false, false);

-- Категории товаров
INSERT INTO categories (company_id, code, name, description) VALUES
(1, 'ELEC', 'Электроника', 'Компьютерная техника и электроника'),
(1, 'OFFICE', 'Офисные принадлежности', 'Канцелярия и офисная техника'),
(1, 'TOOLS', 'Инструменты', 'Ручной и электроинструмент'),
(1, 'MATERIALS', 'Материалы', 'Строительные и расходные материалы');

-- Номенклатура
INSERT INTO nomenclature (company_id, code, name, category_id, type, unit, purchase_price, selling_price, min_quantity) VALUES
(1, 'NB001', 'Ноутбук Dell XPS 15', 1, 'product', 'шт', 120000.00, 150000.00, 2),
(1, 'NB002', 'Ноутбук MacBook Pro 16', 1, 'product', 'шт', 180000.00, 220000.00, 1),
(1, 'MO001', 'Компьютерная мышь Logitech MX Master 3', 1, 'product', 'шт', 8000.00, 12000.00, 10),
(1, 'KB001', 'Клавиатура механическая', 1, 'product', 'шт', 5000.00, 8000.00, 5),
(1, 'MON001', 'Монитор 27" 4K', 1, 'product', 'шт', 30000.00, 45000.00, 3),
(1, 'PN001', 'Ручка шариковая синяя', 2, 'product', 'шт', 20.00, 50.00, 100),
(1, 'PAP001', 'Бумага А4 80г/м²', 2, 'product', 'пачка', 300.00, 500.00, 20),
(1, 'HD001', 'Молоток слесарный 500г', 3, 'product', 'шт', 800.00, 1500.00, 5),
(1, 'SC001', 'Отвертка крестовая', 3, 'product', 'шт', 200.00, 400.00, 10),
(1, 'WR001', 'Провод электрический 2.5мм²', 4, 'material', 'метр', 50.00, 80.00, 100);

-- Ячейки хранения для первого склада
DO $$
DECLARE
    i INTEGER;
BEGIN
    FOR i IN 1..50 LOOP
        INSERT INTO storage_cells (warehouse_id, code, zone, aisle, rack, level, position, cell_type, max_capacity) 
        VALUES (
            1,
            'A-' || LPAD(i::TEXT, 3, '0'),
            'A',
            'A',
            'R' || (((i - 1) % 10) + 1),
            ((i - 1) / 10) % 5 + 1,
            ((i - 1) % 10) + 1,
            'shelf',
            100.00
        );
    END LOOP;
END $$;

-- Остатки товаров
INSERT INTO stock_balances (company_id, warehouse_id, storage_cell_id, nomenclature_id, quantity, average_cost) VALUES
(1, 1, 1, 1, 15.000, 120000.00),
(1, 1, 2, 2, 8.000, 180000.00),
(1, 1, 3, 3, 45.000, 8000.00),
(1, 1, 4, 4, 12.000, 5000.00),
(1, 1, 5, 5, 7.000, 30000.00);

-- Сообщение об успешной инициализации
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'База данных "warehouse_db" инициализирована';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Тестовая компания создана:';
    RAISE NOTICE '  Email: admin@techmostore.ru';
    RAISE NOTICE '  Пароль: admin123';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Тестовые пользователи (пароль: user123):';
    RAISE NOTICE '  admin@techmostore.ru - администратор';
    RAISE NOTICE '  manager@techmostore.ru - менеджер';
    RAISE NOTICE '  employee@techmostore.ru - сотрудник';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Склады: 3';
    RAISE NOTICE 'Пользователей: 3';
    RAISE NOTICE 'Товаров: 10';
    RAISE NOTICE 'Ячеек: 50';
    RAISE NOTICE '========================================';
END $$;