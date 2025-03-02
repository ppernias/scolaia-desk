# Product Requirements Document - ScolAIA

## 1. Resumen Ejecutivo
Plataforma educativa AI-powered con:
- Sistema de autenticación con roles (Usuario/Admin)
- Chat interactivo con modelo AI
- Panel de administración
- Base de conocimientos

## 2. Stack Tecnológico

**Backend (Python):**
- FastAPI 0.109.0
- SQLAlchemy 2.0.25 + aiosqlite 0.19.0
- OpenAI API 1.10.0
- Autenticación JWT

**Frontend:**
- TypeScript 4.9.5
- Jinja2 Templates
- Sistema de assets estáticos

**Infraestructura:**
- SQLite DB
- Uvicorn ASGI

## 3. Arquitectura
```
[Browser] ↔ [FastAPI] ↔ [SQLite DB]
       |          ↳ [OpenAI API]
       ↳ [Static Assets]
```

## 4. Requerimientos Funcionales

### 4.1 Usuario
- Registro/Login con verificación email
- Chat persistente con historial
- Sistema de créditos/uso

### 4.2 Administrador
- Aprobación de usuarios
- Monitoreo de uso
- Configuración del modelo AI

## 5. Flujos Clave

### Autenticación:
1. Registro con email → Verificación → Login JWT
2. Middleware de seguridad en endpoints

### Chat:
1. Usuario envía query → Procesamiento NLP → Respuesta AI
2. Persistencia en DB + Historial

## 6. Configuración

Variables de entorno críticas:
- `OPENAI_API_KEY`
- `JWT_SECRET_KEY`
- `SMTP_CONFIG`

```bash
# Instalación
pip install -r requirements.txt
npm install
```
