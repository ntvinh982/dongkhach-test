// shop-signup — bản MỘT FILE để dán vào Supabase Dashboard (Edge Functions → Via Editor).
// Tạo tự động từ supabase/functions/shop-signup/ bằng scripts/make-dashboard-files.mjs. Đừng sửa tay.
import { createClient } from 'npm:@supabase/supabase-js@2';

// Đăng ký quán mới: tạo quán (dùng thử), tài khoản quản lý đầu tiên và thông tin cửa hàng mặc định.
// Ai cũng gọi được (không cần đăng nhập), nên chống lạm dụng ở đây: ô bẫy cho bot, giới hạn theo IP và theo giờ.
// Chạy phía máy chủ vì cần service role key (không bao giờ đưa key này ra trình duyệt).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
export const LIMITS = { perIpPerDay: 3, perHourAll: 30, trialDays: 14 };
// Mã quán không được trùng các từ hệ thống hay dùng
const RESERVED = ['admin', 'administrator', 'root', 'api', 'app', 'www', 'support', 'help', 'test', 'demo', 'system', 'supabase', 'null', 'undefined'];
const WEAK = ['123456', '1234567', '12345678', '123456789', '654321', 'password', 'matkhau', 'abc123', 'qwerty', '000000', '111111'];

// deno-lint-ignore no-explicit-any
type Any = any;
export interface Deps {
  env: { url: string; serviceKey: string; emailSuffix: string };
  makeAdminClient: () => Any;
  now?: () => number;
  random?: () => number;   // để test chọn được số ngẫu nhiên
}

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// (giữ giống pwProblem trong staff-admin/handler.ts)
export function pwProblem(pw: unknown): string {
  if (typeof pw !== 'string' || pw.length < 6) return 'Mật khẩu ít nhất 6 ký tự.';
  if (pw.length > 72) return 'Mật khẩu quá dài (tối đa 72 ký tự).';
  if (/^(.)\1+$/.test(pw) || WEAK.includes(pw.toLowerCase())) return 'Mật khẩu quá dễ đoán, đặt khó hơn nhé.';
  return '';
}

