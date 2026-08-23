export { default } from 'next-auth/middleware';

// Les routes /api/* gèrent elles-mêmes leur vérification de session (401 JSON) :
// elles sont exclues ici pour ne pas être redirigées vers /login (ce qui casserait
// les appels fetch() côté client, qui attendent du JSON et non une redirection HTML).
export const config = {
  matcher: [
    '/((?!api|login|_next/static|_next/image|favicon.ico|uploads).*)',
  ],
};
