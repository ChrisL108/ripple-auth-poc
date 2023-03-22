FROM node:16.15.1-alpine AS release

# RUN apk add --update bash build-base curl wget

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3001

RUN npm run build

CMD ["npm", "run", "serve"]
# CMD ["npm", "start"]
