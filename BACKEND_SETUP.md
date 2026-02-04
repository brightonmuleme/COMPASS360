# Backend Connection Setup

## Overview
The application has been configured to connect to the AWS hosted backend using Cognito for authentication.

## Configuration
- **API URL**: `https://tp90o4o29f.execute-api.eu-central-1.amazonaws.com/Prod`
- **Region**: `eu-central-1`
- **Auth**: AWS Cognito (User Pool: `eu-central-1_rOO3xcPg4`)

## Files Created/Modified
1.  **`.env.local`**: Contains the backend configuration secrets.
2.  **`src/lib/api.ts`**: API Client wrapper that automatically handles:
    - Base URL prefixing
    - Header Management
    - **Automatic Token Injection**: Automatically fetches the current session ID Token from Amplify and attaches it to `Authorization: Bearer <token>` for every request.
3.  **`src/lib/amplify.ts`**: Client-side Amplify configuration.
4.  **`src/services/authService.ts`**: Wrapper for Auth actions (Login, Logout, Get User).
5.  **`src/services/studentService.ts`**: Example service for Student CRUD operations.
6.  **`src/app/test-connection/page.tsx`**: A debug page to verify connectivity.

## How to Test
1.  Ensure dependencies are installed: `npm install aws-amplify`
2.  Run the app: `npm run dev`
3.  Navigate to `http://localhost:3000/test-connection`
4.  You should see the "Environment Config" populate with the correct URL.
5.  Click "Test Login Flow" to attempt a login (requires valid credentials).

## Next Steps
- Migrate `src/lib/store.ts` to use `studentService` instead of mock data.
- Update data types in `src/lib/store.ts` if the API response structure differs from the mock interfaces.
