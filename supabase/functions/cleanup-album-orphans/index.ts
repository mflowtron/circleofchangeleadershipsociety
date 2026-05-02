// Scheduled job: removes album-photos storage objects that have no matching
// album_photos row (orphans from failed inserts). Only deletes files older
// than 1 hour to avoid racing with in-flight uploads.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'album-photos';
const MIN_AGE_MS = 60 * 60 * 1000; // 1 hour grace period
const PAGE_SIZE = 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1) Load every known storage_path from the DB into a Set
    const knownPaths = new Set<string>();
    {
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('album_photos')
          .select('storage_path')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const row of data) knownPaths.add(row.storage_path);
        if (data.length < PAGE) break;
        from += PAGE;
      }
    }

    // 2) Walk every user folder in the bucket and find orphans
    const cutoff = Date.now() - MIN_AGE_MS;
    const orphans: string[] = [];
    let scanned = 0;

    let folderOffset = 0;
    while (true) {
      const { data: folders, error: folderErr } = await supabase.storage
        .from(BUCKET)
        .list('', { limit: PAGE_SIZE, offset: folderOffset });
      if (folderErr) throw folderErr;
      if (!folders || folders.length === 0) break;

      for (const folder of folders) {
        // Skip non-folders (storage list returns id=null for folders)
        if (folder.id) continue;

        let fileOffset = 0;
        while (true) {
          const { data: files, error: fileErr } = await supabase.storage
            .from(BUCKET)
            .list(folder.name, { limit: PAGE_SIZE, offset: fileOffset });
          if (fileErr) throw fileErr;
          if (!files || files.length === 0) break;

          for (const file of files) {
            if (!file.id) continue; // skip subfolders
            scanned++;
            const fullPath = `${folder.name}/${file.name}`;
            const created = file.created_at
              ? new Date(file.created_at).getTime()
              : 0;
            if (!knownPaths.has(fullPath) && created < cutoff) {
              orphans.push(fullPath);
            }
          }

          if (files.length < PAGE_SIZE) break;
          fileOffset += PAGE_SIZE;
        }
      }

      if (folders.length < PAGE_SIZE) break;
      folderOffset += PAGE_SIZE;
    }

    // 3) Delete orphans in batches of 100
    let deleted = 0;
    for (let i = 0; i < orphans.length; i += 100) {
      const batch = orphans.slice(i, i + 100);
      const { error } = await supabase.storage.from(BUCKET).remove(batch);
      if (error) {
        console.error('Failed to remove batch', error);
        continue;
      }
      deleted += batch.length;
    }

    const summary = {
      scanned,
      known: knownPaths.size,
      orphans: orphans.length,
      deleted,
      timestamp: new Date().toISOString(),
    };
    console.log('cleanup-album-orphans', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('cleanup-album-orphans failed', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
