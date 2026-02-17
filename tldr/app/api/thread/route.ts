import { NextResponse } from "next/server";
import { z } from "zod";

const InputSchema = z.object({
  url: z.string().url(),
});

function extractStatusId(url: string): string | null {
  // Supports:
  // https://x.com/{user}/status/{id}
  // https://twitter.com/{user}/status/{id}
  const m = url.match(/\/(status|statuses)\/(\d+)/i);
  return m?.[2] ?? null;
}

function cleanText(t: string): string {
  return t
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/g, (u) => u) // keep URLs as-is
    .trim();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request. Expected { url }." }, { status: 400 });
  }

  const url = parsed.data.url;
  const id = extractStatusId(url);
  if (!id) {
    return NextResponse.json({ error: "Couldn't find a post ID in that URL." }, { status: 400 });
  }

  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Missing X_BEARER_TOKEN. Add it to your environment (local .env.local or Vercel env vars).",
        hint:
          "MVP UI still works if you paste text into the 'Demo Mode' box—no X API required.",
      },
      { status: 501 }
    );
  }

  // --- X API v2 approach (minimal + pragmatic) ---
  // 1) Get the root post (tweet) to learn author_id + conversation_id
  // 2) Search within the conversation_id for posts from that author
  //
  // Note: X API fields and access levels vary by plan. This is implemented
  // to be easy to adjust if your plan lacks conversation_id or search access.

  const headers = { Authorization: `Bearer ${token}` };

  const rootUrl =
    `https://api.x.com/2/tweets/${id}` +
    `?tweet.fields=author_id,conversation_id,created_at` +
    `&expansions=author_id` +
    `&user.fields=username,name`;

  const rootRes = await fetch(rootUrl, { headers, cache: "no-store" });
  const rootJson: any = await rootRes.json().catch(() => null);

  if (!rootRes.ok) {
    return NextResponse.json(
      { error: "X API error fetching root post.", details: rootJson },
      { status: 502 }
    );
  }

  const rootTweet = rootJson?.data;
  const user = rootJson?.includes?.users?.[0];

  const conversationId: string | undefined = rootTweet?.conversation_id;
  const authorId: string | undefined = rootTweet?.author_id;

  // Fallback: if we can't get conversation_id, just return the root post.
  if (!conversationId || !authorId) {
    const text = cleanText(rootTweet?.text ?? "");
    return NextResponse.json({
      title: user?.name ? `${user.name} (1 post)` : "Thread (1 post)",
      authorHandle: user?.username ? `@${user.username}` : undefined,
      sourceUrl: url,
      segments: [{ id: String(id), text }],
    });
  }

  // Search endpoint to gather thread posts by same author in the conversation.
  // Depending on plan, you might need to use recent search or full-archive search.
  const q = encodeURIComponent(`conversation_id:${conversationId} from:${user?.username ?? ""}`);
  const searchUrl =
    `https://api.x.com/2/tweets/search/recent?query=${q}` +
    `&tweet.fields=created_at,author_id,conversation_id` +
    `&max_results=100`;

  const searchRes = await fetch(searchUrl, { headers, cache: "no-store" });
  const searchJson: any = await searchRes.json().catch(() => null);

  if (!searchRes.ok) {
    // degrade gracefully: root only
    const text = cleanText(rootTweet?.text ?? "");
    return NextResponse.json({
      title: user?.name ? `${user.name} (1 post)` : "Thread (1 post)",
      authorHandle: user?.username ? `@${user.username}` : undefined,
      sourceUrl: url,
      segments: [{ id: String(id), text }],
      warning:
        "Couldn't access thread search on your X API plan. Returned the root post only.",
      details: searchJson,
    });
  }

  const tweets: any[] = Array.isArray(searchJson?.data) ? searchJson.data : [];
  // Sort chronologically
  tweets.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const segments = tweets.map((t) => ({
    id: String(t.id),
    text: cleanText(t.text ?? ""),
  })).filter(s => s.text.length > 0);

  const title = user?.name ? `${user.name} (${segments.length} posts)` : `Thread (${segments.length} posts)`;

  return NextResponse.json({
    title,
    authorHandle: user?.username ? `@${user.username}` : undefined,
    sourceUrl: url,
    segments,
  });
}
