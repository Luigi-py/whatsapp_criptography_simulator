# Official example full working
- [Simulator_Whatsapp_Crypto.com](https://whatsapp-criptography-simulator.vercel.app/)

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## How to run the local server?

cd "~./your_local_git_clone/simulador"

npm run dev

Then open http://localhost:5173 on your browser.

## How to kill ghost server on port 5173 (Windows)

IF the 5173 port still be ocupied besides any terminal as open, execute on terminal:

```bash
netstat -ano | grep :5173
```

This show the PID process. Then, kill that with:

```bash
taskkill //F //PID <numero_do_PID>
```
