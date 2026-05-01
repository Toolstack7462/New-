import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'];

/**
 * AdminRoute — server-verified route guard.
 * Reads cached user from localStorage as UI hint, then confirms with server.
 * If server returns 401, redirect to admin login regardless of local cache.
 */
const AdminRoute = ({ children }) => {
  const cached = authService.getCurrentUser();
  // Start with local cache to avoid flash; verify in background
  const [state, setState] = useState({
    verified: false,
    allowed: cached && ADMIN_ROLES.includes(cached?.role),
    loading: true
  });

  useEffect(() => {
    let cancelled = false;
    authService.verifySession().then(user => {
      if (cancelled) return;
      setState({
        verified: true,
        allowed: !!user && ADMIN_ROLES.includes(user.role),
        loading: false
      });
    });
    return () => { cancelled = true; };
  }, []);

  if (state.loading) {
    // Render nothing (or a spinner) while confirming with server
    return null;
  }

  if (!state.allowed) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default AdminRoute;
