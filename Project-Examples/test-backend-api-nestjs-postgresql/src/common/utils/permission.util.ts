import { IAuth } from '@/modules/auth/interfaces/auth.interface';

export const hasPermission = (
  user: IAuth,
  requiredPermission: string,
): boolean => {
  return (
    user && user.permissions && user.permissions.includes(requiredPermission)
  );
};
