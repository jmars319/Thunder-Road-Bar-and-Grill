# Thunder Road Bar and Grill - API Documentation

## Overview

This document describes the REST API for the Thunder Road Bar and Grill website backend.

## Base URL

- **Development**: `http://localhost:5001/api`
- **Production**: Update based on your deployment

## Authentication

Most admin endpoints require JWT authentication. Obtain a token via the `/login` endpoint and include it in subsequent requests:

```
Authorization: Bearer <your-jwt-token>
```

### Login Example

```bash
curl -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

## Rate Limiting

Public form submission endpoints are rate-limited to prevent abuse:

- **Contact Form**: 5 requests per 15 minutes per IP
- **Reservations**: 3 requests per 15 minutes per IP
- **Newsletter**: 3 requests per 15 minutes per IP
- **Job Applications**: 3 requests per 15 minutes per IP
- **Login**: 10 attempts per 15 minutes per IP

## OpenAPI Specification

The complete API specification is available in OpenAPI 3.0 format:

**File**: `openapi.yaml`

### Viewing the Documentation

You can view the API documentation using various tools:

#### 1. Swagger UI (Online)

Visit [Swagger Editor](https://editor.swagger.io/) and paste the contents of `openapi.yaml`

#### 2. Swagger UI (Local)

Install and run Swagger UI locally:

```bash
npm install -g swagger-ui-watcher
swagger-ui-watcher openapi.yaml
```

#### 3. VS Code Extension

Install the "OpenAPI (Swagger) Editor" extension in VS Code and open `openapi.yaml`

#### 4. Redoc (Alternative viewer)

```bash
npx @redocly/cli preview-docs openapi.yaml
```

## API Endpoints Summary

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/site-settings` | Get site configuration |
| GET | `/navigation` | Get navigation links |
| GET | `/menu` | Get menu categories and items |
| GET | `/media` | Get media gallery items |
| GET | `/logo/sanitized` | Get sanitized SVG logo |
| GET | `/about-content` | Get about page content |
| GET | `/business-hours` | Get business hours |
| GET | `/footer` | Get footer content |
| GET | `/jobs/config` | Get available job positions |
| POST | `/contact` | Submit contact form |
| POST | `/reservations` | Submit reservation request |
| POST | `/newsletter` | Subscribe to newsletter |
| POST | `/jobs` | Submit job application |
| POST | `/login` | Authenticate admin user |

### Admin Endpoints (require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/site-settings` | Update site configuration |
| PUT | `/navigation` | Update navigation links |
| PUT | `/menu` | Update entire menu |
| POST | `/menu/categories` | Create menu category |
| PUT | `/menu/categories/:id` | Update menu category |
| DELETE | `/menu/categories/:id` | Delete menu category |
| POST | `/menu/items` | Create menu item |
| PUT | `/menu/items/:id` | Update menu item |
| DELETE | `/menu/items/:id` | Delete menu item |
| POST | `/media` | Upload media file |
| PUT | `/media/:id` | Update media metadata |
| DELETE | `/media/:id` | Delete media file |
| GET | `/contact` | Get all contact messages |
| PUT | `/contact/:id` | Update message status |
| DELETE | `/contact/:id` | Delete contact message |
| GET | `/reservations` | Get all reservations |
| PUT | `/reservations/:id` | Update reservation status |
| DELETE | `/reservations/:id` | Delete reservation |
| GET | `/newsletter` | Get newsletter subscribers |
| DELETE | `/newsletter/:id` | Remove subscriber |
| GET | `/jobs` | Get job applications |
| DELETE | `/jobs/:id` | Delete job application |
| PUT | `/jobs/config` | Update job positions |
| PUT | `/about-content` | Update about page content |
| PUT | `/business-hours` | Update business hours |
| PUT | `/footer` | Update footer content |

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description"
}
```

### Validation Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## File Uploads

Media files can be uploaded via the `/media` endpoint using multipart/form-data:

```bash
curl -X POST http://localhost:5001/api/media \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/image.jpg" \
  -F "category=gallery" \
  -F "title=My Image" \
  -F "alt_text=Description of image"
```

### Supported File Types

- **Images**: jpg, jpeg, png, webp, svg
- **Resumes**: pdf, doc, docx

### File Size Limits

- **Images**: 10 MB
- **Resumes**: 5 MB

## Security Features

### Implemented Security Measures

1. **JWT Authentication**: Token-based authentication for admin endpoints
2. **Bcrypt Password Hashing**: Passwords stored with bcrypt (10 rounds)
3. **Rate Limiting**: Protects against brute force and DoS attacks
4. **Input Validation**: All inputs validated using express-validator
5. **SQL Injection Prevention**: Parameterized queries throughout
6. **SVG Sanitization**: SVG files sanitized with DOMPurify
7. **HTTPS Enforcement**: Automatic redirect in production
8. **CSP Headers**: Restrictive Content Security Policy for uploads
9. **Structured Logging**: Comprehensive logging with Winston

### Security Headers

The API automatically sets security headers via Helmet middleware:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security (in production)

## Example Requests

### Get Menu

```bash
curl http://localhost:5001/api/menu
```

### Submit Contact Form

```bash
curl -X POST http://localhost:5001/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "(555) 123-4567",
    "message": "I would like to inquire about hosting an event"
  }'
```

### Update Site Settings (Admin)

```bash
curl -X PUT http://localhost:5001/api/site-settings \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Thunder Road Bar and Grill",
    "tagline": "Great food, cold drinks, live music",
    "phone": "(555) 123-4567",
    "email": "info@thunderroad.com"
  }'
```

### Create Menu Item (Admin)

```bash
curl -X POST http://localhost:5001/api/menu/items \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "name": "Buffalo Wings",
    "description": "Spicy chicken wings with blue cheese",
    "price": "12.99",
    "is_available": true
  }'
```

## Error Codes

| HTTP Status | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Development

### Testing the API

Use tools like:
- **curl**: Command-line HTTP client
- **Postman**: GUI API testing tool
- **Insomnia**: REST client
- **HTTPie**: User-friendly curl alternative

### Logging

All API requests and errors are logged via Winston:
- **Development**: Colorized console output
- **Production**: JSON-formatted log files in `logs/` directory

### Environment Variables

Required environment variables for production:

```bash
# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=thunder_road

# Security
JWT_SECRET=your-strong-random-secret
NODE_ENV=production
FORCE_HTTPS=true

# Optional
TRUST_PROXY=true  # If behind load balancer
PORT=5001
```

## Support

For questions or issues with the API:
1. Check the OpenAPI specification in `openapi.yaml`
2. Review the code in `backend/routes/`
3. Check logs in `backend/logs/` (production) or console output (development)
4. Contact the development team

## Version History

- **v1.0.0** (2025-01-15): Initial API documentation
  - All public and admin endpoints documented
  - OpenAPI 3.0 specification added
  - Security features implemented
  - Rate limiting on all form endpoints
