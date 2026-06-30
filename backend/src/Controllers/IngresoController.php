<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Response;
use PDO;

class IngresoController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function index(): void
    {
        $sql = 'SELECT i.id, i.fecha, i.titulo, i.detalle, i.monto,
                       i.usuario_id, u.username AS usuario_nombre, i.created_at
                FROM ingresos i
                LEFT JOIN usuarios u ON u.id = i.usuario_id
                ORDER BY i.fecha DESC, i.id DESC';
        $stmt = $this->db->query($sql);
        Response::json($stmt->fetchAll());
    }

    public function show(int $id): void
    {
        $sql = 'SELECT i.id, i.fecha, i.titulo, i.detalle, i.monto,
                       i.usuario_id, u.username AS usuario_nombre, i.created_at
                FROM ingresos i
                LEFT JOIN usuarios u ON u.id = i.usuario_id
                WHERE i.id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $ingreso = $stmt->fetch();

        if (!$ingreso) {
            Response::error('Ingreso no encontrado', 404);
        }

        Response::json($ingreso);
    }

    public function store(): void
    {
        $data = $this->validate(Response::body());
        $data['usuario_id'] = (int)(Auth::usuarioActual()['sub'] ?? 0) ?: null;

        $stmt = $this->db->prepare(
            'INSERT INTO ingresos (fecha, titulo, detalle, monto, usuario_id)
             VALUES (:fecha, :titulo, :detalle, :monto, :usuario_id)'
        );
        $stmt->execute($data);

        $this->show((int)$this->db->lastInsertId());
    }

    public function update(int $id): void
    {
        $exists = $this->db->prepare('SELECT id FROM ingresos WHERE id = ?');
        $exists->execute([$id]);
        if (!$exists->fetch()) {
            Response::error('Ingreso no encontrado', 404);
        }

        $data = $this->validate(Response::body());
        $data['id'] = $id;

        $stmt = $this->db->prepare(
            'UPDATE ingresos
             SET fecha = :fecha, titulo = :titulo, detalle = :detalle, monto = :monto
             WHERE id = :id'
        );
        $stmt->execute($data);

        $this->show($id);
    }

    public function destroy(int $id): void
    {
        $exists = $this->db->prepare('SELECT id FROM ingresos WHERE id = ?');
        $exists->execute([$id]);
        if (!$exists->fetch()) {
            Response::error('Ingreso no encontrado', 404);
        }

        $this->db->prepare('DELETE FROM ingresos WHERE id = ?')->execute([$id]);
        Response::json(['mensaje' => 'Ingreso eliminado']);
    }

    private function validate(array $body): array
    {
        $errores = [];

        $fecha = trim((string)($body['fecha'] ?? ''));
        if ($fecha === '' || !$this->esFechaValida($fecha)) {
            $errores['fecha'] = 'La fecha es obligatoria y debe tener formato YYYY-MM-DD';
        }

        $titulo = trim((string)($body['titulo'] ?? ''));
        if ($titulo === '') {
            $errores['titulo'] = 'El título es obligatorio';
        }

        $montoRaw = $body['monto'] ?? null;
        if (!is_numeric($montoRaw) || (float)$montoRaw < 0) {
            $errores['monto'] = 'El monto debe ser un número mayor o igual a 0';
        }

        if (!empty($errores)) {
            Response::error('Datos inválidos', 422, ['campos' => $errores]);
        }

        $detalle = trim((string)($body['detalle'] ?? ''));

        return [
            'fecha'   => $fecha,
            'titulo'  => $titulo,
            'detalle' => $detalle === '' ? null : $detalle,
            'monto'   => number_format((float)$montoRaw, 2, '.', ''),
        ];
    }

    private function esFechaValida(string $fecha): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $fecha);
        return $d && $d->format('Y-m-d') === $fecha;
    }
}
