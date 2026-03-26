FROM php:8.3-cli-alpine

# Dependencias del sistema y extensiones PHP (Alpine usa apk)
RUN apk add --no-cache \
    git curl zip unzip bash \
    postgresql-dev libzip-dev oniguruma-dev libxml2-dev \
    nodejs npm \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql mbstring zip xml ctype

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

# Instalar dependencias y compilar assets
RUN composer install --no-dev --optimize-autoloader \
    && npm install \
    && npm run build \
    && rm -rf node_modules

EXPOSE 10000

CMD php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache \
    && php artisan migrate --force \
    && php artisan serve --host=0.0.0.0 --port=${PORT:-10000}
