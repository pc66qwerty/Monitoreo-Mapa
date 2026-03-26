FROM php:8.3-cli

# Dependencias del sistema y extensiones PHP
RUN apt-get update && apt-get install -y \
    git curl zip unzip \
    libpq-dev libzip-dev libonig-dev libxml2-dev \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql mbstring zip xml ctype \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs && apt-get clean

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

# Instalar dependencias PHP y compilar assets
# (No corremos artisan aquí porque .env no existe en build time)
RUN composer install --no-dev --optimize-autoloader \
    && npm ci \
    && npm run build \
    && rm -rf node_modules

EXPOSE 10000

# Al arrancar el contenedor: configurar, migrar y servir
CMD php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache \
    && php artisan migrate --force \
    && php artisan serve --host=0.0.0.0 --port=${PORT:-10000}
