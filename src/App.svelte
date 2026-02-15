<script lang="ts">
  import { createTelegramAuth } from "@tma.sh/sdk/svelte"

  const auth = createTelegramAuth({
    projectId: "703134b2-6dc7-49d0-bb89-d83ba48c622c",
  })

  interface Note {
    key: string
    text: string
    createdAt: string
  }

  let notes: Note[] = $state([])
  let newNote = $state("")
  let loading = $state(false)
  let error = $state("")

  async function apiFetch(path: string, options?: RequestInit) {
    let jwt: string | null = null
    auth.subscribe((s) => (jwt = s.jwt))()

    if (!jwt) {
      throw new Error("Not authenticated")
    }
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        ...options?.headers,
      },
    })
    return res.json()
  }

  async function loadNotes() {
    loading = true
    error = ""
    try {
      const res = await apiFetch("/api/notes/list")
      if (res.success) {
        notes = res.data
      } else {
        error = res.error
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load notes"
    } finally {
      loading = false
    }
  }

  async function addNote() {
    if (!newNote.trim()) return
    try {
      const res = await apiFetch("/api/notes/create", {
        method: "POST",
        body: JSON.stringify({ text: newNote.trim() }),
      })
      if (res.success) {
        notes = [res.data, ...notes]
        newNote = ""
      } else {
        error = res.error
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to add note"
    }
  }

  async function deleteNote(key: string) {
    try {
      const res = await apiFetch(`/api/notes/${key}`, { method: "DELETE" })
      if (res.success) {
        notes = notes.filter((n) => n.key !== key)
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to delete note"
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }
</script>

{#if $auth.isLoading}
  <div class="container">
    <p class="muted">Authenticating...</p>
  </div>
{:else if $auth.error}
  <div class="container">
    <p class="error">Auth error: {$auth.error.message}</p>
  </div>
{:else if $auth.user}
  <div class="container">
    <header>
      <h1>Notes</h1>
      <p class="muted">Hi, {$auth.user.firstName}! It's test</p>
    </header>
    <form onsubmit={(e) => { e.preventDefault(); addNote() }}>
      <div class="input-row">
        <input
          bind:value={newNote}
          placeholder="Write a note..."
          maxlength="280"
        />
        <button type="submit" disabled={!newNote.trim()}>Add</button>
      </div>
    </form>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    {#if notes.length === 0 && !loading}
      <p class="muted center">No notes yet. Add one above or use /add in the bot.</p>
    {/if}

    <ul class="notes">
      {#each notes as note (note.key)}
        <li>
          <div class="note-content">
            <span>{note.text}</span>
            <span class="date">{formatDate(note.createdAt)}</span>
          </div>
          <button class="delete" onclick={() => deleteNote(note.key)}>✕</button>
        </li>
      {/each}
    </ul>

    <button class="load-btn" onclick={loadNotes} disabled={loading}>
      {loading ? "Loading..." : "Refresh"}
    </button>
  </div>
{:else}
  <div class="container">
    <p class="muted">Open this app from Telegram.</p>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--tg-theme-bg-color, #fff);
    color: var(--tg-theme-text-color, #000);
  }

  .container {
    max-width: 480px;
    margin: 0 auto;
    padding: 1rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 1rem;
  }

  h1 { margin: 0; font-size: 1.4rem; }

  .muted { color: var(--tg-theme-hint-color, #999); font-size: 0.85rem; }
  .center { text-align: center; margin-top: 2rem; }
  .error { color: #e53e3e; font-size: 0.85rem; }

  .input-row {
    display: flex;
    gap: 0.5rem;
  }

  input {
    flex: 1;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--tg-theme-hint-color, #ccc);
    border-radius: 8px;
    font-size: 0.95rem;
    background: var(--tg-theme-secondary-bg-color, #f5f5f5);
    color: var(--tg-theme-text-color, #000);
    outline: none;
  }

  button {
    padding: 0.6rem 1rem;
    border: none;
    border-radius: 8px;
    background: var(--tg-theme-button-color, #3390ec);
    color: var(--tg-theme-button-text-color, #fff);
    font-size: 0.95rem;
    cursor: pointer;
  }

  button:disabled { opacity: 0.5; cursor: default; }

  .notes {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
  }

  .notes li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border-bottom: 1px solid var(--tg-theme-hint-color, #eee);
  }

  .note-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .date { font-size: 0.75rem; color: var(--tg-theme-hint-color, #999); }

  .delete {
    background: none;
    color: var(--tg-theme-hint-color, #999);
    padding: 0.3rem 0.5rem;
    font-size: 0.85rem;
  }

  .load-btn {
    width: 100%;
    margin-top: 0.5rem;
    background: var(--tg-theme-secondary-bg-color, #f0f0f0);
    color: var(--tg-theme-text-color, #333);
  }
</style>
