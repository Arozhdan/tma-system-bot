import { Hono } from "hono"
import { requireUser, createKV } from "@tma.sh/sdk/server"
import type { AuthEnv, KVNamespaceBinding } from "@tma.sh/sdk/server"

type Env = AuthEnv & { Bindings: { KV: KVNamespaceBinding } }

const app = new Hono<Env>()

app.get("/api/health", (c) => c.json({ status: "ok" }))

// Protected routes — JWT verified via TMA JWKS
app.use("/api/notes/*", requireUser())

app.get("/api/notes/list", async (c) => {
  const user = c.get("user")
  const kv = createKV(c.env.KV)
  const prefix = `notes:${user.telegramId}:`
  const keys = await kv.list(prefix)

  const notes: Array<{ key: string; text: string; createdAt: string }> = []
  for (const key of keys) {
    const value = await kv.get<{ text: string; createdAt: string }>(key)
    if (value) {
      notes.push({ key: key.replace(prefix, ""), ...value })
    }
  }

  return c.json({ success: true, data: notes })
})

app.post("/api/notes/create", async (c) => {
  const user = c.get("user")
  const kv = createKV(c.env.KV)
  const body = await c.req.json<{ text: string }>()

  if (!body.text?.trim()) {
    return c.json({ success: false, error: "Note text is required" }, 400)
  }

  const id = crypto.randomUUID().slice(0, 8)
  const key = `notes:${user.telegramId}:${id}`
  const note = { text: body.text.trim(), createdAt: new Date().toISOString() }
  await kv.set(key, note)

  return c.json({ success: true, data: { key: id, ...note } })
})

app.delete("/api/notes/:id", async (c) => {
  const user = c.get("user")
  const kv = createKV(c.env.KV)
  const id = c.req.param("id")
  const key = `notes:${user.telegramId}:${id}`

  const existing = await kv.get(key)
  if (!existing) {
    return c.json({ success: false, error: "Note not found" }, 404)
  }

  await kv.delete(key)
  return c.json({ success: true, data: { deleted: id } })
})

export default { fetch: app.fetch }
