<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Response;
use PDO;

class GastoFijoController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function index(): void
    {
        [$desde, $hasta] = $this->rangoFechas();

        $sql = "SELECT gf.id, gf.titulo, gf.categoria_id, c.nombre AS categoria_nombre,
                       gf.monto_esperado, gf.activo, gf.created_at,
                       (SELECT g.id FROM gastos g
                          WHERE g.gasto_fijo_id = gf.id
                            AND g.fecha >= :desde
                            AND g.fecha <= :hasta
                          ORDER BY g.id DESC LIMIT 1) AS gasto_actual_id
                FROM gastos_fijos gf
                INNER JOIN categorias c ON c.id = gf.categoria_id
                WHERE gf.activo = 1
                ORDER BY gf.titulo ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['desde' => $desde, 'hasta' => $hasta]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            $row['pagado_actual'] = $row['gasto_actual_id'] !== null;
        }
        unset($row);

        Response::json($rows);
    }

    /** Rango de fechas para pendientes: query params o mes actual por defecto. */
    private function rangoFechas(): array
    {
        $desde = trim((string)($_GET['desde'] ?? ''));
        $hasta = trim((string)($_GET['hasta'] ?? ''));

        if ($desde === '' || $hasta === '') {
            return [date('Y-m-01'), date('Y-m-d')];
        }

        if (!$this->fechaValida($desde) || !$this->fechaValida($hasta)) {
            Response::error('Fechas inválidas (use YYYY-MM-DD)', 422);
        }

        if ($desde > $hasta) {
            Response::error('La fecha "desde" no puede ser posterior a "hasta"', 422);
        }

        return [$desde, $hasta];
    }

    private function fechaValida(string $fecha): bool
    {
        return (bool)preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha);
    }

    public function show(int $id): void
    {
        $stmt = $this->db->prepare(
            'SELECT gf.id, gf.titulo, gf.categoria_id, c.nombre AS categoria_nombre,
                    gf.monto_esperado, gf.activo, gf.created_at
             FROM gastos_fijos gf
             INNER JOIN categorias c ON c.id = gf.categoria_id
             WHERE gf.id = ?'
        );
        $stmt->execute([$id]);
        $gf = $stmt->fetch();
        if (!$gf) {
            Response::error('Gasto fijo no encontrado', 404);
        }
        Response::json($gf);
    }

    public function store(): void
    {
        $data = $this->validate(Response::body());
        $stmt = $this->db->prepare(
            'INSERT INTO gastos_fijos (titulo, categoria_id, monto_esperado)
             VALUES (:titulo, :categoria_id, :monto_esperado)'
        );
        $stmt->execute($data);
        $this->show((int)$this->db->lastInsertId());
    }

    public function update(int $id): void
    {
        $exists = $this->db->prepare('SELECT id FROM gastos_fijos WHERE id = ?');
        $exists->execute([$id]);
        if (!$exists->fetch()) {
            Response::error('Gasto fijo no encontrado', 404);
        }

        $data = $this->validate(Response::body());
        $data['id'] = $id;
        $stmt = $this->db->prepare(
            'UPDATE gastos_fijos
             SET titulo = :titulo, categoria_id = :categoria_id, monto_esperado = :monto_esperado
             WHERE id = :id'
        );
        $stmt->execute($data);
        $this->show($id);
    }

    public function destroy(int $id): void
    {
        $exists = $this->db->prepare('SELECT id FROM gastos_fijos WHERE id = ?');
        $exists->execute([$id]);
        if (!$exists->fetch()) {
            Response::error('Gasto fijo no encontrado', 404);
        }
        // Los gastos ya pagados se conservan (FK ON DELETE SET NULL).
        $this->db->prepare('DELETE FROM gastos_fijos WHERE id = ?')->execute([$id]);
        Response::json(['mensaje' => 'Gasto fijo eliminado']);
    }

    /**
     * Registra el pago de un gasto fijo creando un gasto real (tipo 'fijo').
     */
    public function pagar(int $id): void
    {
        $stmt = $this->db->prepare(
            'SELECT id, titulo, categoria_id FROM gastos_fijos WHERE id = ? AND activo = 1'
        );
        $stmt->execute([$id]);
        $gf = $stmt->fetch();
        if (!$gf) {
            Response::error('Gasto fijo no encontrado', 404);
        }

        $body = Response::body();
        $errores = [];

        $fecha = trim((string)($body['fecha'] ?? ''));
        if ($fecha === '' || !$this->esFechaValida($fecha)) {
            $errores['fecha'] = 'La fecha es obligatoria y debe tener formato YYYY-MM-DD';
        }

        $montoRaw = $body['monto'] ?? null;
        if (!is_numeric($montoRaw) || (float)$montoRaw < 0) {
            $errores['monto'] = 'El monto debe ser un número mayor o igual a 0';
        }

        if ($errores) {
            Response::error('Datos inválidos', 422, ['campos' => $errores]);
        }

        $detalle = trim((string)($body['detalle'] ?? ''));

        $usuarioId = (int)(Auth::usuarioActual()['sub'] ?? 0) ?: null;

        $insert = $this->db->prepare(
            'INSERT INTO gastos (fecha, titulo, monto, tipo, detalle, categoria_id, gasto_fijo_id, usuario_id)
             VALUES (:fecha, :titulo, :monto, :tipo, :detalle, :categoria_id, :gasto_fijo_id, :usuario_id)'
        );
        $insert->execute([
            'fecha'         => $fecha,
            'titulo'        => $gf['titulo'],
            'monto'         => number_format((float)$montoRaw, 2, '.', ''),
            'tipo'          => 'fijo',
            'detalle'       => $detalle === '' ? null : $detalle,
            'categoria_id'  => (int)$gf['categoria_id'],
            'gasto_fijo_id' => (int)$gf['id'],
            'usuario_id'    => $usuarioId,
        ]);

        $gastoId = (int)$this->db->lastInsertId();
        $g = $this->db->prepare(
            'SELECT g.id, g.fecha, g.titulo, g.monto, g.tipo, g.detalle,
                    g.categoria_id, c.nombre AS categoria_nombre, g.gasto_fijo_id,
                    g.usuario_id, u.username AS usuario_nombre, g.created_at
             FROM gastos g
             INNER JOIN categorias c ON c.id = g.categoria_id
             LEFT JOIN usuarios u ON u.id = g.usuario_id
             WHERE g.id = ?'
        );
        $g->execute([$gastoId]);
        Response::json($g->fetch(), 201);
    }

    private function validate(array $body): array
    {
        $errores = [];

        $titulo = trim((string)($body['titulo'] ?? ''));
        if ($titulo === '') {
            $errores['titulo'] = 'El título es obligatorio';
        }

        $montoRaw = $body['monto_esperado'] ?? null;
        if (!is_numeric($montoRaw) || (float)$montoRaw < 0) {
            $errores['monto_esperado'] = 'El monto esperado debe ser un número mayor o igual a 0';
        }

        $categoriaId = $body['categoria_id'] ?? null;
        if (!is_numeric($categoriaId) || (int)$categoriaId <= 0) {
            $errores['categoria_id'] = 'La categoría es obligatoria';
        } else {
            $chk = $this->db->prepare('SELECT id FROM categorias WHERE id = ?');
            $chk->execute([(int)$categoriaId]);
            if (!$chk->fetch()) {
                $errores['categoria_id'] = 'La categoría seleccionada no existe';
            }
        }

        if ($errores) {
            Response::error('Datos inválidos', 422, ['campos' => $errores]);
        }

        return [
            'titulo'         => $titulo,
            'categoria_id'   => (int)$categoriaId,
            'monto_esperado' => number_format((float)$montoRaw, 2, '.', ''),
        ];
    }

    private function esFechaValida(string $fecha): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $fecha);
        return $d && $d->format('Y-m-d') === $fecha;
    }
}
