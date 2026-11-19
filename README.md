# Medicine Handling Management System (MERN)

A starter MERN application for medicine record management, role-based access, batch/expiry tracking, and notifications.

## Stack
- React + Vite
- Node.js + Express
- MongoDB Atlas + Mongoose
- JWT authentication, bcrypt password hashing

## Roles
- **Admin:** manage users and medicine records (create, edit, delete).
- **User:** view medicine records and notifications.

Public registration always creates a `user` account. Admin accounts are created with the seed script.

## 1. Requirements
Install Node.js LTS and npm. You also need a MongoDB Atlas cluster.

## 2. Backend setup
```bash
cd server
npm install
```
Copy `.env.example` to `.env` and set:
- `MONGODB_URI`: your Atlas connection string (include the database name, e.g. `/medicine_management` before any query parameters).
- `JWT_SECRET`: a long random secret.
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: initial administrator credentials.

Then run:
```bash
npm run seed:admin
npm run dev
```
API runs at `http://localhost:5000`.

## 3. Frontend setup
Open a second terminal:
```bash
cd client
npm install
```
Copy `client/.env.example` to `client/.env` if you need to change the API URL. Then:
```bash
npm run dev
```
Open the local URL printed by Vite (usually `http://localhost:5173`).

## 4. Main medicine fields
- CR report number
- Generic number
- Batch number
- Expiry date
- Sample type: Registration, Complaint, Other, or Surveillance
- Medicine name, manufacturer, received date, quantity, and notes

The sample type list is configurable in `server/models/Medicine.js`.

## 5. Expiry notifications
The API calculates notification status based on expiry date:
- 90 days: advance
- 60 days: warning
- 30 days: urgent
- 7 days: critical
- Past expiry date: expired

Notifications are calculated when the dashboard is requested; this starter does not yet send email/SMS or browser push notifications.

## 6. Important security notes
- Never commit `.env` files. They are ignored by Git.
- Do not put MongoDB credentials in React/client code.
- Rotate any database password that has been shared in chat, screenshots, source code, or a public repository.
- Use a strong unique `JWT_SECRET`.
- Before real NMRA use, obtain approval for hosting, access policies, retention, backups, audit logging, and data classification. Do not upload confidential or personal data to a test deployment.

## 7. Before production
This is a functional starter/MVP, not a production-certified regulatory system. Add institutional review and testing for audit trails, backups, rate limiting, account approval, password reset, stronger validation, and formal authorization rules before operational use.
