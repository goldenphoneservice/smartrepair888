// GPS-SMART platform admin. Deploy as a Supabase Edge Function.
// Required server secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (never put these in frontend .env).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const hex = (bytes: Uint8Array) => [...bytes].map(x => x.toString(16).padStart(2, '0')).join('');
async function sha256(s: string) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))); }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Gunakan POST.' }, 405);
  const url = Deno.env.get('SUPABASE_URL'); const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Konfigurasi server belum lengkap.' }, 500);
  const authHeader = req.headers.get('Authorization'); if (!authHeader) return json({ error: 'Login diperlukan.' }, 401);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? serviceKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: 'Sesi tidak valid.' }, 401);
  const { data: owner } = await admin.from('platform_owners').select('user_id').eq('user_id', user.id).maybeSingle();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? '');
  // Customers can redeem a code; all other actions require platform owner.
  if (action !== 'redeem' && !owner) return json({ error: 'Akses khusus pemilik platform.' }, 403);
  if (action === 'owner-check') return json({ isOwner: !!owner });
  if (action === 'list-tenants') {
    const { data, error } = await admin.from('tenants').select('id,name,slug,created_at').order('created_at', { ascending: false }).limit(500);
    if (error) return json({ error: error.message }, 400); return json({ tenants: data ?? [] });
  }
  if (action === 'create-code') {
    const plan = String(body.plan_name ?? '').trim(); const days = Number(body.duration_days); const expires = body.expires_at ? String(body.expires_at) : null;
    if (!plan || !Number.isInteger(days) || days < 1 || days > 3650) return json({ error: 'Paket dan durasi 1–3650 hari wajib diisi.' }, 400);
    const raw = 'GPS-' + [...crypto.getRandomValues(new Uint8Array(12))].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    const { error } = await admin.from('platform_activation_codes').insert({ code_hash: await sha256(raw), plan_name: plan, duration_days: days, created_by: user.id, expires_at: expires });
    if (error) return json({ error: error.message }, 400);
    return json({ code: raw, warning: 'Simpan kode ini sekarang; kode mentah tidak disimpan di database.' });
  }
  if (action === 'activate') {
    const tenantId = String(body.tenant_id ?? ''); const plan = String(body.plan_name ?? '').trim(); const days = Number(body.duration_days);
    if (!tenantId || !plan || !Number.isInteger(days) || days < 1 || days > 3650) return json({ error: 'Toko, paket, dan durasi 1–3650 hari wajib diisi.' }, 400);
    const { data: tenant, error: te } = await admin.from('tenants').select('id').eq('id', tenantId).maybeSingle();
    if (te || !tenant) return json({ error: 'Workspace tidak ditemukan.' }, 404);
    const starts = new Date(); const ends = new Date(starts.getTime() + days * 86400000);
    const { error } = await admin.from('platform_subscriptions').upsert({ tenant_id: tenantId, plan_name: plan, status: 'active', starts_at: starts.toISOString(), ends_at: ends.toISOString(), activated_by: user.id, activation_method: 'admin', updated_at: starts.toISOString() }, { onConflict: 'tenant_id' });
    if (error) return json({ error: error.message }, 400); return json({ ok: true, ends_at: ends.toISOString() });
  }
  if (action === 'redeem') {
    const code = String(body.code ?? '').trim().toUpperCase(); const tenantId = String(body.tenant_id ?? '');
    if (!code || !tenantId) return json({ error: 'Kode dan workspace wajib diisi.' }, 400);
    const { data: membership } = await admin.from('memberships').select('tenant_id').eq('tenant_id', tenantId).eq('user_id', user.id).eq('is_active', true).maybeSingle();
    if (!membership) return json({ error: 'Akun ini bukan anggota aktif workspace tersebut.' }, 403);
    const { data: codeRow, error: ce } = await admin.from('platform_activation_codes').select('id,plan_name,duration_days,expires_at,is_revoked,redeemed_at').eq('code_hash', await sha256(code)).maybeSingle();
    if (ce || !codeRow || codeRow.is_revoked || codeRow.redeemed_at || (codeRow.expires_at && new Date(codeRow.expires_at) <= new Date())) return json({ error: 'Kode tidak valid, kedaluwarsa, atau sudah digunakan.' }, 400);
    // Claim atomically: only one concurrent request can change redeemed_at from NULL.
    const now = new Date(); const ends = new Date(now.getTime() + Number(codeRow.duration_days) * 86400000);
    const { data: claimed, error: claimErr } = await admin.from('platform_activation_codes').update({ redeemed_by_tenant: tenantId, redeemed_at: now.toISOString() }).eq('id', codeRow.id).is('redeemed_at', null).is('redeemed_by_tenant', null).eq('is_revoked', false).select('id').maybeSingle();
    if (claimErr || !claimed) return json({ error: 'Kode sudah ditukarkan. Minta kode baru kepada admin.' }, 409);
    const { error: subErr } = await admin.from('platform_subscriptions').upsert({ tenant_id: tenantId, plan_name: codeRow.plan_name, status: 'active', starts_at: now.toISOString(), ends_at: ends.toISOString(), activation_method: 'code', updated_at: now.toISOString() }, { onConflict: 'tenant_id' });
    if (subErr) { await admin.from('platform_activation_codes').update({ redeemed_by_tenant: null, redeemed_at: null }).eq('id', codeRow.id).eq('redeemed_by_tenant', tenantId); return json({ error: subErr.message }, 400); }
    return json({ ok: true, plan_name: codeRow.plan_name, ends_at: ends.toISOString() });
  }
  return json({ error: 'Aksi tidak dikenal.' }, 400);
});
