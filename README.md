# MiniJinja Sandbox

This repository contains a small WASM project to demo MiniJinja in the browser.

It tracks MiniJinja directly from the `main` branch on GitHub.

### Setup
1. [Install wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
2. Run
```bash
wasm-pack build
cd www
npm install
npm run start
```

### GitHub Pages
A GitHub Actions workflow builds and deploys the site to GitHub Pages every night (02:00 UTC), and can also be triggered manually from the Actions tab.
