FROM node:alpine

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN npm install -g typescript

COPY . .

WORKDIR /app/src
RUN tsc
RUN npm run build
WORKDIR /app/dist

EXPOSE 4004
CMD [ "node", "index.js" ]