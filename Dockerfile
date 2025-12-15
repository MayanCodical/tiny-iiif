FROM ghcr.io/mayancodical/tiny-iiif:base 
COPY . /var/app
WORKDIR /var/app/
RUN chown -R node:node /var/app/
USER node
RUN npm i
EXPOSE 3000
CMD ["npm", "run", "dev"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=2s \
  CMD curl -s http://localhost:3000/iiif/2 | grep OK