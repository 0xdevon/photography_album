export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const username = url.searchParams.get("username");

  if (!username) {
    return new Response(JSON.stringify({ error: "username is required" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const apiUrl = `https://api.unsplash.com/users/${encodeURIComponent(username)}`;

  const resp = await fetch(apiUrl, {
    headers: {
      Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}`,
      "Accept-Version": "v1",
    },
  });

  const body = await resp.text();

  return new Response(body, {
    status: resp.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, s-maxage=300",
    },
  });
}
