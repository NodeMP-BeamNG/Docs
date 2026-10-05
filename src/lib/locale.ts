/** The same page in another locale: English lives at the root, Russian under /ru/. */
export function inLocale(pathname: string, locale: string | undefined): string {
  const bare = pathname.replace(/^\/ru(?=\/|$)/, '') || '/';
  return locale ? `/${locale}${bare === '/' ? '/' : bare}` : bare;
}
