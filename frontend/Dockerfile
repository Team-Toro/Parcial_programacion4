FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN cp .env.docker .env || true

RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "preview"]
