import { useAuthStore } from '../store/authStore';
import { useWebSocket } from '../hooks/useWebSocket';

/**
 * Componente invisible que mantiene viva la conexión WS mientras hay usuario logueado.
 * Se renderiza en App.tsx fuera de las Routes; el hook solo se monta cuando hay sesión.
 */
function WSConnection() {
  useWebSocket();
  return null;
}

export default function WSManager() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return <WSConnection />;
}
