<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\DatabaseBackup;
use App\Response;

/**
 * Respaldos completos de la base de datos (solo admin).
 */
class RespaldoController
{
    private const MAX_BYTES = 52_428_800; // 50 MB
    private const CONFIRMACION = 'RESTAURAR';

    public function __construct()
    {
        Auth::requireAdmin();
    }

    public function descargar(): void
    {
        $pdo = Database::getConnection();
        $sql = DatabaseBackup::export($pdo);
        $nombre = 'respaldo-gastos-' . date('Y-m-d_His') . '.sql';

        header('Content-Type: application/sql; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $nombre . '"');
        header('Content-Length: ' . strlen($sql));
        echo $sql;
        exit;
    }

    public function restaurar(): void
    {
        $confirmacion = trim((string)($_POST['confirmacion'] ?? ''));
        if ($confirmacion !== self::CONFIRMACION) {
            Response::error('Debes escribir RESTAURAR para confirmar', 422);
        }

        if (!isset($_FILES['archivo']) || !is_array($_FILES['archivo'])) {
            Response::error('No se recibió ningún archivo', 422);
        }

        $archivo = $_FILES['archivo'];
        if (($archivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::error('Error al subir el archivo', 422);
        }

        if (($archivo['size'] ?? 0) > self::MAX_BYTES) {
            Response::error('El archivo supera el tamaño máximo permitido (50 MB)', 422);
        }

        $nombre = strtolower((string)($archivo['name'] ?? ''));
        if (!str_ends_with($nombre, '.sql')) {
            Response::error('Solo se permiten archivos .sql', 422);
        }

        $contenido = file_get_contents((string)$archivo['tmp_name']);
        if ($contenido === false) {
            Response::error('No se pudo leer el archivo subido', 500);
        }

        try {
            $pdo = Database::getConnection();
            DatabaseBackup::restore($pdo, $contenido);
        } catch (\Throwable $e) {
            Response::error('No se pudo restaurar el respaldo', 500, ['detalle' => $e->getMessage()]);
        }

        Response::json(['mensaje' => 'Base de datos restaurada correctamente']);
    }
}
