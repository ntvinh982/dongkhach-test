// Gộp mỗi Edge Function thành MỘT file duy nhất để dán vào trình soạn thảo trên web Supabase
// (Dashboard → Edge Functions → Deploy a new function → Via Editor). Chạy: node scripts/make-dashboard-files.mjs
import fs from 'node:fs';
const FN = ['staff-admin', 'parse-orders', 'shop-signup'];
for (const name of FN) {
  const dir = new URL(`../supabase/functions/${name}/`, import.meta.url);
  const handler = fs.readFileSync(new URL('handler.ts', dir), 'utf8');
  const index = fs.readFileSync(new URL('index.ts', dir), 'utf8');
  const imports = [];
  const body = index.split('\n').filter(l => { if (/^import /.test(l)) { if (!/from '\.\/handler\.ts'/.test(l)) imports.push(l); return false; } return true; }).join('\n');
  const out = `// ${name} — bản MỘT FILE để dán vào Supabase Dashboard (Edge Functions → Via Editor).\n// Tạo tự động từ supabase/functions/${name}/ bằng scripts/make-dashboard-files.mjs. Đừng sửa tay.\n${imports.join('\n')}\n\n${handler}\n\n// ---- index.ts ----${body}`;
  fs.mkdirSync(new URL('../dashboard/', import.meta.url), { recursive: true });
  fs.writeFileSync(new URL(`../dashboard/${name}.ts`, import.meta.url), out);
  console.log('đã tạo dashboard/' + name + '.ts', out.length, 'ký tự');
}