// "Bánh Mì Cô Ba" -> "banhmicoba"
export function slugify(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'Chỉ nhận POST.' });
  const now = deps.now ?? Date.now;
  const rnd = deps.random ?? Math.random;
  const created: { shopId?: string; userId?: string } = {};
  const admin = deps.makeAdminClient();
  try {
    let body: Any;
    try { body = await req.json(); } catch { throw new HttpError(400, 'Dữ liệu gửi lên không đọc được.'); }
    if (body?.site) throw new HttpError(400, 'Yêu cầu không hợp lệ.');          // ô bẫy: người thật không thấy, bot hay điền

    const shopName = String(body?.shopName ?? '').replace(/\s+/g, ' ').trim();
    if (!shopName || shopName.length > 100) throw new HttpError(400, 'Nhập tên quán (tối đa 100 ký tự).');
    const username = String(body?.username ?? '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,}$/.test(username)) throw new HttpError(400, 'Tên đăng nhập: ít nhất 3 ký tự, không dấu, không cách.');
    const pe = pwProblem(body?.password); if (pe) throw new HttpError(400, pe);
    const phone = String(body?.phone ?? '').trim().slice(0, 40);

    // Giới hạn đăng ký (tính cả lần thất bại, để bot không thử mãi)
    const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? 'unknown').split(',')[0].trim();
    const ipHash = await sha256Hex('signup:' + ip);
    const dayAgo = new Date(now() - 24 * 3600_000).toISOString(), hourAgo = new Date(now() - 3600_000).toISOString();
    const { data: byIp, error: e1 } = await admin.from('signup_log').select('id').eq('ip_hash', ipHash).gte('created_at', dayAgo);
    const { data: byHour, error: e2 } = await admin.from('signup_log').select('id').gte('created_at', hourAgo);
    if (e1 || e2) throw new HttpError(500, 'Lỗi máy chủ, thử lại sau.');
    if ((byIp ?? []).length >= LIMITS.perIpPerDay) throw new HttpError(429, 'Đã tạo quá nhiều quán từ mạng này hôm nay. Thử lại ngày mai hoặc liên hệ nhà cung cấp.');
    if ((byHour ?? []).length >= LIMITS.perHourAll) throw new HttpError(429, 'Hệ thống đang nhận nhiều đăng ký, thử lại sau ít phút.');
    await admin.from('signup_log').insert({ ip_hash: ipHash });

    // 1. Quán (mã quán tự sinh từ tên, tránh trùng)
    const base = slugify(shopName);
    const rd = (n: number) => String(Math.floor(rnd() * 10 ** n)).padStart(n, '0');
    let slug = '', shop: Any = null;
    for (let i = 0; i < 6 && !shop; i++) {
      let cand = base.length >= 3 ? base : 'quan' + base + rd(3);
      if (i > 0) cand = (base.length >= 3 ? base : 'quan' + base).slice(0, 25) + rd(3);
      if (RESERVED.includes(cand)) cand = cand + rd(3);
      const { data: ex } = await admin.from('shops').select('id').eq('slug', cand).maybeSingle();
      if (ex) continue;
      const { data: made, error } = await admin.from('shops').insert({
        name: shopName, slug: cand, status: 'trial', trial_ends_at: new Date(now() + LIMITS.trialDays * 86400_000).toISOString(), contact_phone: phone,
      }).select('id,slug').maybeSingle();
      if (error) { if (error.code === '23505') continue; throw new HttpError(500, 'Không tạo được quán, thử lại sau.'); }
      shop = made; slug = cand;
    }
    if (!shop) throw new HttpError(409, 'Chưa tạo được mã quán, thử đổi tên quán khác nhé.');
    created.shopId = shop.id;

    // 2. Tài khoản quản lý đầu tiên
    const { data: u, error: cerr } = await admin.auth.admin.createUser({ email: `${username}@${slug}.${deps.env.emailSuffix}`, password: body.password, email_confirm: true, user_metadata: { username } });
    if (cerr || !u?.user) throw new HttpError(400, 'Không tạo được tài khoản: ' + (cerr?.message ?? ''));
    created.userId = u.user.id;
    const { error: perr } = await admin.from('profiles').insert({ id: u.user.id, shop_id: shop.id, username, name: 'Quản lý', role: 'admin', active: true, perms: {}, updated_by: 'signup' });
    if (perr) throw new HttpError(500, 'Không lưu được hồ sơ, thử lại sau.');

    // 3. Thông tin cửa hàng mặc định (in trên bill)
    const { error: serr } = await admin.from('settings').insert({ shop_id: shop.id, key: 'shop', data: { name: shopName, address: '', phone, thanks: 'Cảm ơn quý khách!\nChúc quý khách một ngày vui vẻ!', cutoff: '17:00' } });
    if (serr) throw new HttpError(500, 'Không lưu được thông tin quán, thử lại sau.');

    return reply(200, { ok: true, slug, trialDays: LIMITS.trialDays });
  } catch (e) {
    // Dọn dở dang. Xoá QUÁN trước (kéo theo hồ sơ và dữ liệu của quán), rồi mới xoá tài khoản đăng nhập:
    // làm ngược lại thì luật "luôn còn 1 quản lý" trong DB chặn việc xoá quản lý cuối cùng của quán.
    if (created.shopId) { try { await admin.from('shops').delete().eq('id', created.shopId); } catch (_) { /* bỏ qua */ } }
    if (created.userId) { try { await admin.auth.admin.deleteUser(created.userId); } catch (_) { /* bỏ qua */ } }
    if (e instanceof HttpError) return reply(e.status, { error: e.message });
    console.error(e);
    return reply(500, { error: 'Lỗi máy chủ, thử lại sau.' });
  }
}


// ---- index.ts ----
// SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY do Supabase tự cấp cho Edge Function.
// LOGIN_EMAIL_SUFFIX: đuôi cuối của email "giả" <tên>@<mã quán>.<đuôi> (mặc định app). Phải trùng với staff-admin và web/config.js.
const env = {
  url: Deno.env.get('SUPABASE_URL')!,
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  emailSuffix: Deno.env.get('LOGIN_EMAIL_SUFFIX') ?? 'app',
};

Deno.serve((req) => handle(req, {
  env,
  makeAdminClient: () => createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }),
}));
