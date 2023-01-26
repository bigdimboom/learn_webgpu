// vite config
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import devToken from './DevToken.txt?raw' // register a token, create a file call DevToken.txt and paste the token in it.

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
