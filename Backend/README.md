# Stock App Backend API

Complete authentication and user management backend built with Node.js, Express, MongoDB, and JWT.

## Features

- **Authentication**
  - User signup/login with JWT tokens
  - Access & refresh token management
  - OTP-based passwordless authentication
  - Secure password hashing with bcrypt

- **User Management**
  - User profile management
  - Admin user management (list, update, delete)
  - Role-based access control (user, admin, manager)
  - Soft delete functionality

- **Security**
  - JWT-based authentication
  - Password hashing
  - Token refresh mechanism
  - CORS protection
  - Input validation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Password Hashing**: bcryptjs

## Project Structure

```
Backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Auth logic
│   └── userController.js    # User management logic
├── middleware/
│   ├── auth.js             # JWT authentication & authorization
│   ├── validate.js         # Input validation
│   └── errorHandler.js     # Global error handler
├── models/
│   ├── User.js             # User schema
│   ├── RefreshToken.js     # Refresh token schema
│   └── OTP.js              # OTP schema
├── routes/
│   ├── auth.js             # Auth routes
│   └── users.js            # User routes
├── utils/
│   ├── jwt.js              # JWT utilities
│   └── otp.js              # OTP utilities
├── .env                    # Environment variables
├── .env.example            # Environment template
├── server.js               # Main server file
└── package.json
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Copy `.env.example` to `.env`
   - Update the values (MongoDB URI, JWT secrets, etc.)

3. **Start MongoDB**
   - Make sure MongoDB is running on your system
   - Default: `mongodb://localhost:27017/stock_app`

4. **Run the server**
   ```bash
   # Development mode (with nodemon)
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/signup` | Create user account | Public |
| POST | `/api/auth/login` | Sign in and get tokens | Public |
| POST | `/api/auth/logout` | Revoke refresh token | Public |
| POST | `/api/auth/refresh` | Get new access token | Public |
| POST | `/api/auth/request-otp` | Request OTP for login | Public |
| POST | `/api/auth/verify-otp` | Verify OTP and login | Public |

### Users

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users/me` | Get current user profile | Private |
| PUT | `/api/users/me` | Update profile | Private |
| GET | `/api/users` | List all users | Admin |
| GET | `/api/users/:id` | Get user by ID | Admin |
| PUT | `/api/users/:id` | Update user | Admin |
| DELETE | `/api/users/:id` | Soft delete user | Admin |

## Request/Response Examples

### Signup
```json
POST /api/auth/signup
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "user"
}

Response:
{
  "success": true,
  "message": "User created successfully",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login
```json
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900000
}
```

### Get Profile
```json
GET /api/users/me
Headers: Authorization: Bearer <token>

Response:
{
  "success": true,
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "phone": "+1234567890",
    "preferences": {},
    "isActive": true
  }
}
```

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/stock_app

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRE=7d

# OTP
OTP_EXPIRE_MINUTES=10

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Security Notes

⚠️ **Important**: Before deploying to production:

1. Change all JWT secrets in `.env`
2. Use strong, randomly generated secrets
3. Enable HTTPS
4. Configure proper CORS origins
5. Implement rate limiting
6. Set up proper email/SMS services for OTP
7. Enable MongoDB authentication
8. Use environment-specific configurations

## Development

- Run in development mode: `npm run dev`
- Server will restart automatically on file changes (nodemon)
- Detailed error messages in development mode

## Testing

Use tools like Postman, Insomnia, or cURL to test the API endpoints.

Health check endpoint: `GET http://localhost:5000/health`

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [...]  // Validation errors (422)
}
```

Status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

## License

ISC
