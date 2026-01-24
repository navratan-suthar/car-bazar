# Car Bazar Backend

Complete backend system for Car Bazar marketplace with superuser authentication and content management.

## Features

- **RESTful API** for managing cars, owners, and market information
- **Superuser Authentication** with JWT tokens
- **Admin Panel** for editing text and uploading photos
- **SQLite Database** for data persistence
- **File Upload** support for images

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

3. Access the application:
- Frontend: http://localhost:3000
- Admin Panel: http://localhost:3000/admin

## Superuser Credentials

- **Username:** navratan suthar
- **Password:** Ns@1212ns

## API Endpoints

### Public Endpoints
- `GET /api/market-info` - Get market information
- `GET /api/owners` - Get all owners
- `GET /api/cars?section=home|all` - Get cars by section
- `GET /api/cars/:id` - Get specific car

### Admin Endpoints (Requires Authentication)
- `POST /api/auth/login` - Login and get JWT token
- `PUT /api/admin/market-info` - Update market information
- `GET /api/admin/owners` - Get all owners (admin)
- `PUT /api/admin/owners/:id` - Update owner (with image upload)
- `GET /api/admin/cars` - Get all cars (admin)
- `POST /api/admin/cars` - Create new car (with image upload)
- `PUT /api/admin/cars/:id` - Update car (with image upload)
- `DELETE /api/admin/cars/:id` - Delete car

## Database Schema

The database is automatically initialized with:
- Users table (for authentication)
- Owners table (left and right positions)
- Market info table
- Cars table (with section: home or all)

## File Structure

- `server.js` - Main backend server
- `admin.html` - Admin panel interface
- `index.html` - Frontend (updated to use API)
- `package.json` - Dependencies
- `uploads/` - Directory for uploaded images
- `car_bazar.db` - SQLite database (auto-created)

## Notes

- Images are stored in the `uploads/` directory
- The database is automatically initialized with default data on first run
- JWT tokens expire after 24 hours
- Default superuser is created automatically
