# Implementation Plan - CinePedido Backend Integration

## Phase 1: Backend Setup (Done)

- Defined schema for users, orders, movies.
- Implemented CRUD functions.
- Implemented Auth functions.

## Phase 2: Frontend Integration (In Progress)

- Refactor `login.js` and `register.js` to use `convexAction`.
- Refactor Admin Dashboard scripts (`admin/*.js`) to use `convexAction`.
- Refactor `script.js` to use `convexAction`.
- Update `convexAction` helper with real Deployment URL.
- **[DONE]** Fix accessibility issues in `admin/movies.html` (missing accessible names).
- **[DONE]** Fix accessibility issues in `admin/users.html` (missing accessible names).
- **[DONE]** Fix accessibility issues in `admin/orders.html` (missing accessible names).
- **[DONE]** Fix accessibility issues in `register.html` (buttons missing discernible text).
- **[DONE]** Refactor inline styles in `index.html` to `styles.css`.

## Phase 3: Deployment

- **[NEW]** Create GitHub repository and push code.
- [ ] Deploy to production (Convex).
- Verify `npx convex dev` is running.
- Ensure all environment variables are set if needed (mostly just the URL for the client).

## Phase 4: Containerization

- **[DONE]** Create `Dockerfile` (Nginx Alpine).
- **[DONE]** Create `docker-compose.yml`.
- **[DONE]** Update documentation with Docker commands.
