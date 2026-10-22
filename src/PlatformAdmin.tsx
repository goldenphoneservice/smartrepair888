import { useEffect, useState } from 'react';
import { requireSupabase } from './lib/supabase';

type Tenant = { id: string; name: string; slug: string };
export default function PlatformAdmin() {
  const [owner, setOwner] = useState<boolean | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [plan, setPlan] = useState('Bulanan');
  const [days, setDays] = useState('30');
  const [expires, setExpires] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('Memeriksa akses pemilik…');
  const [busy, setBusy] = useState(false);
  async function call(action: string, extra: Record<string, unknown> = {}) {
    const { data, error } = await requireSupabase().functions.invoke('platform-admin', { body: { action, ...extra } });
    if (error) throw new Error(error.message || 'Edge Function belum terpasang.');
    if (data?.error) throw new Error(data.error);
    return data;
  }
  useEffect(() => { (async () => { try { const check = await call('owner-check'); setOwner(!!check.isOwner); if (!check.isOwner) { setMessage('Akses ditolak. Menu ini khusus pemilik platform.'); return; } const result = await call('list-tenants'); setTenants(result.tenants || []); setMessage('Akses pemilik terverifikasi.'); } catch (e) { setOwner(false); setMessage(e instanceof Error ? e.message : 'Gagal memeriksa akses. Deploy Edge Function platform-admin terlebih dahulu.'); } })(); }, []);
  async function run(action: string, extra: Record<string, unknown>) { setBusy(true); setMessage('Memproses…'); try { const result = await call(action, extra); if (action === 'create-code') { setCode(result.code); setMessage('Kode dibuat. Salin dan simpan sekarang; kode mentah tidak ditampilkan lagi.'); } else { setMessage(`Aktivasi berhasil. Berakhir: ${new Date(result.ends_at).toLocaleString('id-ID')}`); } } catch (e) { setMessage(e instanceof Error ? e.message : 'Permintaan gagal.'); } finally { setBusy(false); } }
  if (owner !== true) return <section className="panel" style={{ padding: 24 }}><h2>Admin GPS-SMART</h2><p>{message}</p><p>Fitur ini memerlukan Edge Function <code>platform-admin</code> yang sudah dideploy dan akun yang terdaftar di <code>platform_owners</code>.</p></section>;
  return <div className="dashboard-grid"><section className="panel" style={{ padding: 24 }}><h2>Aktivasi langsung</h2><p>Pilih workspace, paket, dan masa aktif.</p><div className="field"><label>Workspace</label><select value={tenantId} onChange={e => setTenantId(e.target.value)}><option value="">Pilih toko…</option>{tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>)}</select></div><div className="field"><label>Nama paket</label><input value={plan} onChange={e => setPlan(e.target.value)} /></div><div className="field"><label>Durasi (hari)</label><input type="number" min="1" max="3650" value={days} onChange={e => setDays(e.target.value)} /></div><button className="primary-button" disabled={busy || !tenantId || !plan.trim()} onClick={() => void run('activate', { tenant_id: tenantId, plan_name: plan, duration_days: Number(days) })}>Aktifkan paket</button></section><section className="panel" style={{ padding: 24 }}><h2>Buat kode aktivasi</h2><p>Kode hanya ditampilkan sekali. Simpan sebelum menutup halaman.</p><div className="field"><label>Nama paket</label><input value={plan} onChange={e => setPlan(e.target.value)} /></div><div className="field"><label>Durasi (hari)</label><input type="number" min="1" max="3650" value={days} onChange={e => setDays(e.target.value)} /></div><div className="field"><label>Kedaluwarsa kode (opsional)</label><input type="datetime-local" value={expires} onChange={e => setExpires(e.target.value)} /></div><button className="primary-button" disabled={busy || !plan.trim()} onClick={() => void run('create-code', { plan_name: plan, duration_days: Number(days), expires_at: expires ? new Date(expires).toISOString() : null })}>Buat kode aktivasi</button>{code && <div className="success-message" style={{ marginTop: 12, padding: 12, overflowWrap: 'anywhere' }}><b>{code}</b><button className="secondary-button" onClick={() => void navigator.clipboard?.writeText(code)}>Salin kode</button></div>}</section><section className="panel" style={{ padding: 24, gridColumn: '1 / -1' }}><h2>Status</h2><p>{message}</p><p>Penukaran kode pelanggan menggunakan aksi server <code>redeem</code>; antarmuka penukaran pelanggan perlu dihubungkan sebelum diluncurkan.</p></section></div>;
}
