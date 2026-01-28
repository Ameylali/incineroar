# Incineroar

A Next.js application for Pokémon competitive battle analysis, team building, and training management.

## Features

- **Team Management**: Create and manage Pokémon competitive teams
- **Battle Analysis**: Analyze Pokémon battles and performance
- **Tournament Tracking**: Track tournament participation and results
- **Training Management**: Manage training sessions and progress

## Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (version 18 or higher) - [Download Node.js](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **Docker** - [Install Docker](https://docs.docker.com/get-docker/)
- **MongoDB** - Either local installation or Docker container

## Installation

1. **Set up environment variables**
   ```bash
   cp example.env .env
   ```
   
   Edit the `.env` file and configure the following variables:
   - `APP_URL`: Your application URL (default: http://localhost:3000)
   - `MONGO_DB_URI`: MongoDB connection string
   - `JWT_PRIVATE_KEY`: RSA private key for JWT signing
   - `JWT_PUBLIC_KEY`: RSA public key for JWT verification
   - `BASE_USER_PASSWORDS_MAP`: JSON map of default user passwords
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for server actions

2. **Set up the database**
   
   Build and run the MongoDB Docker container:
   ```bash
   npm run db:build
   npm run db:run
   ```

3. **Seed the database** (optional)
   ```bash
   npm run seed
   ```

## Development

### Available Scripts

- **`npm run dev`** - Start the development server
- **`npm run build`** - Build the application for production
- **`npm run start`** - Start the production server
- **`npm run lint`** - Run ESLint
- **`npm run test`** - Run Jest unit tests
- **`npm run test:e2e`** - Run end-to-end tests
- **`npm run compile`** - Type check with TypeScript
- **`npm run genmocks`** - Generate Ant Design mocks for testing

### Database Management

- **`npm run db:build`** - Build the MongoDB Docker image
- **`npm run db:run`** - Start the MongoDB container
