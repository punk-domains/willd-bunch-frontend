# Punk frontend template

A template repository for all partner DAO frontends.

## Quickstart

```bash
npm install
npm run dev
```

## .env (important!)

Create a .env file and enter the following in it:

```bash
VITE_ALCHEMY_ARBITRUM_KEY=key-from-alchemy
```

If you use another chain (not Arbitrum), change the key name accordingly.

If you don't create the .env file with that variable, the web app will not properly function on your localhost. The variable is also needed in the production environment.

## .github/workflows/main.yml

Make sure to add the correct Alchemy key (also add it in the repository env vars section)!

## MinterAbi

Replace the Minter ABI with the correct one for the project.

## tokens.json

Add the correct

## Branches & deployment

- **Important:** Never commit directly to the `main` branch.
- Development is done on the `develop` branch (or temporary branches which then merge with the `develop` branch).
- Deployment: When you want to make deployment to the production server, merge `develop` into the `main` branch. A CI/CD system on GitHub (GitHub Actions) will automatically build and deploy the new code to GitHub Pages.