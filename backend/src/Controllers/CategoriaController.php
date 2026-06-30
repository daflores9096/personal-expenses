<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Response;
use PDO;
use PDOException;

class CategoriaController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function index(): void
    {
        $stmt = $this->db->query('SELECT id, nombre, created_at FROM categorias ORDER BY nombre ASC');
        Response::json($stmt->fetchAll());
    }

    public function show(int $id): void
    {
        $stmt = $this->db->prepare('SELECT id, nombre, created_at FROM categorias WHERE id = ?');
        $stmt->execute([$id]);
        $categoria = $stmt->fetch();

        if (!$categoria) {
            Response::error('Categoría no encontrada', 404);
        }

        Response::json($categoria);
    }

    public function store(): void
    {
        $body = Response::body();
        $nombre = trim((string)($body['nombre'] ?? ''));

        if ($nombre === '') {
            Response::error('El nombre de la categoría es obligatorio', 422);
        }

        try {
            $stmt = $this->db->prepare('INSERT INTO categorias (nombre) VALUES (?)');
            $stmt->execute([$nombre]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                Response::error('Ya existe una categoría con ese nombre', 409);
            }
            throw $e;
        }

        $this->show((int)$this->db->lastInsertId());
    }

    public function update(int $id): void
    {
        $body = Response::body();
        $nombre = trim((string)($body['nombre'] ?? ''));

        if ($nombre === '') {
            Response::error('El nombre de la categoría es obligatorio', 422);
        }

        $exists = $this->db->prepare('SELECT id FROM categorias WHERE id = ?');
        $exists->execute([$id]);
        if (!$exists->fetch()) {
            Response::error('Categoría no encontrada', 404);
        }

        try {
            $stmt = $this->db->prepare('UPDATE categorias SET nombre = ? WHERE id = ?');
            $stmt->execute([$nombre, $id]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                Response::error('Ya existe una categoría con ese nombre', 409);
            }
            throw $e;
        }

        $this->show($id);
    }

    public function destroy(int $id): void
    {
        $exists = $this->db->prepare('SELECT id FROM categorias WHERE id = ?');
        $exists->execute([$id]);
        if (!$exists->fetch()) {
            Response::error('Categoría no encontrada', 404);
        }

        try {
            $stmt = $this->db->prepare('DELETE FROM categorias WHERE id = ?');
            $stmt->execute([$id]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                Response::error('No se puede eliminar: la categoría tiene gastos asociados', 409);
            }
            throw $e;
        }

        Response::json(['mensaje' => 'Categoría eliminada'], 200);
    }
}
