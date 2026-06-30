<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Response;
use PDO;
use PDOException;

/**
 * Gestión de usuarios. Todas las acciones requieren rol admin.
 */
class UsuarioController
{
    private PDO $db;

    private const ROLES_VALIDOS = ['admin', 'appuser'];

    public function __construct()
    {
        $this->db = Database::getConnection();
        Auth::requireAdmin();
    }

    public function index(): void
    {
        $stmt = $this->db->query(
            'SELECT id, username, nombre_completo, email, rol, created_at FROM usuarios ORDER BY username ASC'
        );
        Response::json($stmt->fetchAll());
    }

    public function show(int $id): void
    {
        $stmt = $this->db->prepare('SELECT id, username, nombre_completo, email, rol, created_at FROM usuarios WHERE id = ?');
        $stmt->execute([$id]);
        $usuario = $stmt->fetch();
        if (!$usuario) {
            Response::error('Usuario no encontrado', 404);
        }
        Response::json($usuario);
    }

    public function store(): void
    {
        $body = Response::body();
        $username = trim((string)($body['username'] ?? ''));
        $password = (string)($body['password'] ?? '');
        $rol = trim((string)($body['rol'] ?? 'appuser'));
        $nombreCompleto = trim((string)($body['nombre_completo'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));

        $errores = [];
        if ($username === '') {
            $errores['username'] = 'El nombre de usuario es obligatorio';
        }
        if (strlen($password) < 5) {
            $errores['password'] = 'La contraseña debe tener al menos 5 caracteres';
        }
        if (!in_array($rol, self::ROLES_VALIDOS, true)) {
            $errores['rol'] = "El rol debe ser 'admin' o 'appuser'";
        }
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errores['email'] = 'El correo electrónico no es válido';
        }
        if ($errores) {
            Response::error('Datos inválidos', 422, ['campos' => $errores]);
        }

        try {
            $stmt = $this->db->prepare(
                'INSERT INTO usuarios (username, password_hash, nombre_completo, email, rol) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $username,
                password_hash($password, PASSWORD_BCRYPT),
                $nombreCompleto !== '' ? $nombreCompleto : null,
                $email !== '' ? $email : null,
                $rol,
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                Response::error($this->mensajeDuplicado($e), 409);
            }
            throw $e;
        }

        $this->show((int)$this->db->lastInsertId());
    }

    public function update(int $id): void
    {
        $stmt = $this->db->prepare('SELECT id, rol FROM usuarios WHERE id = ?');
        $stmt->execute([$id]);
        $actual = $stmt->fetch();
        if (!$actual) {
            Response::error('Usuario no encontrado', 404);
        }

        $body = Response::body();
        $username = trim((string)($body['username'] ?? ''));
        $rol = trim((string)($body['rol'] ?? ''));
        $password = (string)($body['password'] ?? '');
        $nombreCompleto = trim((string)($body['nombre_completo'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));

        $errores = [];
        if ($username === '') {
            $errores['username'] = 'El nombre de usuario es obligatorio';
        }
        if ($rol !== '' && !in_array($rol, self::ROLES_VALIDOS, true)) {
            $errores['rol'] = "El rol debe ser 'admin' o 'appuser'";
        }
        if ($password !== '' && strlen($password) < 5) {
            $errores['password'] = 'La contraseña debe tener al menos 5 caracteres';
        }
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errores['email'] = 'El correo electrónico no es válido';
        }
        if ($errores) {
            Response::error('Datos inválidos', 422, ['campos' => $errores]);
        }

        $rolFinal = $rol !== '' ? $rol : $actual['rol'];

        // No permitir degradar al último admin.
        if ($actual['rol'] === 'admin' && $rolFinal !== 'admin' && $this->contarAdmins() <= 1) {
            Response::error('No se puede quitar el rol admin al último administrador', 409);
        }

        $nombreFinal = $nombreCompleto !== '' ? $nombreCompleto : null;
        $emailFinal = $email !== '' ? $email : null;

        try {
            if ($password !== '') {
                $sql = 'UPDATE usuarios SET username = ?, rol = ?, nombre_completo = ?, email = ?, password_hash = ? WHERE id = ?';
                $params = [$username, $rolFinal, $nombreFinal, $emailFinal, password_hash($password, PASSWORD_BCRYPT), $id];
            } else {
                $sql = 'UPDATE usuarios SET username = ?, rol = ?, nombre_completo = ?, email = ? WHERE id = ?';
                $params = [$username, $rolFinal, $nombreFinal, $emailFinal, $id];
            }
            $this->db->prepare($sql)->execute($params);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                Response::error($this->mensajeDuplicado($e), 409);
            }
            throw $e;
        }

        $this->show($id);
    }

    public function destroy(int $id): void
    {
        $actorId = (int)(Auth::usuarioActual()['sub'] ?? 0);
        if ($id === $actorId) {
            Response::error('No puedes eliminar tu propio usuario', 409);
        }

        $stmt = $this->db->prepare('SELECT id, rol FROM usuarios WHERE id = ?');
        $stmt->execute([$id]);
        $usuario = $stmt->fetch();
        if (!$usuario) {
            Response::error('Usuario no encontrado', 404);
        }

        if ($usuario['rol'] === 'admin' && $this->contarAdmins() <= 1) {
            Response::error('No se puede eliminar al último administrador', 409);
        }

        $this->db->prepare('DELETE FROM usuarios WHERE id = ?')->execute([$id]);
        Response::json(['mensaje' => 'Usuario eliminado']);
    }

    private function contarAdmins(): int
    {
        return (int)$this->db->query("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin'")
            ->fetchColumn();
    }

    private function mensajeDuplicado(PDOException $e): string
    {
        $msg = $e->getMessage();
        if (stripos($msg, 'uq_usuarios_email') !== false || stripos($msg, 'email') !== false) {
            return 'Ya existe un usuario con ese correo electrónico';
        }
        return 'Ya existe un usuario con ese nombre';
    }
}
