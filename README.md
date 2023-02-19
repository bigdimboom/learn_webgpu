# learn_webgpu
## Step up project step by step (Empty Project):
1. install node JS
2. npm create vite@latest
3. "npm i @webgpu/types" and "npm install --save @webgpu/types"
4. to install ViTest "npm install -D vitest"
5. "npm install"
4. Because webgpu is a experimental, you need to register an tail token https://developer.chrome.com/origintrials/
5. run project: "npx vite"

## Additional Info.
1. To Debug React Components in Chromes: 
  1. visit https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi?hl=en
  2. for other browsers: npm install -g react-devtools, and then run "react-devtools" to activate the tool
2. React Docs: https://beta.reactjs.org/

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

## Chapter 1: Basic Triangle
![Alt text](https://github.com/bigdimboom/learn_webgpu/blob/main/images/basic_triangle.JPG "Chapter 1")

## Chapter 2: Textured Quad
1. load texture and display
2. load texture resource from a worker thread
![Alt text](https://github.com/bigdimboom/learn_webgpu/blob/main/images/textured_quad.jpg "Chapter 2")

## Chapter 3: Uniform
1. Single Uniform Buffer (2 matrices: mvp and modelview)
2. Configure BindGroup: (with single buffer, the data alignment must be 256, for each bind point within a group) 
3. Configure BindGroup V2: (Or One just use one bind point within a group, and decleare a struct with many fields for Uniform the sahder)  
![Alt text](https://github.com/bigdimboom/learn_webgpu/blob/main/images/spin_cube.gif "Chapter 3")

## Chapter 4: Free-Look Camera
1. W S A D for movement
2. Click mouse cursor on teh canvas to activate pith and yaw
![Alt text](https://github.com/bigdimboom/learn_webgpu/blob/main/images/freelookcam.gif "Chapter 4")


## Chapter 5: Instancing
1. Use Free-Look camera
2. Transforms of cubes are generated by cpu
3. Instance number: 99999
4. Noticeable slow down when more than 99999 cubes
5. GPU is throttled by CPU
![Alt text](https://github.com/bigdimboom/learn_webgpu/blob/main/images/instancing.gif "Chapter 5")
![Alt text](https://github.com/bigdimboom/learn_webgpu/blob/main/images/instancing_bench.jpg "Chapter 5")
![Alt text](https://github.com/bigdimboom/learn_webgpu/blob/main/images/instancing_bench2.jpg "Chapter 5")

## Chapter 6: BundleDraw
1. Use Free-Look camera
2. ReactJs for UI
![Alt text](https://github.com/bigdimboom/learn_webgpu/blob/main/images/bundle_draw.gif "Chapter 6")

## Chapter 7: Offscreen
Offscreen is the basics of a lot special effects, e.g. shadow map, deferred rendering
![Alt text](https://github.com/bigdimboom/learn_webgpu/blob/main/images/offscreen.gif "Chapter 7")