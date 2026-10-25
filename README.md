# Event Management System

Server-side engineering project built with Node.js, Express, MongoDB, and JWT authentication.

## Run the backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Make sure MongoDB is running locally, or replace `MONGODB_URI` in `.env` with a MongoDB Atlas connection string.

If port `5000` is already used by another macOS service, change `PORT` to `5001` in `.env` and set `VITE_API_URL=http://localhost:5001/api` in `frontend/.env`.

Create the demo administrator after MongoDB is configured:

```bash
ADMIN_PASSWORD='choose-a-private-password' npm run seed:admin
```

Or add `ADMIN_EMAIL` and `ADMIN_PASSWORD` to `.env`, then run:

```bash
npm run seed:admin
```

Use the private email and password you configured for the admin login. Credentials are intentionally not stored in this repository.

## First API check

Open `http://localhost:5001/api/health` when using the Mac setup above. It should return:

```json
{
  "status": "ok",
  "service": "event-management-system-api"
}
```

## Initial API modules

- Authentication: register, login, current user
- Events: list, view, create, update, delete, approve/reject
- Registrations: register for an event, view personal registrations, cancel registration
