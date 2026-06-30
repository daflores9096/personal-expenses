<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Response;
use PDO;

class AuthController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * POST /auth/login  -> { username, password }
     */
    public function login(): void
    {
        $body = Response::body();
        $username = trim((string)($body['username'] ?? ''));
        $password = (string)($body['password'] ?? '');

        if ($username === '' || $password === '') {
            Response::error('Usuario y contraseña son obligatorios', 422);
        }

        $stmt = $this->db->prepare(
            'SELECT id, username, password_hash, nombre_completo, rol FROM usuarios WHERE username = ?'
        );
        $stmt->execute([$username]);
        $usuario = $stmt->fetch();

        if (!$usuario || !password_verify($password, $usuario['password_hash'])) {
            Response::error('Credenciales inválidas', 401);
        }

        $token = Auth::generarToken($usuario);

        Response::json([
            'token' => $token,
            'usuario' => [
                'id'              => (int)$usuario['id'],
                'username'        => $usuario['username'],
                'nombre_completo' => $usuario['nombre_completo'],
                'rol'             => $usuario['rol'],
            ],
        ]);
    }

    /**
     * GET /auth/me  -> datos del usuario autenticado
     */
    public function me(): void
    {
        $payload = Auth::requireAuth();
        $stmt = $this->db->prepare(
            'SELECT id, username, nombre_completo, rol FROM usuarios WHERE id = ?'
        );
        $stmt->execute([(int)$payload['sub']]);
        $usuario = $stmt->fetch();

        if (!$usuario) {
            Response::error('Usuario no encontrado', 404);
        }

        Response::json([
            'id'              => (int)$usuario['id'],
            'username'        => $usuario['username'],
            'nombre_completo' => $usuario['nombre_completo'],
            'rol'             => $usuario['rol'],
        ]);
    }
}
