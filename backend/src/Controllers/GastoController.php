<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Response;
use PDO;
use PDOException;

class GastoController
{
    private PDO $db;

    private const TIPOS_VALIDOS = ['variable', 'fijo'];

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function index(): void
    {
        $sql = 'SELECT g.id, g.fecha, g.titulo, g.monto, g.tipo, g.detalle,
                       g.categoria_id, c.nombre AS categoria_nombre, g.created_at
                FROM gastos g
                INNER JOIN categorias c ON c.id = g.categoria_id
                ORDER BY g.fecha DESC, g.id DESC';
        $stmt = $this->db->query($sql);
        Response::json($stmt->fetchAll());
    }

    public function show(int $id): void
    {
        $sql = 'SELECT g.id, g.fecha, g.titulo, g.monto, g.tipo, g.detalle,
                       g.categoria_id, c.nombre AS categoria_nombre, g.created_at
                FROM gastos g
                INNER JOIN categorias c ON c.id = g.categoria_id
                WHERE g.id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $gasto = $stmt->fetch();

        if (!$gasto) {
            Response::error('Gasto no encontrado', 404);
        }

        Response::json($gasto);
    }

    public function store(): void
    {
        $data = $this->validate(Response::body());

        $stmt = $this->db->prepare(
            'INSERT INTO gastos (fecha, titulo, monto, tipo, detalle, categoria_id)
             VALUES (:fecha, :titulo, :monto, :tipo, :detalle, :categoria_id)'
        );
        $stmt->execute($data);

        $this->show((int)$this->db->lastInsertId());
    }

    public function update(int $id): void
    {
        $exists = $this->db->prepare('SELECT id FROM gastos WHERE id = ?');
        $exists->execute([$id]);
        if (!$exists->fetch()) {
            Response::error('Gasto no encontrado', 404);
        }

        $data = $this->validate(Response::body());
        $data['id'] = $id;

        $stmt = $this->db->prepare(
            'UPDATE gastos
             SET fecha = :fecha, titulo = :titulo, monto = :monto,
                 tipo = :tipo, detalle = :detalle, categoria_id = :categoria_id
             WHERE id = :id'
        );
        $stmt->execute($data);

        $this->show($id);
    }

    public function destroy(int $id): void
    {
        $exists = $this->db->prepare('SELECT id FROM gastos WHERE id = ?');
        $exists->execute([$id]);
        if (!$exists->fetch()) {
            Response::error('Gasto no encontrado', 404);
        }

        $stmt = $this->db->prepare('DELETE FROM gastos WHERE id = ?');
        $stmt->execute([$id]);

        Response::json(['mensaje' => 'Gasto eliminado'], 200);
    }

    /**
     * Valida y normaliza los datos de entrada de un gasto.
     * Devuelve un arreglo listo para usar en el prepared statement.
     */
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

        $tipo = trim((string)($body['tipo'] ?? 'variable'));
        if (!in_array($tipo, self::TIPOS_VALIDOS, true)) {
            $errores['tipo'] = "El tipo debe ser 'variable' o 'fijo'";
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

        if (!empty($errores)) {
            Response::error('Datos inválidos', 422, ['campos' => $errores]);
        }

        $detalle = trim((string)($body['detalle'] ?? ''));

        return [
            'fecha'        => $fecha,
            'titulo'       => $titulo,
            'monto'        => number_format((float)$montoRaw, 2, '.', ''),
            'tipo'         => $tipo,
            'detalle'      => $detalle === '' ? null : $detalle,
            'categoria_id' => (int)$categoriaId,
        ];
    }

    private function esFechaValida(string $fecha): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $fecha);
        return $d && $d->format('Y-m-d') === $fecha;
    }
}
