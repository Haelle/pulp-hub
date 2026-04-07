FROM docker.io/library/nginx:alpine

RUN apk add --no-cache gettext \
 && mkdir -p /var/www

COPY nginx/pulphub.conf /etc/nginx/nginx.conf
COPY build /var/www
COPY docker/config.js.tpl /var/www/config.js.tpl
COPY docker/40-pulphub-config.sh /docker-entrypoint.d/40-pulphub-config.sh
RUN chmod +x /docker-entrypoint.d/40-pulphub-config.sh

EXPOSE 80
