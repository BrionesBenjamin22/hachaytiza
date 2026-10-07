import type { CookieOptions } from 'express';
export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
};
export const cookieName = (part: string) =>
  `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}furvo-${part}`;
