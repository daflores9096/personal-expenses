<?php

declare(strict_types=1);

namespace App;

use PDO;
use PDOException;

/**
 * Conexión única (singleton) a MySQL mediante PDO.
 * Lee la configuración desde variables de entorno.
 */
class Database
{
    private static ?PDO $connection = null;

    public static function getConnection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $host = getenv('DB_HOST') ?: 'db';
        $port = getenv('DB_PORT') ?: '3306';
        $name = getenv('DB_NAME') ?: 'gastos';
        $user = getenv('DB_USER') ?: 'gastos_user';
        $pass = getenv('DB_PASS') ?: 'gastos_pass';

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $host,
            $port,
            $name
        );

        try {
            self::$connection = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'error' => 'No se pudo conectar a la base de datos',
                'detalle' => $e->getMessage(),
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        return self::$connection;
    }
}
