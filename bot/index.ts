import { defineBot, createKV } from "@tma.sh/sdk/bot"

export default defineBot({
  commands: [
    { command: "start", description: "Open the Notes mini app" },
    { command: "add", description: "Add a note — /add Buy groceries" },
    { command: "notes", description: "List your saved notes" },
    { command: "clear", description: "Delete all your notes" },
  ],

  async onMessage(ctx) {
    const text = ctx.message?.text ?? ""
    const userId = ctx.from?.id

    if (!userId) return

    const kv = createKV(ctx.env.KV)
    const prefix = `notes:${userId}:`

    // /start — send web app button
    if (text === "/start") {
      await ctx.reply("Welcome to Notes! Tap below to open the app, or use commands to manage notes.", {
        reply_markup: {
          inline_keyboard: [[
            { text: "Open Notes App", web_app: { url: ctx.env.WEB_APP_URL } },
          ]],
        },
      })
      return
    }

    // /add <text> — save a note via bot
    if (text.startsWith("/add")) {
      const noteText = text.replace(/^\/add\s*/, "").trim()
      if (!noteText) {
        await ctx.reply("Usage: /add <your note text>")
        return
      }

      const id = crypto.randomUUID().slice(0, 8)
      await kv.set(`${prefix}${id}`, {
        text: noteText,
        createdAt: new Date().toISOString(),
      })
      await ctx.reply(`Saved: "${noteText}"`)
      return
    }

    // /notes — list all notes
    if (text === "/notes") {
      const keys = await kv.list(prefix)

      if (keys.length === 0) {
        await ctx.reply("No notes yet. Use /add <text> or open the mini app.")
        return
      }

      const lines: string[] = []
      for (const key of keys) {
        const note = await kv.get<{ text: string; createdAt: string }>(key)
        if (note) {
          lines.push(`• ${note.text}`)
        }
      }
      await ctx.reply(`Your notes:\n\n${lines.join("\n")}`)
      return
    }

    // /clear — delete all notes
    if (text === "/clear") {
      const keys = await kv.list(prefix)
      for (const key of keys) {
        await kv.delete(key)
      }
      await ctx.reply(
        keys.length > 0
          ? `Deleted ${keys.length} note(s).`
          : "Nothing to clear."
      )
      return
    }
  },
})
