import { useEffect, useMemo, type ReactNode } from 'react';
import { migrateAnonymousDesigns } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { AuthContext, type AuthContextValue } from '@/lib/auth-state';

export function AuthProvider({ children }: { children: ReactNode }) {
  const sessionQuery = authClient.useSession();
  const rawUser = sessionQuery.data?.user;
  const user = useMemo(
    () =>
      rawUser
        ? {
            id: rawUser.id,
            email: rawUser.email,
            name: rawUser.name,
            image: rawUser.image,
          }
        : null,
    [rawUser]
  );

  useEffect(() => {
    if (!user?.id) return;

    void migrateAnonymousDesigns()
      .catch(() => undefined);
  }, [user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isPending: sessionQuery.isPending,
      isAuthenticated: Boolean(user),
      refetch: () => sessionQuery.refetch(),
      signOut: async () => {
        await authClient.signOut();
        await sessionQuery.refetch();
      },
    }),
    [sessionQuery, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
