# 🎬 CinePedido

![Status](https://img.shields.io/badge/Status-Development-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Version](https://img.shields.io/badge/Version-1.2.0-orange)

**CinePedido** es una plataforma web moderna que permite a los usuarios solicitar sus películas favoritas en la mejor calidad (4K, 1080p, 720p). Con una interfaz elegante y un sistema de gestión robusto, conecta a los amantes del cine con el contenido que desean.

---

## ✨ Características Principales

- **🎨 Diseño Premium:** Interfaz de usuario moderna con efectos de vidrio (Glassmorphism), animaciones fluidas y modo oscuro.
- **🔐 Autenticación Segura:** Registro e inicio de sesión gestionado con **Supabase Auth**.
- **🔎 Catálogo Integrado con TMDB:**
  - Búsqueda de películas en tiempo real con autocompletado.
  - Importación automática de metadatos (título, año, póster) para administradores.
  - Catálogo visual para usuarios con filtros de "Populares" y "En Cartelera".
- **📝 Gestión de Pedidos:** Los usuarios pueden solicitar películas especificando año, calidad y preferencia de audio.
- **🛠️ Panel de Administración:**
  - **Dashboard Visual:** Métricas clave y gráficas.
  - **Gestión de Películas:** Importación desde TMDB, edición y activacion/desactivación.
  - **Gestión de Usuarios:** Control de roles y estados.
  - **Gestión de Pedidos:** Seguimiento de solicitudes (Pendiente, En Proceso, Completado).

## 🚀 Tecnologías

- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **Backend (BaaS):** [Supabase](https://supabase.com/) (Auth & Database).
- **API Externa:** [The Movie Database (TMDB)](https://www.themoviedb.org/documentation/api).
- **Tooling:** [Vite](https://vitejs.dev/) para desarrollo, [Docker](https://www.docker.com/) para despliegue.
- **Estilos:** Font Awesome, Google Fonts (Outfit).

## 📦 Instalación y Configuración

### Prerrequisitos

- [Node.js](https://nodejs.org/) (v16 o superior)
- Una cuenta en [Supabase](https://supabase.com/)
- Una API Key de [TMDB](https://www.themoviedb.org/settings/api)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/cinepedido.git
cd cinepedido
```

### 2. Configurar Credenciales

El proyecto requiere credenciales de Supabase y TMDB para funcionar correctamente.

**A. Supabase**

1. Crea un proyecto en Supabase.
2. Ejecuta el script SQL proporcionado en `docs/schema.sql` (si existe) o configura las tablas `profiles`, `orders`, y `movies`.
3. Edita el archivo `utils/supabaseClient.js`:

   ```javascript
   const supabaseUrl = 'TU_SUPABASE_URL';
   const supabaseKey = 'TU_SUPABASE_ANON_KEY';
   ```

**B. TMDB (Para imágenes y búsquedas)**

1. Obtén tu API Key (Bearer Token) de TMDB.
2. Edita el archivo `utils/tmdbClient.js`:

   ```javascript
   const TMDB_API_KEY = 'TU_TMDB_BEARER_TOKEN';
   ```

### 3. Ejecutar Localmente (Desarrollo)

1. Instala las dependencias:

    ```bash
    npm install
    ```

2. Inicia el servidor de desarrollo:

    ```bash
    npm run dev
    ```

3. Abre tu navegador en `http://localhost:5173`.

## 🐳 Despliegue con Docker

Para desplegar la aplicación en un entorno de producción o contenedorizado:

1. Asegúrate de tener **Docker** y **Docker Compose** instalados.

2. Construye y levanta los contenedores:

    ```bash
    docker-compose up -d --build
    ```

3. La aplicación estará disponible en `http://localhost:8080`.

## 📂 Estructura del Proyecto

```
/
├── admin/              # Panel de administración (HTML/JS)
├── convex/             # (Deprecado/No usado en versión actual)
├── utils/              # Clientes de API (Supabase, TMDB)
├── *.html              # Páginas principales del sitio
├── *.js                # Lógica del frontend y autenticación
├── *.css               # Estilos globales y específicos
├── Dockerfile          # Configuración de imagen Docker
└── docker-compose.yml  # Orquestación de contenedores
```

## 📄 Licencia

Distribuido bajo la licencia MIT.

---
Hecho con ❤️ para los amantes del cine.
