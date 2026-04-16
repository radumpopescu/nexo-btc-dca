FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package.json ./
COPY frontend/package.json ./frontend/package.json
RUN npm install
COPY frontend ./frontend
RUN npm --workspace frontend run build

FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml ./
COPY backend ./backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
RUN pip install --no-cache-dir .
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "4613"]
