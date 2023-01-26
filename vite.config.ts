// vite config
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
const devToken = "Get Token From https://developer.chrome.com/origintrials"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'Origin-Trial',
      configureServer: server => {
          server.middlewares.use((_req, res, next) => {
              res.setHeader("Origin-Trial", devToken)
              next()
          })
      }
  }
  ],
  server:{
    host: 'localhost',
    port: 3000
  }
})
