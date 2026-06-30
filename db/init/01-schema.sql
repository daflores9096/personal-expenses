-- ==========================================================
-- Esquema de base de datos para la app de control de gastos
-- Este script se ejecuta automáticamente la PRIMERA vez que
-- se crea el contenedor de MySQL (carpeta docker-entrypoint-initdb.d)
-- ==========================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ----------------------------------------------------------
-- Tabla de usuarios (roles: admin / appuser)
-- El usuario admin inicial lo crea el backend en el arranque
-- (ver backend/migrate.php) para hashear la contraseña con PHP.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(60) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(150) NULL,
    email           VARCHAR(150) NULL,
    rol             ENUM('admin','appuser') NOT NULL DEFAULT 'appuser',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_usuarios_username (username),
    UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Tabla de categorías de gasto
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_categorias_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Tabla de gastos fijos (plantillas recurrentes)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS gastos_fijos (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    titulo          VARCHAR(150) NOT NULL,
    categoria_id    INT NOT NULL,
    monto_esperado  DECIMAL(12,2) NOT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gastos_fijos_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    KEY idx_gastos_fijos_categoria (categoria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Tabla de gastos
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS gastos (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    fecha         DATE NOT NULL,
    titulo        VARCHAR(150) NOT NULL,
    monto         DECIMAL(12,2) NOT NULL,
    tipo          ENUM('variable','fijo') NOT NULL DEFAULT 'variable',
    detalle       TEXT NULL,
    categoria_id  INT NOT NULL,
    gasto_fijo_id INT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gastos_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_gastos_gasto_fijo
        FOREIGN KEY (gasto_fijo_id) REFERENCES gastos_fijos(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    KEY idx_gastos_fecha (fecha),
    KEY idx_gastos_categoria (categoria_id),
    KEY idx_gastos_gasto_fijo (gasto_fijo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Tabla de ingresos
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingresos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    fecha       DATE NOT NULL,
    titulo      VARCHAR(150) NOT NULL,
    detalle     TEXT NULL,
    monto       DECIMAL(12,2) NOT NULL,
    usuario_id  INT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ingresos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    KEY idx_ingresos_fecha (fecha),
    KEY idx_ingresos_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Categorías por defecto
-- ----------------------------------------------------------
INSERT INTO categorias (nombre) VALUES
    ('Alimentación'),
    ('Salud'),
    ('Transporte'),
    ('Vivienda'),
    ('Entretenimiento'),
    ('Otros')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);
