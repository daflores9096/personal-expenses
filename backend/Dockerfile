FROM php:8.2-apache

# Extensiones de PHP necesarias para MySQL
RUN docker-php-ext-install pdo pdo_mysql \
    && a2enmod rewrite

# Configuración de Apache (DocumentRoot -> public + reescritura a index.php)
COPY apache/000-default.conf /etc/apache2/sites-available/000-default.conf

# Código de la aplicación
COPY . /var/www/html/

# Entrypoint (corre la migración/seed y luego Apache)
RUN cp /var/www/html/docker-entrypoint.sh /usr/local/bin/app-entrypoint.sh \
    && sed -i 's/\r$//' /usr/local/bin/app-entrypoint.sh \
    && chmod +x /usr/local/bin/app-entrypoint.sh

# Permisos
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
    CMD php -r "exit(@file_get_contents('http://localhost/health') ? 0 : 1);"

CMD ["app-entrypoint.sh"]
