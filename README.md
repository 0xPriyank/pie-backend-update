# Pie — Scalable Multi-Vendor eCommerce Platform

Pie is a modern, scalable multi-vendor eCommerce backend platform designed to support real-time interactions, secure transactions, and a smooth dev experience. Built with TypeScript, Docker, Supabase, Prisma, and more, Pie is ready to scale across regions and vendors.

---

## 🚀 Tech Stack

- **Language & Runtime**: TypeScript, Node.js (using Bun as package manager)
- **Frameworks**: Express.js
- **Database**: PostgreSQL (via Supabase / Neon), Prisma ORM
- **Auth & Security**: JWT, bcrypt, Zod
- **Payments**: Razorpay integration
- **Real-time**: Socket.IO
- **DevOps**: Docker, Nginx, Vercel (for deployment)
- **Caching**: Redis

---

## 📦 Setup Instructions

### 1. Clone the Repo

```bash
git clone https://github.com/your-username/pie-backend.git
cd pie-backend
```

### 2. Install Dependencies

Using **[Bun](https://bun.sh/)**:

```bash
bun install
```

> ⚠️ Make sure you have `bun` installed globally. You can install from [here](https://bun.sh/docs/installation).

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in the required secrets, ports, DB URLs, etc. Refer to comments in `.env.example` for guidance.

### 4. Database Setup

Start the Docker database container:

```bash
./start-database.sh
bun run db:push
bun run db:seed
```

These commands will initialize and prepare your local database for development.

### 5. Run the Development Server

```bash
bun run dev
```

### 6. Build & Start for Production

```bash
bun run build
bun run start
```

---

## 🛠 Developer Scripts

| Script                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `bun run dev`          | Starts the dev server with file watching     |
| `bun run build`        | Compiles TypeScript and bundles with esbuild |
| `bun run start`        | Starts the production server                 |
| `bun run lint`         | Lints the codebase                           |
| `bun run lint:fix`     | Auto-fix lint issues                         |
| `bun run format:write` | Formats the code using Prettier              |
| `bun run format:check` | Checks formatting                            |
| `bun run typecheck`    | Type-checks the project                      |
| `bun run db:generate`  | Runs dev migrations via Prisma               |
| `bun run db:migrate`   | Deploys migrations to prod                   |
| `bun run db:push`      | Pushes schema to DB without migrations       |
| `bun run db:reset`     | Resets DB with fresh migrations              |
| `bun run db:studio`    | Opens Prisma Studio                          |

---

## 📁 Environment Variables

Refer to `.env.example` for all required environment variables.  
Here’s a summary:

| Variable               | Description                         |
| ---------------------- | ----------------------------------- |
| `PORT`                 | Server port                         |
| `CORS_ORIGIN`          | Allowed frontend origin             |
| `NODE_ENV`             | Mode: DEVELOPMENT / PRODUCTION      |
| `ACCESS_TOKEN_SECRET`  | JWT access token secret             |
| `ACCESS_TOKEN_EXPIRY`  | Token expiry (e.g. `1h`)            |
| `REFRESH_TOKEN_SECRET` | JWT refresh token secret            |
| `REFRESH_TOKEN_EXPIRY` | Refresh token expiry (e.g. `15d`)   |
| `DATABASE_URL`         | Pooled DB connection string         |
| `DIRECT_URL`           | Direct DB connection for migrations |

> 💡 You can generate secrets using:
>
> ```bash
> openssl rand -hex 32
>
> # or
>
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 🤝 Contributors

We welcome contributions via feature branches and PRs.  
Please make sure to follow the coding style, naming conventions, and include relevant scripts/tests where applicable.

- Use conventional commits (`feat:`, `fix:`, `chore:`).
- Ensure `bun run lint` and `bun run format:check` pass.
- Coordinate with the team before large architectural changes.

---

## 🔒 License

This is a **private repository**. All rights reserved.

---
