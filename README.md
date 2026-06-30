# 💰 Control de Gastos

Aplicación para registrar y controlar gastos personales.

- **Backend:** PHP 8.2 (API REST, PDO) sobre Apache
- **Frontend:** React 18 + Vite (servido con nginx en producción)
- **Base de datos:** MySQL 8
- **Orquestación:** Docker Compose (funciona en local y en un NAS Synology)

## Funcionalidades

- **Autenticación** con dos roles: `admin` y `appuser` (tokens JWT).
- **Menú lateral (sidebar)** con opciones según el rol.
- Registro de **gastos** con: fecha, título, monto, tipo (`variable` / `fijo`), detalle y categoría.
- Registro de **ingresos** con: fecha, título, monto, detalle y el usuario que lo creó.
- **Gastos fijos** (plantillas recurrentes con título, categoría y monto esperado): aparecen como pendientes al inicio de la lista de Gastos y, al registrar el pago, se convierten en un gasto. Son recurrentes por mes.
- Gestión de **categorías** (crear, editar, eliminar). Vienen precargadas: Alimentación, Salud, Transporte, Vivienda, Entretenimiento y Otros.
- Gestión de **usuarios** (crear, editar, eliminar) — solo admin.
- Filtro de gastos por categoría y total calculado automáticamente.

### Roles y accesos

| Opción       | admin | appuser |
|--------------|:-----:|:-------:|
| Gastos       |  ✅   |   ✅    |
| Ingresos     |  ✅   |   ✅    |
| Gastos Fijos (gestión) |  ✅   |   ❌    |
| Registrar pago de gasto fijo |  ✅   |   ✅    |
| Categorías   |  ✅   |   ❌    |
| Usuarios     |  ✅   |   ❌    |

> El `appuser` puede registrar y ver gastos y elegir entre las categorías existentes, pero la gestión de categorías y usuarios queda reservada al admin.

### Usuario administrador inicial

En el **primer arranque** se crea automáticamente un usuario admin (ver `backend/migrate.php`):

- **Usuario:** `admin`
- **Contraseña:** `admin.00`

Puedes cambiar estas credenciales con `ADMIN_USERNAME` / `ADMIN_PASSWORD` en el `.env` **antes** del primer arranque. Cambia también `JWT_SECRET` por una clave larga y aleatoria.

## Estructura del proyecto

```
personal-expenses/
├── docker-compose.yml         # Orquesta db + backend + frontend
├── .env.example               # Variables de entorno (copiar a .env)
├── db/init/01-schema.sql      # Esquema y datos iniciales de MySQL
├── backend/                   # API PHP
│   ├── Dockerfile
│   ├── apache/000-default.conf
│   ├── public/index.php       # Front controller / router
│   └── src/                   # Database, Response, Controllers
└── frontend/                  # App React (Vite)
    ├── Dockerfile             # Multi-stage: build + nginx
    ├── nginx.conf             # Sirve el SPA y hace proxy de /api
    └── src/
```

## Puesta en marcha (local)

Requisitos: Docker y Docker Compose.

1. Copia las variables de entorno:

   ```bash
   cp .env.example .env
   ```

   (En Windows PowerShell: `Copy-Item .env.example .env`)

2. Edita `.env` y cambia las contraseñas por unas seguras.

3. Levanta todo:

   ```bash
   docker compose up -d --build
   ```

4. Abre la app en: **http://localhost:8080**

La primera vez, MySQL ejecuta `db/init/01-schema.sql` y crea las tablas y categorías por defecto.

Para detener:

```bash
docker compose down
```

Para borrar también los datos de la base (empezar de cero):

```bash
docker compose down -v
```

## Desarrollo del frontend (hot reload, opcional)

Si quieres desarrollar el frontend con recarga en caliente, deja el backend y la base en Docker y corre Vite local:

```bash
cd frontend
npm install
npm run dev
```

Vite levanta en `http://localhost:5173` y redirige `/api` al backend en `http://localhost:8080` (configurable con `VITE_API_PROXY`).

## Despliegue en Synology NAS

El NAS Synology con **Container Manager** (o el antiguo Docker) soporta proyectos de Docker Compose:

