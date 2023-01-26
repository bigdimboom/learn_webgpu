# learn_webgpu
## Step up project step by step (Empty Project):
1. install node JS
2. npm create vite@latest
3. "npm i @webgpu/types" and "npm install --save @webgpu/types"
5. "npm install"
4. Because webgpu is a experimental, you need to register an tail token https://developer.chrome.com/origintrials/

```javascript Vite Config
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
```

![Alt text](https://github.com/bigdimboom/learn_webgpu/blob/main/images/3.png "When Creating Token...")

```json Typescript Config
// tsc config 
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vite/client", "@webgpu/types"]
  },
  "include": ["src"],
  "exclude": ["node_modules"],
  "references": [{ "path": "./tsconfig.node.json" }]
}

```
