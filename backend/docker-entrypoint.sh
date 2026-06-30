#!/bin/sh
set -e

# Ejecuta la migración/seed (crea tabla usuarios y admin inicial) y luego
# arranca Apache en primer plano.
php /var/www/html/migrate.php || true

exec apache2-foreground
