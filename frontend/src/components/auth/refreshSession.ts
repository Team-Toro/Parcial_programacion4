import type { Usuario } from '../../types';
import { getMe, refreshAccessToken } from '../../api/auth';

export async function refreshSession(): Promise<Usuario | null> {
  try {
    await refreshAccessToken();
    return await getMe();
  } catch {
    return null;
  }
}
