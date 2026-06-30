<?php

declare(strict_types=1);

namespace App;

/**
 * Autenticación basada en JWT (HS256) sin dependencias externas.
 */
class Auth
{
    private static ?array $usuarioActual = null;

    private static function secret(): string
    {
        return getenv('JWT_SECRET') ?: 'cambia-esta-clave';
    }

    private static function b64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function b64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/')) ?: '';
    }

    /**
     * Genera un token para un usuario. Vigencia por defecto: 7 días.
     */
    public static function generarToken(array $usuario, int $duracionSegundos = 604800): string
    {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $payload = [
            'sub'      => (int)$usuario['id'],
            'username' => $usuario['username'],
            'rol'      => $usuario['rol'],
            'iat'      => time(),
            'exp'      => time() + $duracionSegundos,
        ];

        $segments = [
            self::b64UrlEncode(json_encode($header, JSON_UNESCAPED_UNICODE)),
            self::b64UrlEncode(json_encode($payload, JSON_UNESCAPED_UNICODE)),
        ];
        $firma = hash_hmac('sha256', implode('.', $segments), self::secret(), true);
        $segments[] = self::b64UrlEncode($firma);

        return implode('.', $segments);
    }

    /**
     * Verifica y decodifica un token. Devuelve el payload o null si es inválido.
     */
    public static function verificarToken(string $jwt): ?array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            return null;
        }
        [$h, $p, $s] = $parts;

        $firmaEsperada = self::b64UrlEncode(
            hash_hmac('sha256', "$h.$p", self::secret(), true)
        );
        if (!hash_equals($firmaEsperada, $s)) {
            return null;
        }

        $payload = json_decode(self::b64UrlDecode($p), true);
        if (!is_array($payload)) {
            return null;
        }
        if (isset($payload['exp']) && time() >= (int)$payload['exp']) {
            return null;
        }

        return $payload;
    }

    /**
     * Obtiene el usuario actual a partir del header Authorization: Bearer <token>.
     */
    public static function usuarioActual(): ?array
    {
        if (self::$usuarioActual !== null) {
            return self::$usuarioActual ?: null;
        }

        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $auth = $headers['Authorization'] ?? $headers['authorization']
            ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');

        if (!is_string($auth) || !preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
            self::$usuarioActual = [];
            return null;
        }

        $payload = self::verificarToken(trim($m[1]));
        self::$usuarioActual = $payload ?: [];

        return $payload ?: null;
    }

    /**
     * Exige un usuario autenticado. Corta con 401 si no lo hay.
     */
    public static function requireAuth(): array
    {
        $usuario = self::usuarioActual();
        if (!$usuario) {
            Response::error('No autenticado', 401);
        }
        return $usuario;
    }

    /**
     * Exige rol admin. Corta con 401/403 si no corresponde.
     */
    public static function requireAdmin(): array
    {
        $usuario = self::requireAuth();
        if (($usuario['rol'] ?? '') !== 'admin') {
            Response::error('Acceso restringido a administradores', 403);
        }
        return $usuario;
    }
}
