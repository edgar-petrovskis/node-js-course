# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN corepack enable && corepack prepare yarn@4.12.0 --activate
RUN yarn install --immutable

FROM deps AS build
WORKDIR /app
COPY . .
RUN yarn build

FROM deps AS dev
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["yarn", "start:dev"]

FROM deps AS prod-deps
WORKDIR /app
RUN yarn workspaces focus -A --production

FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN corepack enable && corepack prepare yarn@4.12.0 --activate
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/interfaces/graphql/schema.graphql ./dist/src/interfaces/graphql/schema.graphql
USER node
EXPOSE 3000
CMD ["node", "dist/src/main.js"]

FROM gcr.io/distroless/nodejs22-debian12:nonroot AS prod-distroless
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=nonroot:nonroot --from=prod /app/package.json ./package.json
COPY --chown=nonroot:nonroot --from=prod /app/node_modules ./node_modules
COPY --chown=nonroot:nonroot --from=prod /app/dist ./dist
EXPOSE 3000
CMD ["dist/src/main.js"]
