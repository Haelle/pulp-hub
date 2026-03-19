FROM docker.io/library/nginx:alpine

RUN mkdir -p /var/www
RUN rm /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf

COPY conf /etc/nginx
COPY conf.d /etc/nginx/conf.d
COPY entrypoint.d /docker-entrypoint.d
COPY build /var/www
