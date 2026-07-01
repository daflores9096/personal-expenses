#!/bin/sh
set -e

# Espera a MySQL, ejecuta migración/seed y luego arranca Apache.
php /var/www/html/wait-for-db.php
php /var/www/html/migrate.php || true

exec apache2-foreground
