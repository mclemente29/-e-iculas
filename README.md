# Ñeñículas 🎬

Una aplicación web para ver películas en remoto de forma sincronizada con interacción emocional.

## Características

- 🎥 Compartir pantalla en tiempo real
- 💬 Comentarios secretos durante la película
- 🎨 Interfaz inspirada en Netflix
- ✨ Animaciones suaves
- 🔒 Comentarios privados entre parejas

## Tecnologías

- React (Vite)
- TailwindCSS
- React Router
- Firebase (Firestore)
- PeerJS (WebRTC)
- Framer Motion
- Lucide Icons

## Configuración

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/neñiculas.git
cd neñiculas
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura Firebase:
   - Crea un proyecto en Firebase Console
   - Habilita Firestore
   - Copia las credenciales en `src/utils/firebase.js`

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

## Uso

1. Abre la aplicación en dos navegadores diferentes
2. En el primer navegador, haz clic en "Crear sala"
3. Copia el código de la sala
4. En el segundo navegador, pega el código y haz clic en "Unirse a sala"
5. En el navegador del host, haz clic en "Compartir pantalla"
6. Selecciona la pestaña con el video que quieres compartir
7. ¡Disfruta de la película y deja comentarios secretos!

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios que te gustaría hacer.

## Licencia

MIT 