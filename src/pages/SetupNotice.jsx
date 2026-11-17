export default function SetupNotice() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="card max-w-xl p-8">
        <h1 className="text-xl font-bold">Connect MediBook to Supabase</h1>
        <p className="mt-2 text-sm text-muted">The app needs your Supabase project URL and anon key.</p>
        <ol className="mt-4 list-inside list-decimal space-y-2 text-sm">
          <li>Create a project at supabase.com.</li>
          <li>Run <code className="rounded bg-soft px-1">supabase/schema.sql</code> then <code className="rounded bg-soft px-1">supabase/seed.sql</code> in the SQL Editor.</li>
          <li>Copy <code className="rounded bg-soft px-1">.env.example</code> to <code className="rounded bg-soft px-1">.env</code> and fill in <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</li>
          <li>Restart <code className="rounded bg-soft px-1">npm run dev</code>.</li>
        </ol>
      </div>
    </div>
  )
}
