<?php

declare(strict_types=1);

/**
 * Migración/seed idempotente que se ejecuta en cada arranque del backend.
 * - Espera a que MySQL esté disponible.
 * - Crea la tabla `usuarios` si no existe.
 * - Crea el usuario admin inicial si todavía no existe.
 *
 * Es seguro ejecutarlo múltiples veces.
 */

$host = getenv('DB_HOST') ?: 'db';
$port = getenv('DB_PORT') ?: '3306';
$name = getenv('DB_NAME') ?: 'gastos';
$user = getenv('DB_USER') ?: 'gastos_user';
$pass = getenv('DB_PASS') ?: 'gastos_pass';

$adminUser = getenv('ADMIN_USERNAME') ?: 'admin';
$adminPass = getenv('ADMIN_PASSWORD') ?: 'admin.00';

$dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);

// Reintentos por si MySQL aún está iniciando.
$pdo = null;
for ($intento = 1; $intento <= 30; $intento++) {
    try {
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        break;
    } catch (PDOException $e) {
        fwrite(STDERR, "[migrate] Esperando a MySQL (intento $intento)...\n");
        sleep(2);
    }
}

if (!$pdo) {
    fwrite(STDERR, "[migrate] No se pudo conectar a MySQL. Se omite la migración.\n");
    exit(0); // No bloquear el arranque de Apache.
}

// Tabla usuarios.
$pdo->exec(
    "CREATE TABLE IF NOT EXISTS usuarios (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        username       VARCHAR(60) NOT NULL,
        password_hash  VARCHAR(255) NOT NULL,
        rol            ENUM('admin','appuser') NOT NULL DEFAULT 'appuser',
        created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_usuarios_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);

// Columnas nombre_completo y email en usuarios (para opciones futuras).
$agregarColumna = static function (PDO $pdo, string $tabla, string $columna, string $definicion): void {
    $check = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?"
    );
    $check->execute([$tabla, $columna]);
    if ((int)$check->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE `$tabla` ADD COLUMN $definicion");
        fwrite(STDOUT, "[migrate] Columna $tabla.$columna agregada.\n");
    }
};

$agregarColumna($pdo, 'usuarios', 'nombre_completo', 'nombre_completo VARCHAR(150) NULL AFTER password_hash');
$agregarColumna($pdo, 'usuarios', 'email', 'email VARCHAR(150) NULL AFTER nombre_completo');

// Índice único para email (permite múltiples NULL en MySQL).
$idxExiste = $pdo->prepare(
    "SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'uq_usuarios_email'"
);
$idxExiste->execute();
if ((int)$idxExiste->fetchColumn() === 0) {
    $pdo->exec('ALTER TABLE usuarios ADD UNIQUE KEY uq_usuarios_email (email)');
    fwrite(STDOUT, "[migrate] Índice único usuarios.email agregado.\n");
}

// Tabla gastos_fijos (plantillas recurrentes).
$pdo->exec(
    "CREATE TABLE IF NOT EXISTS gastos_fijos (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);

// Columna gasto_fijo_id en gastos (MySQL 8 no soporta ADD COLUMN IF NOT EXISTS).
$colExiste = $pdo->prepare(
    "SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gastos' AND COLUMN_NAME = 'gasto_fijo_id'"
);
$colExiste->execute();
if ((int)$colExiste->fetchColumn() === 0) {
    $pdo->exec(
        "ALTER TABLE gastos
            ADD COLUMN gasto_fijo_id INT NULL,
            ADD CONSTRAINT fk_gastos_gasto_fijo
                FOREIGN KEY (gasto_fijo_id) REFERENCES gastos_fijos(id)
                ON DELETE SET NULL ON UPDATE CASCADE,
            ADD KEY idx_gastos_gasto_fijo (gasto_fijo_id)"
    );
    fwrite(STDOUT, "[migrate] Columna gastos.gasto_fijo_id agregada.\n");
}

// Columna usuario_id en gastos (quién registró el gasto).
$colUsuarioGasto = $pdo->prepare(
    "SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gastos' AND COLUMN_NAME = 'usuario_id'"
);
$colUsuarioGasto->execute();
if ((int)$colUsuarioGasto->fetchColumn() === 0) {
    $pdo->exec(
        "ALTER TABLE gastos
            ADD COLUMN usuario_id INT NULL,
            ADD CONSTRAINT fk_gastos_usuario
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
                ON DELETE SET NULL ON UPDATE CASCADE,
            ADD KEY idx_gastos_usuario (usuario_id)"
    );
    fwrite(STDOUT, "[migrate] Columna gastos.usuario_id agregada.\n");
}

// Tabla ingresos (puede no existir en bases creadas antes de esta función).
$pdo->exec(
    "CREATE TABLE IF NOT EXISTS ingresos (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);

// Usuario admin inicial.
$stmt = $pdo->prepare('SELECT id FROM usuarios WHERE username = ?');
$stmt->execute([$adminUser]);

if (!$stmt->fetch()) {
    $hash = password_hash($adminPass, PASSWORD_BCRYPT);
    $insert = $pdo->prepare(
        'INSERT INTO usuarios (username, password_hash, rol) VALUES (?, ?, ?)'
    );
    $insert->execute([$adminUser, $hash, 'admin']);
    fwrite(STDOUT, "[migrate] Usuario admin '$adminUser' creado.\n");
} else {
    fwrite(STDOUT, "[migrate] El usuario admin '$adminUser' ya existe.\n");
}

fwrite(STDOUT, "[migrate] Migración completada.\n");
