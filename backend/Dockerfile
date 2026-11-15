# API Moon (Laravel) — image de production servie par FrankenPHP (PHP 8.3)

# 1) Dépendances PHP
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-scripts --no-autoloader --prefer-dist --ignore-platform-reqs
COPY . .
RUN composer dump-autoload --no-dev --optimize --classmap-authoritative

# 2) Image d'exécution
FROM dunglas/frankenphp:1-php8.3
RUN install-php-extensions pdo_pgsql intl zip opcache pcntl
COPY --chown=www-data:www-data --from=vendor /app /app
WORKDIR /app
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-moon.ini
# L'image tourne sans privilèges root ; le port interne 8000 n'en demande pas.
RUN mkdir -p /data/caddy /config/caddy storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
 && chown -R www-data:www-data /data/caddy /config/caddy storage bootstrap/cache
USER www-data
ENV APP_ENV=production APP_DEBUG=false LOG_CHANNEL=stderr
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD php -r "exit(@file_get_contents('http://127.0.0.1:8000/up') === false ? 1 : 0);"
CMD ["frankenphp", "php-server", "--listen", ":8000", "--root", "public/"]
