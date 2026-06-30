<?php

declare(strict_types=1);

use App\Auth;
use App\Response;
use App\Controllers\AuthController;
use App\Controllers\CategoriaController;
use App\Controllers\GastoController;
use App\Controllers\GastoFijoController;
use App\Controllers\IngresoController;
use App\Controllers\RespaldoController;
use App\Controllers\UsuarioController;

/**
 * Front controller / router de la API.
 * Todas las peticiones a /api/* pasan por aquí.
 */

// Autoload manual de las clases del proyecto (sin Composer).
spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/../src/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($path)) {
        require $path;
    }
});

// CORS (útil cuando el frontend corre en otro origen durante el desarrollo).
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Manejo global de excepciones no controladas.
set_exception_handler(static function (\Throwable $e): void {
    Response::error('Error interno del servidor', 500, ['detalle' => $e->getMessage()]);
});

// Normalizar la ruta: quitar query string y el prefijo /api.
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$path = preg_replace('#^/api#', '', $uri) ?: '/';
$path = '/' . trim($path, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Healthcheck simple.
if ($path === '/' || $path === '/health') {
    Response::json(['status' => 'ok', 'servicio' => 'API de control de gastos']);
}

// Segmentos de ruta: [recurso, id?]
$segments = array_values(array_filter(explode('/', $path)));
$recurso = $segments[0] ?? null;
$id = isset($segments[1]) && ctype_digit($segments[1]) ? (int)$segments[1] : null;

switch ($recurso) {
    case 'auth':
        $accion = $segments[1] ?? null;
        $controller = new AuthController();
        if ($accion === 'login' && $method === 'POST') {
            $controller->login();
        } elseif ($accion === 'me' && $method === 'GET') {
            $controller->me();
        } else {
            Response::error('Ruta no encontrada', 404);
        }
        break;

    case 'usuarios':
        // El propio controlador exige rol admin en su constructor.
        $controller = new UsuarioController();
        if ($id === null) {
            match ($method) {
                'GET'  => $controller->index(),
                'POST' => $controller->store(),
                default => Response::error('Método no permitido', 405),
            };
        } else {
            match ($method) {
                'GET'    => $controller->show($id),
                'PUT'    => $controller->update($id),
                'DELETE' => $controller->destroy($id),
                default  => Response::error('Método no permitido', 405),
            };
        }
        break;

    case 'categorias':
        // Leer: cualquier usuario autenticado. Modificar: solo admin.
        $controller = new CategoriaController();
        if ($id === null) {
            match ($method) {
                'GET'  => (function () use ($controller) { Auth::requireAuth(); $controller->index(); })(),
                'POST' => (function () use ($controller) { Auth::requireAdmin(); $controller->store(); })(),
                default => Response::error('Método no permitido', 405),
            };
        } else {
            match ($method) {
                'GET'    => (function () use ($controller, $id) { Auth::requireAuth(); $controller->show($id); })(),
                'PUT'    => (function () use ($controller, $id) { Auth::requireAdmin(); $controller->update($id); })(),
                'DELETE' => (function () use ($controller, $id) { Auth::requireAdmin(); $controller->destroy($id); })(),
                default  => Response::error('Método no permitido', 405),
            };
        }
        break;

    case 'gastos':
        Auth::requireAuth();
        $controller = new GastoController();
        if ($id === null) {
            match ($method) {
                'GET'  => $controller->index(),
                'POST' => $controller->store(),
                default => Response::error('Método no permitido', 405),
            };
        } else {
            match ($method) {
                'GET'    => $controller->show($id),
                'PUT'    => $controller->update($id),
                'DELETE' => $controller->destroy($id),
                default  => Response::error('Método no permitido', 405),
            };
        }
        break;

    case 'gastos-fijos':
        $controller = new GastoFijoController();
        $accion = $segments[2] ?? null;
        if ($id !== null && $accion === 'pagar' && $method === 'POST') {
            // Registrar pago: cualquier usuario autenticado.
            Auth::requireAuth();
            $controller->pagar($id);
        } elseif ($id === null) {
            match ($method) {
                'GET'  => (function () use ($controller) { Auth::requireAuth(); $controller->index(); })(),
                'POST' => (function () use ($controller) { Auth::requireAdmin(); $controller->store(); })(),
                default => Response::error('Método no permitido', 405),
            };
        } else {
            match ($method) {
                'GET'    => (function () use ($controller, $id) { Auth::requireAuth(); $controller->show($id); })(),
                'PUT'    => (function () use ($controller, $id) { Auth::requireAdmin(); $controller->update($id); })(),
                'DELETE' => (function () use ($controller, $id) { Auth::requireAdmin(); $controller->destroy($id); })(),
                default  => Response::error('Método no permitido', 405),
            };
        }
        break;

    case 'ingresos':
        Auth::requireAuth();
        $controller = new IngresoController();
        if ($id === null) {
            match ($method) {
                'GET'  => $controller->index(),
                'POST' => $controller->store(),
                default => Response::error('Método no permitido', 405),
            };
        } else {
            match ($method) {
                'GET'    => $controller->show($id),
                'PUT'    => $controller->update($id),
                'DELETE' => $controller->destroy($id),
                default  => Response::error('Método no permitido', 405),
            };
        }
        break;

    case 'respaldos':
        $controller = new RespaldoController();
        $accion = $segments[1] ?? null;
        if ($accion === 'descargar' && $method === 'GET') {
            $controller->descargar();
        } elseif ($accion === 'restaurar' && $method === 'POST') {
            $controller->restaurar();
        } else {
            Response::error('Ruta no encontrada', 404);
        }
        break;

    default:
        Response::error('Ruta no encontrada', 404);
}
