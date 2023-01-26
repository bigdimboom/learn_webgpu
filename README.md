# learn_webgpu
## Step up project step by step (Empty Project):
1. install node JS
2. npm create vite@latest
3. npm i @webgpu/types
4. Because webgpu is a experimental, you need to register an tail token https://developer.chrome.com/origintrials/

// vite config
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const devToken = "Get Token From https://developer.chrome.com/origintrials/#/trials/my"

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

// tsc config
{
  "compilerOptions": {
      "target": "ESNext",
      "useDefineForClassFields": true,
      "module": "ESNext",
      "lib": ["ESNext", "DOM"],
      "moduleResolution": "Node",
      "sourceMap": true,
      "resolveJsonModule": true,
      "esModuleInterop": true,
      "noEmit": true,
      "strict": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noImplicitReturns": true,
      "noImplicitAny": true,
      "noImplicitThis" : true,
      "experimentalDecorators": true,
      "types": ["vite/client", "@webgpu/types"]
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
