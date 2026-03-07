## Packages
jwt-decode | To decode and manage JWT token expiry (optional but helpful for auth flow)
date-fns | For human-readable timestamps (e.g., "2 hours ago")
lucide-react | Already installed, but critically needed for all UI icons

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  sans: ["'Plus Jakarta Sans'", "sans-serif"],
  display: ["'Syne'", "sans-serif"],
}

JWT Auth is implemented via localStorage ('nutterx_token') and sent via standard Authorization Bearer headers.
A custom `apiFetch` utility is used across all hooks to automatically attach the token and handle 401s.
