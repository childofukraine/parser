FROM node:21-alpine

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache chromium

RUN npm install 

COPY . . 

EXPOSE 8080

CMD ["npm", "start"]