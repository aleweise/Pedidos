# 🎬 CinePedido

![Status](https://img.shields.io/badge/Status-Development-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Version](https://img.shields.io/badge/Version-1.1.0-orange)

**CinePedido** es una plataforma web moderna que permite a los usuarios solicitar sus películas favoritas en la mejor calidad (4K, 1080p, 720p). Con una interfaz elegante y un sistema de gestión robusto, conecta a los amantes del cine con el contenido que desean.

---

## ✨ Características Principales

- **🎨 Diseño Premium:** Interfaz de usuario moderna con efectos de vidrio (Glassmorphism), animaciones fluidas y modo oscuro.
- **🔐 Autenticación Segura:** Registro e inicio de sesión gestionado con **Supabase Auth**.
- **🔄 Recuperación de Contraseña:** Sistema integrado de restablecimiento de contraseña vía email.
- **📝 Gestión de Pedidos:** Los usuarios pueden solicitar películas especificando año, calidad y preferencia de audio.
- **🛠️ Panel de Administración:**
  - Gestión de **Películas**: Agregar, editar y filtrar por género/disponibilidad.
  - Gestión de **Usuarios**: Control de roles y estados.
  - Gestión de **Pedidos**: Seguimiento de solicitudes (Pendiente, Completado, etc.).
- **♿ Accesibilidad:** Componentes optimizados con etiquetas ARIA para lectores de pantalla.

## 🚀 Tecnologías

Este proyecto está construido con un stack moderno y eficiente:

- **Frontend:** HTML5, CSS3 (Vanilla con variables CSS), JavaScript (ES6+).
- **Backend & Auth:** [Supabase](https://supabase.com/).
- **Tooling:** [Vite](https://vitejs.dev/) para desarrollo local rápido.
- **Tipografía:** [Outfit](https://fonts.google.com/specimen/Outfit) (Google Fonts).
- **Iconos:** [Font Awesome](https://fontawesome.com/).

## 📦 Instalación y Configuración

Sigue estos pasos para correr el proyecto localmente:

1. **Clonar el repositorio:**

    ```bash
    git clone https://github.com/tu-usuario/cinepedido.git
    cd cinepedido
    ```

2. **Instalar dependencias:**

    ```bash
    npm install
    ```

3. **Configurar Variables de Entorno (Opcional):**
    El proyecto ya incluye la configuración de conexión en `utils/supabaseClient.js`, pero para producción deberías usar variables de entorno.

4. **Ejecutar servidor de desarrollo:**

    ```bash
    npm run dev
    ```

    Esto iniciará el servidor (usualmente en `http://localhost:5173`).

## 🐳 Docker

También puedes ejecutar la aplicación usando Docker:

1. **Construir y levantar el contenedor:**

    ```bash
    docker-compose up -d --build
    ```

2. **Acceder a la aplicación:**
    Abre tu navegador en [http://localhost:8080](http://localhost:8080).

## 📄 Licencia

Distribuido bajo la licencia MIT.

---
Hecho con ❤️ para los amantes del cine.
