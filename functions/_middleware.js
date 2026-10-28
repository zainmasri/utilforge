export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Permanently 301 redirect any requests coming to the old *.pages.dev subdomain to the primary custom domain
  if (url.hostname.includes('utilforge.pages.dev')) {
    url.hostname = 'getutilforge.com';
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
