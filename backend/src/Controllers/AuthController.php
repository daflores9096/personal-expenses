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
            'SELECT id, username, password_hash, rol FROM usuarios WHERE username = ?'
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
                'id'       => (int)$usuario['id'],
                'username' => $usuario['username'],
                'rol'      => $usuario['rol'],
            ],
        ]);
    }

    /**
     * GET /auth/me  -> datos del usuario autenticado
     */
    public function me(): void
    {
        $payload = Auth::requireAuth();
        Response::json([
            'id'       => (int)$payload['sub'],
            'username' => $payload['username'],
            'rol'      => $payload['rol'],
        ]);
    }
}
