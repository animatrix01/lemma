# Landing Page & Authentication

## Overview

This document describes the landing page and authentication system for Lemma.

## Features

### Landing Page (`/landing`)

- **Public access**: Anyone can view the landing page without authentication
- **Interactive preview**: Users see the same interface as the main app
- **Auth trigger**: Any attempt to interact (type, click, upload) triggers the login/signup modal
- **Modern design**: Matches the main app's design with hero background, quick actions, and examples

### Authentication Modal

The modal provides both sign-in and sign-up functionality:

#### Demo Credentials (for testing)
- **Email**: `demo@lemma.ai`
- **Password**: `demo123`

#### Sign Up
- For now, any email/password combination is accepted for sign-up
- Users are automatically authenticated after sign-up

### Protected Routes

All main application routes are protected with the `AuthGuard` component:

- `/` - Main analysis page
- `/runs/[id]` - Run details
- `/scan` - Scanner page
- `/evals` - Evaluations page

If a user tries to access these routes without authentication, they are redirected to `/landing`.

### User Session

- Authentication state is stored in `localStorage`:
  - `lemma_auth`: "true" when authenticated
  - `lemma_user`: User's email address
- Logout clears these values and redirects to `/landing`

### Top Bar

The top bar shows:
- **When not authenticated**: Sign In / Sign Up buttons
- **When authenticated**: User email and Logout button

## Usage

### For Users

1. Visit the landing page at `/landing` (or be redirected there)
2. Try to interact with any element
3. Sign in with demo credentials or sign up
4. Access the full application

### For Developers

#### Protecting a new route

Wrap your page component with `AuthGuard`:

```tsx
import { AuthGuard } from "@/components/auth-guard";

export default function MyPage() {
  return (
    <AuthGuard>
      <AppShell>
        {/* Your content */}
      </AppShell>
    </AuthGuard>
  );
}
```

#### Checking auth state

```tsx
const isAuthenticated = localStorage.getItem("lemma_auth") === "true";
const userEmail = localStorage.getItem("lemma_user");
```

#### Logout functionality

```tsx
localStorage.removeItem("lemma_auth");
localStorage.removeItem("lemma_user");
router.push("/landing");
```

## File Structure

```
frontend/src/
├── app/
│   ├── landing/
│   │   └── page.tsx          # Landing page with auth modal
│   ├── page.tsx               # Main page (protected)
│   ├── runs/[id]/page.tsx     # Run details (needs AuthGuard)
│   ├── scan/page.tsx          # Scanner (needs AuthGuard)
│   └── evals/page.tsx         # Evals (needs AuthGuard)
├── components/
│   ├── auth-guard.tsx         # Authentication wrapper component
│   ├── app-topbar.tsx         # Updated with auth buttons
│   └── ui/
│       └── claude-chat-input.tsx  # Updated with disabled prop
```

## Future Improvements

- [ ] Integrate with real authentication backend
- [ ] Add password reset functionality
- [ ] Add social login options (Google, GitHub, etc.)
- [ ] Add email verification
- [ ] Add session timeout
- [ ] Add remember me functionality
- [ ] Add user profile management
- [ ] Add JWT token management
- [ ] Add refresh token flow
