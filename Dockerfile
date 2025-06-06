FROM node:24-alpine

WORKDIR /app
COPY src/ .
RUN npm install

EXPOSE 3000
CMD ["node", "index.js"]