FROM node:22.13.0-alpine AS builder

RUN corepack enable

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile --non-interactive

COPY . .

RUN yarn run build

FROM node:22.13.0-alpine AS master

ARG NODE_ENV=production
ARG LAST_COMMIT=none
ARG PACKAGE_VERSION=unknown

ENV NODE_ENV=${NODE_ENV}
ENV LAST_COMMIT=${LAST_COMMIT}
ENV PACKAGE_VERSION=${PACKAGE_VERSION}
# ENV NODE_TLS_REJECT_UNAUTHORIZED='0' 


WORKDIR /usr/src/app

RUN corepack enable

COPY --from=builder /usr/src/app/ .

USER node
EXPOSE 3000

CMD ["node", "dist/main.js"]
