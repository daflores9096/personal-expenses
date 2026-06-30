<?php

declare(strict_types=1);

namespace App;

/**
 * Helpers para enviar respuestas JSON consistentes.
 */
class Response
{
    public static function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error(string $mensaje, int $status = 400, array $extra = []): void
    {
        self::json(array_merge(['error' => $mensaje], $extra), $status);
    }

    /**
     * Lee y decodifica el cuerpo JSON de la petición.
     */
    public static function body(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return [];
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
