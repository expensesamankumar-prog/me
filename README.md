# Google OAuth Integration

This project includes Google OAuth integration for authentication and Google Calendar API access.

## Setup Instructions

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Choose "Web application" as the application type
6. Set the authorized redirect URI to:
   - For development: `http://localhost:3000/auth/google/callback`
   - For production: `https://your-domain.com/auth/google/callback`
7. Copy the Client ID and Client Secret

### 2. Configure Environment Variables

1. Copy the `.env.example` file to create a `.env` file:
   ```bash
   cp functions/.env.example functions/.env
   ```

2. Fill in your Google OAuth credentials in the `.env` file:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   ```

### 3. Install Dependencies

```bash
cd functions
npm install
```

### 4. Start the Server

```bash
npm start
```

The server will start on port 8080 by default.

### 5. Test the Integration

1. Visit `http://localhost:8080/auth/google` to start the OAuth flow
2. After authentication, you'll be redirected to the callback URL
3. Use `http://localhost:8080/api/calendar/events` to fetch calendar events

## API Endpoints

- `GET /auth/google` - Start OAuth flow
- `GET /auth/google/callback` - OAuth callback handler
- `GET /api/calendar/events` - Fetch calendar events

## Security Notes

- Never commit the `.env` file to version control
- Use HTTPS in production
- Store OAuth tokens securely
- Implement proper session management