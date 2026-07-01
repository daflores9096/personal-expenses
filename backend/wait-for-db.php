<?php

declare(strict_types=1);

/**
 * Espera a que MySQL acepte conexiones antes de migrar o arrancar Apache.
 * Evita 502 en el login cuando el backend aún no está listo (común en NAS).
 */

$host = getenv('DB_HOST') ?: 'db';
$port = getenv('DB_PORT') ?: '3306';
$name = getenv('DB_NAME') ?: 'gastos';
$user = getenv('DB_USER') ?: 'gastos_user';
$pass = getenv('DB_PASS') ?: 'gastos_pass';

$dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);
$maxIntentos = 90;

for ($intento = 1; $intento <= $maxIntentos; $intento++) {
    try {
        new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        fwrite(STDOUT, "[wait-for-db] MySQL disponible (intento $intento).\n");
        exit(0);
    } catch (PDOException) {
        fwrite(STDERR, "[wait-for-db] Esperando a MySQL (intento $intento/$maxIntentos)...\n");
        sleep(2);
    }
}

fwrite(STDERR, "[wait-for-db] MySQL no respondió a tiempo.\n");
exit(1);