1. Copia toda la carpeta del proyecto al NAS (por ejemplo a `/volume1/docker/personal-expenses`) vía File Station o SSH.
2. Crea el archivo `.env` a partir de `.env.example` y ajusta las contraseñas.
   - Si el puerto `8080` o `3307` ya están en uso en el NAS, cámbialos con `APP_PORT` y `DB_EXTERNAL_PORT`.
3. En **Container Manager → Proyecto → Crear**:
   - Ruta: la carpeta donde copiaste el proyecto.
   - Fuente: `docker-compose.yml` existente.
   - Construye y arranca.
4. Accede desde `http://<IP-del-NAS>:8080`.

> Alternativamente por SSH: `cd /volume1/docker/personal-expenses && docker compose up -d --build`

Los datos de MySQL persisten en el volumen `db_data` aunque reinicies los contenedores.

## API REST

Base: `/api`. Salvo `POST /api/auth/login`, todas las rutas requieren el header
`Authorization: Bearer <token>`.

### Autenticación

| Método | Ruta              | Descripción                          |
|--------|-------------------|--------------------------------------|
| POST   | `/api/auth/login`   | Login `{ username, password }` → token |
| GET    | `/api/auth/me`      | Datos del usuario autenticado        |

### Usuarios (solo admin)

| Método | Ruta                | Descripción                          |
|--------|---------------------|--------------------------------------|
| GET    | `/api/usuarios`       | Listar usuarios                      |
| POST   | `/api/usuarios`       | Crear `{ username, password, rol }`  |
| PUT    | `/api/usuarios/{id}`  | Actualizar (password opcional)       |
| DELETE | `/api/usuarios/{id}`  | Eliminar                             |

### Categorías

| Método | Ruta                | Descripción            |
|--------|---------------------|------------------------|
| GET    | `/api/categorias`     | Listar categorías      |
| POST   | `/api/categorias`     | Crear `{ nombre }`     |
| PUT    | `/api/categorias/{id}`| Actualizar `{ nombre }`|
| DELETE | `/api/categorias/{id}`| Eliminar               |

### Gastos

| Método | Ruta              | Descripción     |
|--------|-------------------|-----------------|
| GET    | `/api/gastos`       | Listar gastos   |
| POST   | `/api/gastos`       | Crear gasto     |
| PUT    | `/api/gastos/{id}`  | Actualizar gasto|
| DELETE | `/api/gastos/{id}`  | Eliminar gasto  |

### Gastos fijos

| Método | Ruta                          | Descripción                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/api/gastos-fijos`             | Listar (incluye `pagado_actual`)     |
| POST   | `/api/gastos-fijos`             | Crear (admin)                        |
| PUT    | `/api/gastos-fijos/{id}`        | Actualizar (admin)                   |
| DELETE | `/api/gastos-fijos/{id}`        | Eliminar (admin)                     |
| POST   | `/api/gastos-fijos/{id}/pagar`  | Registrar pago → crea un gasto fijo  |

Cuerpo del pago: `{ "monto": 100.00, "fecha": "2026-06-21" }`. El título y la categoría se copian de la plantilla. `pagado_actual` indica si ya se pagó en el mes en curso.

### Ingresos

| Método | Ruta                | Descripción       |
|--------|---------------------|-------------------|
| GET    | `/api/ingresos`       | Listar ingresos   |
| POST   | `/api/ingresos`       | Crear ingreso     |
| PUT    | `/api/ingresos/{id}`  | Actualizar ingreso|
| DELETE | `/api/ingresos/{id}`  | Eliminar ingreso  |

El campo `usuario_id` se asigna automáticamente con el usuario autenticado que crea el ingreso. Cuerpo:

```json
{
  "fecha": "2026-06-21",
  "titulo": "Salario",
  "detalle": "Pago mensual",
  "monto": 3500.00
}
```

Cuerpo de un gasto:

```json
{
  "fecha": "2026-06-21",
  "titulo": "Supermercado",
  "monto": 150.50,
  "tipo": "variable",
  "detalle": "Compra semanal",
  "categoria_id": 1
}
```
