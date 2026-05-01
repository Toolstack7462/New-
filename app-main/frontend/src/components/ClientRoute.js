import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

/**
 * ClientRoute — server-verified route guard.
 * Never redirects to admin login. Always uses /client/login.
 */
const ClientRoute = ({ children }) => {
  const cached = authService.getCurrentUser();
  const [state, setState] = useState({
    verified: false,
    allowed: cached?.role === 'CLIENT',
    loading: true
  });

  useEffect(() => {
    let cancelled = false;
    authService.verifySession().then(user => {
      if (cancelled) return;
      setState({
        verified: true,
        allowed: user?.role === 'CLIENT',
        loading: false
      });
    });
    return () => { cancelled = true; };
  }, []);

  if (state.loading) return null;
  if (!state.allowed) return <Navigate to="/client/login" replace />;
  return children;
};

export default ClientRoute;
