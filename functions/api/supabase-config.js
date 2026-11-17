async function handler(req, res, env) {
 res.setHeader('Cache-Control','no-store, max-age=0');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET'});}
 const url=env.SUPABASE_URL||env.NEXT_PUBLIC_SUPABASE_URL||'';
 const anonKey=env.SUPABASE_ANON_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
 if(!url||!anonKey)return res.status(503).json({configured:false,error:'Supabase is not configured.'});
 return res.status(200).json({configured:true,url,anonKey});
};

// Cloudflare Pages adapter for the existing JSON endpoint.
export async function onRequest({ request, env }) {
  let body;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const raw = await request.text();
    if (raw) {
      try { body = JSON.parse(raw); }
      catch { body = raw; }
    }
  }
  const headers = new Headers();
  let status = 200;
  const req = { method: request.method, body };
  const res = {
    setHeader(name, value) { headers.set(name, String(value)); },
    status(code) { status = code; return this; },
    json(payload) {
      headers.set("Content-Type", "application/json; charset=utf-8");
      return new Response(JSON.stringify(payload), { status, headers });
    }
  };
  try {
    const result = await handler(req, res, env);
    return result instanceof Response ? result : new Response(null, { status: 204, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
}
