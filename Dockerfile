# --- build stage ---
FROM node:20-alpine AS builder

# Install required build deps for Vite/Rollup
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# copy lock file for reproducible installs
COPY package*.json ./

# install deps (don’t omit optional, Vite needs binaries)
RUN npm ci

# copy all files
COPY . .

# build vite app
RUN npm run build

# --- run stage ---
FROM nginx:alpine

# optional: curl for healthcheck
RUN apk add --no-cache curl 

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -fs http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
