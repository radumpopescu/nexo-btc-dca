FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY frontend/package.json ./frontend/package.json
RUN npm install
COPY frontend ./frontend
CMD ["npm", "--workspace", "frontend", "run", "dev", "--", "--host", "0.0.0.0", "--port", "4173"]
