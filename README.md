# Chappy App


A new and effective way of communicating — Chappy is simple, modern, and easy to use.
Create an account and log in, or use the app as a guest and start chatting right away.
You can both send direct messages or create channels to chat with several people at once!

# How is it built

his project is built with TypeScript, Express, React, Node.js, and AWS DynamoDB.

The backend retrieves data from a DynamoDB table in AWS. It exposes several API endpoints (GET, PUT, POST, DELETE), which are later fetched and used by the frontend.

The project runs on a fixed port: 1337.

To access the database, the following environment variables are required:

1. AWS_ACCESS_KEY_ID – Your AWS access key
2. AWS_SECRET_ACCESS_KEY – Your AWS secret access key
3. TABLE_NAME – The name of your DynamoDB table
4. JWT_SECRET – Used in the backend to securely create, sign, and verify JWT tokens
5. PORT – Your chosen port number


All of these variables are stored inside a .env file. 

# How to use

1. Clone the repository:
   https://github.com/MiniNinja97/chappy-app.git

2. Navigate into the project:
   cd chappy-app

3. Install dependencies:
   npm install

3. Start the server:
   npm run restart-server

4. Start the frontend (local host):
   npm run dev


# The apps features

* Create a user account and log in

* Guest login without registration

* Direct messaging between users

* Create and join channels for group conversations

* Real-time chat functionality using Socket.io

* Full CRUD operations with AWS DynamoDB

* Secure authentication with JWT tokens

* Built with TypeScript for strong typing and cleaner code

# Project structure

The project is divided into two main parts: frontend and backend.
Here is an overview of how everything is organized:

├── src/                      # Frontend (React + TypeScript)
│   ├── components/           # All .tsx components (UI, pages, layout)
│   ├── styles/               # All CSS files for styling
│   └── main.tsx              # Frontend entry point and React Router setup

├── srcServer/                # Backend (Node.js + Express + TypeScript)
│   ├── data/                 # DynamoDB logic, middleware, validation & shared types
│   │    
│   ├── routes/               # All API endpoints (channels, users, messages)
│   │     
│   └── server.ts             # Main Express server file (API + Socket.io setup)

# API Documentation

# Tech Stack Overview

The technologies used in this project:

* React – For building the user interface

* TypeScript – Provides type safety and clearer code

* Node.js & Express – Backend server and API handling

* Socket.io – Real-time communication for channel chat

* AWS DynamoDB – database for storing users, messages, and channels

* JWT – Secure authentication and session handling

* Vite – Fast frontend development environment

* CSS – Styling for components and layout























<!-- # React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]) -->
```
