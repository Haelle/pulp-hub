FROM docker.io/library/nginx:alpine

RUN mkdir -p /var/www

COPY nginx/pulphub.conf /etc/nginx/nginx.conf
COPY build /var/www

EXPOSE 80
