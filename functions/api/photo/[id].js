export async function onRequest(context) {
  const { params, env } = context;
  const id = params.id;

  if (!id) {
    return new Response(JSON.stringify({ error: "photo id is required" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const apiUrl = `https://api.unsplash.com/photos/${encodeURIComponent(id)}`;

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
