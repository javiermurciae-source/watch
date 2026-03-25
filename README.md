# WatchParty Pro - Ultra Sync

Una aplicación de WatchParty autohospedada para ver videos sincronizados con chat y video llamadas (WebRTC).

## Características
- 📡 **Video Sincronizado**: Carga archivos locales o links y todos los verán al mismo tiempo.
- 💬 **Chat Interactivo**: Con stickers y reacciones.
- 📹 **Video Llamadas**: Basado en PeerJS para baja latencia.
- 🚀 **Cloud-Ready**: Preparado para desplegar en Render, Glitch o Railway.

## Instalación

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Inicia el servidor:
   ```bash
   node server.js
   ```

3. Abre el navegador en `http://localhost:3000`.

## Despliegue en la Nube
Esta versión está optimizada para ser subida directamente a servicios como **Render** o **Glitch**. Recuerda configurar la variable de entorno `PORT` si el servicio lo requiere.
