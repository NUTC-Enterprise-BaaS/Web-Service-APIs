FROM node:8.7-alpine

MAINTAINER Ci-Jie Li <cjlee8110@gmail.com>

RUN apk update && \
	apk add --no-cache git python make g++ && \
    git clone https://github.com/Ci-Jie/POC.git

WORKDIR /POC/api

RUN npm install && \
    chmod +x entrypoint.js

EXPOSE 3000

ENTRYPOINT ["node", "entrypoint.js"]
