// D:\empresas\pm2-ecosystem.config.cjs
// PM2: orquesta el watcher (Excel/Imágenes → JSON) y el servidor Next en prod.
// Requiere: Node LTS + pm2 instalado globalmente.

module.exports = {
  apps: [
    {
      name: "ferreluc-orq",
      script: "D:/empresas/ferreluc/gestion/scripts/orquestador.cjs",
      // El orquestador ya hace debounce y usa chokidar
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        NODE_ENV: "production",
      },
      // Logs -> %USERPROFILE%\.pm2\logs\ferreluc-orq-out.log|err.log
    },
    {
      name: "ferreluc-web",
      cwd: "D:/empresas/catalogo",
      // PRODUCCIÓN: usar "start" (requiere build previo)
      // Si querés modo desarrollo continuo, cambiá args por ["run","dev"]
      script: "npm",
      args: ["run", "start"],
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      // Logs -> %USERPROFILE%\.pm2\logs\ferreluc-web-out.log|err.log
    },
  ],
};
