
(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const vnd=n=>Math.round(n||0).toLocaleString('vi-VN')+'đ';
const kvnd=n=>{n=Math.round(n||0); if(n>=1e6) return (n/1e6).toLocaleString('vi-VN',{maximumFractionDigits:1})+'tr'; if(n>=1e3) return Math.round(n/1e3)+'k'; return String(n)};
const pad=n=>String(n).padStart(2,'0');
const dstr=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const dparse=s=>new Date(s+'T00:00:00');
const ddm=s=>s.slice(8,10)+'/'+s.slice(5,7);
const newId=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const WD=['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'];
const PAY={unpaid:'Chưa thu',cash:'Đã thu · Tiền mặt',transfer:'Đã thu · CK'};
// "Không thu" = shipper không thu tiền khi giao, khách trả sau → vẫn là đơn chưa thu
const payOf=o=>(o.payment==='cash'||o.payment==='transfer')?o.payment:'unpaid';
const noCol=o=>!!(o.noCollect||o.payment==='free');
const payLabel=o=>payOf(o)==='unpaid'&&noCol(o)?'Chưa thu · trả sau':PAY[payOf(o)];
const payCls=o=>payOf(o)==='unpaid'&&noCol(o)?'later':payOf(o);
/* ---------- loại hình kinh doanh: Ăn uống (food) hoặc Bán sản phẩm (retail). Chỉ đổi cách gọi tên và vài mặc định, không đổi dữ liệu hay quyền ---------- */
const BIZKEY='dk_biz_v1';
function bizType(){
  if(S.me&&S.loaded&&S.loaded.settings){
    const r=S.settings.find(x=>x.id==='biz'), t=r&&r.type==='retail'?'retail':'food';
    try{const m=JSON.parse(localStorage.getItem(BIZKEY)||'{}')||{}, k=shopSlug(); if(k&&m[k]!==t){m[k]=t;localStorage.setItem(BIZKEY,JSON.stringify(m))}}catch(_){}
    return t;
  }
  // chưa tải xong (màn hình đăng nhập, lúc mở app): dùng loại hình đã nhớ của quán này trên máy
  try{const m=JSON.parse(localStorage.getItem(BIZKEY)||'{}')||{}; return m[S.me?shopSlug():shopCodeDefault()]==='retail'?'retail':'food'}catch(_){return 'food'}
}
const isRetail=()=>bizType()==='retail';
// W.m = "món" / "sản phẩm", W.M = viết hoa đầu câu, W.u = đơn vị đếm trong báo cáo. Dùng trong chuỗi hiển thị: ${W.m}
const W={get m(){return isRetail()?'sản phẩm':'món'},get M(){return isRetail()?'Sản phẩm':'Món'},get u(){return isRetail()?'sp':'phần'}};
// Chuỗi viết sẵn ở đầu file (tên quyền, mô tả vai trò) chạy trước khi biết loại hình → đổi chữ lúc hiển thị
const tw=s=>isRetail()?String(s).replace(/(?<![\p{L}\p{N}])([Mm])ón(?![\p{L}\p{N}])/gu,(_,c)=>c==='M'?'Sản phẩm':'sản phẩm'):s;
// Đơn vị tính chọn nhanh trong form món / sản phẩm
const UNITS={food:['Phần','Ly','Hộp','Chai','Lon','Cái','Kg'],retail:['Cái','Hộp','Chai','Tuýp','Lọ','Bộ','Gói','Kg']};
const ROLE={admin:'Quản lý',cashier:'Thu ngân',shipper:'Shipper'};
const ROLE_HINT={admin:'Toàn quyền: báo cáo, nhân viên và phân quyền, thông tin cửa hàng, xoá dữ liệu.',cashier:'Mặc định: tạo/sửa đơn, thu tiền, in bill, gán shipper, quản lý khách và món (không xoá, không xem báo cáo). Có thể chỉnh lại bên dưới.',shipper:'Mặc định: chỉ xem các đơn giao được gán cho tài khoản này trong 5 ngày (3 ngày trước, hôm nay, ngày mai), thu tiền và đánh dấu đã giao chỉ ở đơn hôm nay. Có thể cấp thêm quyền bên dưới.'};
const roleOf=s=>!s?'':(s.role==='staff'?'cashier':s.role); // tài khoản cũ "Nhân viên" = Thu ngân
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d');
const digits=s=>String(s||'').replace(/\D/g,'');
const byName=(a,b)=>String(a.name||'').localeCompare(String(b.name||''),'vi');
const IC={
  orders:'<path d="M9 3.5h6v3H9z"/><path d="M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><path d="M8.5 11.5h7M8.5 15.5h5"/>',
  customers:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3 2.8-4.7 5.5-4.7s4.9 1.7 5.5 4.7"/><path d="M15.5 5a3 3 0 0 1 0 5.8M17 14.8c1.8.6 2.9 2.1 3.3 4.7"/>',
  report:'<path d="M4 20h16"/><path d="M7 16.5v-5M12 16.5V7M17 16.5v-8"/>',
  settings:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  print:'<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="1.5"/><path d="M7 14h10v6H7z"/>',
  logout:'<path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M9.5 8 5.5 12l4 4M5.5 12H15"/>',
  menu:'<path d="M4 6.5h16M4 12h16M4 17.5h10"/>',
  staff:'<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c.7-3.6 3.3-5.6 6.5-5.6s5.8 2 6.5 5.6"/>',
  key:'<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5 19 4M16 7l2.5 2.5M14 9l2 2"/>',
  chev:'<path d="m10 7 5 5-5 5"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.2" r="1"/><circle cx="14.5" cy="7.2" r="1"/>',
  paste:'<path d="M9 4h6v3H9z"/><path d="M15 5.5h2a1 1 0 0 1 1 1V10M9 5.5H7a1 1 0 0 0-1 1V19a1 1 0 0 0 1 1h4"/><rect x="12" y="11" width="8" height="10" rx="1.5"/><path d="M14.5 15h3M14.5 18h3"/>'
};
const icon=(k,c='ic')=>`<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;

const S={db:null,state:'connecting',authId:null,booted:false,loginMsg:'',
  menu:[],groups:[],customers:[],orders:[],staff:[],shops:[],costs:[],
  loaded:{menu:false,groups:false,customers:false,orders:false,staff:false,settings:false,shops:false,costs:false},settings:[],
  me:null,view:'orders',sub:null,
  date:dstr(new Date()),filter:'all',q:'',unsub:null,
  rep:{preset:'7d',from:'',to:'',orders:[],loaded:false,unsub:null,topBy:'rev'}};
const isAdmin=()=>!!S.me&&roleOf(S.me)==='admin';
const shopRow=()=>S.shops[0]||null;
const shopSlug=()=>(shopRow()||{}).slug||'';
const brandName=()=>(shopRow()||{}).name||'';
// Logo của quán (Cài đặt → Logo và màu giao diện). Chưa có logo thì hiện chữ cái đầu của tên quán.
const initialOf=()=>esc((brandName()||CFG.brandName||'Đ').trim().charAt(0).toUpperCase());
const markHtml=(logo,big)=>logo?`<img class="mark logo${big?' big':''}" src="${logo}" alt="">`:`<span class="mark${big?' big':''}" aria-hidden="true">${initialOf()}</span>`;
const logoOf=(code,big)=>markHtml(brandNow().logo,big);
// Hạn dùng của quán: số mili-giây còn lại, hoặc null nếu không giới hạn
function planLeft(){const s=shopRow(); if(!s) return null; const t=s.status==='trial'?s.trialEndsAt:s.paidUntil; return t?t-Date.now():null}
function planBanner(){
  const s=shopRow(); const left=planLeft(); if(!s||left===null) return '';
  const contact=CFG.supportContact?' Liên hệ: '+esc(CFG.supportContact)+'.':'';
  if(left<=0) return `<div class="banner warn"><span>${s.status==='trial'?'Đã hết hạn dùng thử':'Gói đã hết hạn'}. Bạn vẫn xem được dữ liệu nhưng chưa thêm/sửa được.${contact}</span></div>`;
  const days=Math.ceil(left/864e5);
  if(isAdmin()&&(s.status==='trial'||days<=7)) return `<div class="banner"><span>${s.status==='trial'?'Đang dùng thử':'Gói trả phí'} · còn ${days} ngày.${contact}</span></div>`;
  return '';
}
/* ---------- phân quyền chi tiết ----------
   Mỗi quyền là một chức năng. Vai trò cho bộ quyền mặc định, quản lý có thể bật/tắt riêng từng người (lưu ở staff.perms,
   chỉ lưu phần khác mặc định). Quản lý luôn toàn quyền. Quyền con tự tắt nếu quyền cha bị tắt (PERM_DEP).
   Lưu ý: đây là chặn ở giao diện app, không phải khoá bảo mật phía máy chủ. */
const PERM_GROUPS=[
  ['Đơn hàng',[
    ['order.all','Xem tất cả đơn','Tắt = chỉ thấy đơn giao được gán cho mình trong 5 ngày (3 ngày trước → ngày mai). Vai trò Shipper không thể bật quyền này'],
    ['order.create','Tạo đơn mới',''],
    ['order.edit','Sửa đơn','Mở và sửa nội dung đơn đã ghi'],
    ['order.pay','Thu tiền và xác nhận đã giao','Nút Tiền mặt, Chuyển khoản, Đã giao'],
    ['order.print','In bill',''],
    ['order.assign','Tổng quan và gán shipper','Cần quyền Xem tất cả đơn'],
    ['order.delete','Xoá đơn','Cần quyền Sửa đơn']]],
  ['Khách hàng',[
    ['cust.view','Xem danh sách khách',''],
    ['cust.edit','Thêm, sửa khách','Cần quyền Xem danh sách khách'],
    ['cust.delete','Xoá khách','Cần quyền Thêm, sửa khách'],
    ['cust.import','Nhập khách từ Excel/CSV','']]],
  ['Món và cửa hàng',[
    ['menu.edit','Sửa danh mục món',''],
    ['menu.delete','Xoá món, nhóm món','Cần quyền Sửa danh mục món'],
    ['shop.edit','Sửa thông tin cửa hàng và bill','']]],
  ['Báo cáo',[
    ['report.view','Xem báo cáo doanh thu',''],
    ['cost.view','Xem và sửa giá vốn, lợi nhuận','Giá vốn từng món, lãi trên báo cáo. Shipper không bao giờ được cấp']]]
];
const ROLE_PERMS={admin:null,cashier:['order.all','order.create','order.edit','order.pay','order.print','order.assign','cust.view','cust.edit','menu.edit'],shipper:[]};
const PERM_DEP={'order.assign':'order.all','order.delete':'order.edit','cust.edit':'cust.view','cust.delete':'cust.edit','menu.delete':'menu.edit'};
const ALL_PERMS=PERM_GROUPS.flatMap(g=>g[1].map(p=>p[0]));
// Shipper KHÔNG BAO GIỜ được xem đơn của người khác: 3 quyền này bị khoá cứng cho vai trò shipper (cả ở máy chủ lẫn ở đây).
const SHIP_DENY=['order.all','report.view','order.assign','cust.view','cust.edit','cust.delete','cust.import','order.create','cost.view'];
const permLocked=(r,k)=>r==='shipper'&&SHIP_DENY.includes(k);
const roleDefault=r=>{const l=ROLE_PERMS[r]||[],m={};ALL_PERMS.forEach(k=>m[k]=l.includes(k));return m};
function permsOf(st){
  const r=roleOf(st), m={};
  if(r==='admin'){ALL_PERMS.forEach(k=>m[k]=true);return m}
  const d=roleDefault(r), o=st&&st.perms&&typeof st.perms==='object'?st.perms:{};
  ALL_PERMS.forEach(k=>{m[k]=typeof o[k]==='boolean'?o[k]:d[k]; if(PERM_DEP[k]&&!m[PERM_DEP[k]]) m[k]=false; if(permLocked(r,k)) m[k]=false});
  return m;
}
const can=k=>!!S.me&&permsOf(S.me)[k]===true;
const restricted=()=>!can('order.all');   // không có quyền xem tất cả: chỉ thấy đơn giao được gán cho mình trong 5 ngày (3 ngày trước → ngày mai)
const NOPERM='Tài khoản này chưa được cấp quyền này.';
const shippers=()=>S.staff.filter(s=>roleOf(s)==='shipper'&&s.active!==false).sort(byName);
const shipperLabel=o=>{const s=o.shipperId&&S.staff.find(x=>x.id===o.shipperId);return s?s.name:(o.shipperName||'')};
// Shipper chỉ thấy đơn giao trong ngày hôm nay được gán đúng cho mình
// Shipper (không có quyền xem tất cả đơn) xem được đơn giao gán cho mình trong 5 ngày: 3 ngày trước → hôm nay → ngày mai. Chỉ đơn hôm nay mới thao tác (thu tiền, đã giao) được.
const SHIP_BACK=3, SHIP_FWD=1;
const shipRange=()=>{const t=new Date(),a=new Date(t),b=new Date(t); a.setDate(a.getDate()-SHIP_BACK); b.setDate(b.getDate()+SHIP_FWD); return [dstr(a),dstr(b)]};
const shipClamp=ds=>{const [lo,hi]=shipRange(); return ds<lo?lo:ds>hi?hi:ds};
const offDay=o=>restricted()&&o.date!==dstr(new Date());          // đơn ngày khác của shipper: chỉ xem
const visibleOrders=()=>{ if(!restricted()) return S.orders; const [lo,hi]=shipRange(); return S.orders.filter(o=>o.mode!=='lay'&&o.shipperId===S.me.id&&o.date>=lo&&o.date<=hi) };
// Mỗi thao tác trên giao diện ứng với đúng một quyền. Thao tác không có trong bảng này bị từ chối.
const ACT_PERM={
  nav:null,logout:null,filter:null,copy:null,close:null,'change-pw':null,'save-pw':null,theme:null,'sub-back':null,
  qty:null,gtab:null,seg:null,time:null,pick:null,unpick:null,clearcust:null,
  day:null,today:null,   // shipper cũng chuyển ngày được, nhưng chỉ trong 5 ngày (xem shipRange)
  layout:'order.assign','ship-filter':'order.assign','sel-unassigned':'order.assign','sel-all':'order.assign','sel-clear':'order.assign','bulk-assign':'order.assign',
  'new-order':'order.create','order-for':'order.create','save-order':'*order',
  'cmt-open':'order.create','cmt-read':'order.create','cmt-post':'order.create','cmt-pall':'order.create','cmt-save':'order.create','cmt-back':'order.create','cmt-rmimg':'order.create','cmt-mode':'order.create','cmt-pick':'order.create','cmt-qty':'order.create','cmt-rmitem':'order.create','cmt-additem':'order.create',
  'edit-order':'order.edit',pay:'order.pay',deliver:'order.pay',
  'print-one':'order.print','print-all':'order.print','save-bill':'order.print','print-now':'order.print',
  'open-order':'report.view',preset:'report.view',topby:'report.view',
  'new-cust':'cust.edit','edit-cust':'cust.edit','save-cust':'cust.edit',
  'imp-open':'cust.import','imp-paste':'cust.import','imp-mode':'cust.import','imp-run':'cust.import','imp-template':'cust.import','imp-view':'cust.import',
  'sub-menu':'menu.edit','new-group':'menu.edit','edit-group':'menu.edit','save-group':'menu.edit','new-menu':'menu.edit','edit-menu':'menu.edit','save-menu':'menu.edit','menu-toggle':'menu.edit','unit-pick':'menu.edit',
  'biz-form':'shop.edit','biz-pick':'shop.edit','biz-save':'shop.edit',
  'shop-form':'shop.edit','save-shop':'shop.edit','brand-form':'shop.edit','brand-save':'shop.edit','brand-accent':'shop.edit','brand-rmlogo':'shop.edit',
  'sub-staff':'admin','new-staff':'admin','edit-staff':'admin','save-staff':'admin','del-staff':'admin','perm-reset':'admin','clear-sample':'admin',
  del:'*del'
};
const DEL_PERM={orders:'order.delete',customers:'cust.delete',menu:'menu.delete',groups:'menu.delete'};
function actAllowed(a,el){
  if(!S.me||!(a in ACT_PERM)) return false;
  let k=ACT_PERM[a];
  if(k===null) return true;
  if(k==='*order') k=(F&&F.id)?'order.edit':'order.create';
  else if(k==='*del') k=DEL_PERM[el&&el.dataset?el.dataset.col:'']||'admin';
  return k==='admin'?isAdmin():can(k);
}
// Quản lý + người được cấp quyền xem bảng tổng quan và gán shipper
const canAssign=()=>can('order.assign');
const curLay=()=>canAssign()?S.layout:'cards';
const LKEY='lyly_layout_v1'; let memLayout='cards';
function layoutGet(){let v; try{v=localStorage.getItem(LKEY)}catch(_){v=memLayout} return v==='table'||v==='assign'?v:'cards'}
function layoutSet(v){memLayout=v;try{localStorage.setItem(LKEY,v)}catch(_){}}
S.layout=layoutGet(); S.sel=new Set(); S.shipFilter='all'; S.bulkShip='';
const itemsText=o=>(o.items||[]).map(it=>`${it.qty}× ${esc(it.name)}`).join(', ');
const payShort=o=>payOf(o)==='unpaid'?(noCol(o)?'Trả sau':'Chưa thu'):(payOf(o)==='cash'?'Đã thu · TM':'Đã thu · CK');
async function assignShipper(ids,shipperId){
  if(!canAssign()){toast('Bạn không có quyền gán shipper.');return false}
  const s=shipperId?S.staff.find(x=>x.id===shipperId&&roleOf(x)==='shipper'&&x.active!==false):null;
  if(shipperId&&!s){toast('Không tìm thấy shipper này.');return false}
  const list=ids.map(i=>S.orders.find(o=>o.id===i)).filter(o=>o&&o.mode!=='lay');
  if(!list.length) return false;
  const now=Date.now();
  try{
    await Promise.all(list.map(o=>patch('orders',o.id,{shipperId:s?s.id:'',shipperName:s?s.name:'',updatedAt:now,updatedBy:S.me.name})));
    toast(s?`Đã gán ${list.length} đơn cho ${s.name}`:`Đã bỏ gán ${list.length} đơn`);
    return true;
  }catch(e){fail(e);return false}
}
const gOrd=g=>Math.max(0,parseInt(g&&g.order,10)||0);
function groupsSorted(){return [...S.groups].sort((a,b)=>{const ao=gOrd(a),bo=gOrd(b); if((ao===0)!==(bo===0)) return ao===0?1:-1; return ao-bo||byName(a,b)})}
const groupOf=m=>m&&m.groupId?S.groups.find(g=>g.id===m.groupId):null;

const WEAK_PW=['123456','1234567','12345678','123456789','654321','password','matkhau','abc123','qwerty','000000','111111'];
function pwProblem(pw){
  if(pw.length<6) return 'Mật khẩu ít nhất 6 ký tự.';
  if(/^(.)\1+$/.test(pw)||WEAK_PW.includes(pw.toLowerCase())) return 'Mật khẩu quá dễ đoán, đặt khó hơn nhé.';
  return '';
}
// Chống đoán mật khẩu: sai 5 lần thì khoá đăng nhập trên máy này một lúc (chỉ là rào cản, không thay được khoá phía máy chủ)
const LOCKK='lyly_login_v1'; let memFail={n:0,until:0};
function lockGet(){try{return JSON.parse(localStorage.getItem(LOCKK)||'null')||memFail}catch(_){return memFail}}
function lockSet(v){memFail=v;try{localStorage.setItem(LOCKK,JSON.stringify(v))}catch(_){}}
const lockLeft=()=>Math.max(0,Math.ceil(((lockGet().until||0)-Date.now())/1000));
function noteFail(){const v=lockGet(); v.n=(v.n||0)+1; if(v.n%5===0) v.until=Date.now()+Math.min(v.n/5,6)*60000; lockSet(v); return 5-(v.n%5)}
function noteOk(){lockSet({n:0,until:0})}

/* ---------- storage (Supabase) ---------- */
const CFG=window.LYLY_CONFIG||{};
// Phiên đăng nhập lưu trên máy (khoá lyly_auth_v1) mà thuộc dự án Supabase KHÁC (vd: app Lyly Food cũ cùng tên miền github.io)
// thì bỏ đi trước khi mở, để hiện màn hình đăng nhập thay vì treo "Đang tải…".
try{
  const old=localStorage.getItem('lyly_auth_v1');
  if(old&&CFG.supabaseUrl){
    const tok=String((JSON.parse(old)||{}).access_token||'').split('.')[1]||'';
    const iss=String((JSON.parse(atob(tok.replace(/-/g,'+').replace(/_/g,'/')))||{}).iss||'');
    if(iss&&iss.indexOf(String(CFG.supabaseUrl).replace(/\/+$/,'')+'/')!==0) localStorage.removeItem('lyly_auth_v1');
  }
}catch(_){}
const sb=(window.supabase&&CFG.supabaseUrl&&CFG.supabaseAnonKey&&!/YOUR[-_]/i.test(CFG.supabaseUrl+CFG.supabaseAnonKey))
  ?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'lyly_auth_v1'}}):null;
// Email đăng nhập "giả" = <tên đăng nhập>@<mã quán>.<đuôi>; phải trùng LOGIN_EMAIL_SUFFIX của Edge Function.
const EMAIL_SUFFIX=CFG.emailSuffix||'app';
const emailOf=(u,code)=>u+'@'+String(code||'').toLowerCase()+'.'+EMAIL_SUFFIX;
const SHOPK='lyly_shop_code_v1';
function shopCodeGet(){try{return localStorage.getItem(SHOPK)||''}catch(_){return ''}}
function shopCodeSet(v){try{localStorage.setItem(SHOPK,v)}catch(_){}}
// Link riêng cho từng quán: https://.../?quan=banhmicoba điền sẵn mã quán (chỉ điền sẵn, vẫn phải nhập tên đăng nhập + mật khẩu)
function shopCodeFromUrl(){try{const v=(new URLSearchParams(location.search).get('quan')||'').trim().toLowerCase();return /^[a-z0-9]{3,30}$/.test(v)?v:''}catch(_){return ''}}
// Nhập đơn từ comment Facebook (AI): enableAI:false trong config.js = tắt hẳn cho mọi quán (công tắc tổng);
// bật thì quán nào được nhà cung cấp bật riêng (cột shops.ai_enabled, chủ quán không tự đổi được) mới thấy nút.
const AI_ON=CFG.enableAI!==false;
const aiOn=()=>AI_ON&&!!(shopRow()&&shopRow().aiEnabled===true);
// Số phiên bản hiện ở cuối Cài đặt: để biết quán/máy nào đang chạy bản nào. Đổi mỗi lần đưa bản mới lên cho khách (dạng năm.tháng.ngày).
const APP_VERSION='2026.10.29';
const shopCodeDefault=()=>shopCodeFromUrl()||shopCodeGet()||CFG.defaultShop||'';
S.db=!!sb;
const TBL={staff:'profiles',menu:'menu_items',groups:'menu_groups',customers:'customers',orders:'orders',settings:'settings',shops:'shops',costs:'menu_costs'};
// [khoá trong app, cột trong DB, cờ]. Cờ 'ts' = thời gian (đọc ra thành mili giây), 'ro' = do máy chủ ghi, không gửi lên.
const FIELDS={
  staff:[['username','username'],['name','name'],['role','role'],['active','active'],['perms','perms'],['theme','theme'],['createdAt','created_at','ts'],['updatedBy','updated_by','ro']],
  menu:[['name','name'],['price','price'],['unit','unit'],['groupId','group_id'],['active','active'],['sample','sample'],['createdAt','created_at','ts']],
  groups:[['name','name'],['order','sort_order'],['sample','sample'],['createdAt','created_at','ts']],
  costs:[['cost','cost'],['updatedAt','updated_at','ts']],   // giá vốn: id = id của món; chỉ người có quyền cost.view đọc/ghi được (máy chủ chặn)
  customers:[['name','name'],['phone','phone'],['address','address'],['note','note'],['sample','sample'],['imported','imported'],['createdAt','created_at','ts']],
  shops:[['name','name'],['slug','slug','ro'],['status','status','ro'],['trialEndsAt','trial_ends_at','ts'],['paidUntil','paid_until','ts'],['contactPhone','contact_phone'],['contactEmail','contact_email'],['createdAt','created_at','ts'],['aiEnabled','ai_enabled','ro']],
  orders:[['date','date'],['time','time'],['mode','mode'],['customerId','customer_id'],['name','name'],['phone','phone'],['address','address'],['items','items'],['total','total'],['note','note'],['payment','payment'],['noCollect','no_collect'],['delivered','delivered'],['shipperId','shipper_id'],['shipperName','shipper_name'],['sample','sample','ro'],['createdAt','created_at','ts'],['updatedAt','updated_at','ts'],['createdBy','created_by','ro'],['createdById','created_by_id','ro'],['updatedBy','updated_by','ro']]
};
function toRow(col,doc){
  const row={};
  for(const [k,c,f] of FIELDS[col]){ if(f||doc[k]===undefined) continue; row[c]=(c==='shipper_id')?(doc[k]||null):doc[k] }
  return row;
}
function fromRow(col,r){
  if(col==='settings') return Object.assign({id:r.key},r.data||{});
  const d={id:r.id};
  for(const [k,c,f] of FIELDS[col]){
    let v=r[c];
    if(f==='ts') v=v?Date.parse(v):0;
    else if(v===null||v===undefined) v=(c==='theme'||c==='updated_by')?undefined:'';
    d[k]=v;
  }
  return d;
}
const known=(col,id)=>col==='orders'?(S.orders.some(o=>o.id===id)||S.rep.orders.some(o=>o.id===id)):S[col].some(x=>x.id===id);
async function patchRow(col,id,row){
  const {data,error}=await sb.from(TBL[col]).update(row).eq('id',id).select('id');
  if(error) throw error;
  if(!data||!data.length) throw {code:'forbidden',message:'Không có quyền hoặc không tìm thấy dữ liệu.'};
}
async function put(col,id,data){
  if(col==='settings'){const {error}=await sb.from('settings').upsert({key:id,data}); if(error) throw error; return}
  const row=toRow(col,data);
  if(known(col,id)) return patchRow(col,id,row);
  const {error}=await sb.from(TBL[col]).insert(Object.assign({id},row)); if(error) throw error;
}
const patch=(col,id,data)=>patchRow(col,id,toRow(col,data));
async function del(col,id){
  const {data,error}=await sb.from(TBL[col]).delete().eq('id',id).select('id');
  if(error) throw error;
  if(!data||!data.length) throw {code:'forbidden',message:'Không có quyền hoặc không tìm thấy dữ liệu.'};
}
function fail(e){
  const c=e&&e.code, m=String((e&&e.message)||'');
  if(c==='app') toast(m);
  else if(c==='forbidden'||(c==='42501'&&/row-level security|permission denied/i.test(m))) toast(NOPERM);
  else if(c==='42501') toast(m);                       // thông báo tiếng Việt từ trigger trong DB
  else if(c==='same_password') toast('Mật khẩu mới phải khác mật khẩu cũ.');
  else if(/Failed to fetch|NetworkError|network|Load failed/i.test(m)) toast('Mất kết nối mạng, bạn thử lại nhé.');
  else if(c==='PGRST301'||c==='PGRST303'||e&&e.status===401||/JWT|token.*expired|not authenticated/i.test(m)) toast('Phiên đăng nhập đã hết hạn. Bạn tải lại trang (F5) rồi đăng nhập lại nhé.');
  else toast('Chưa lưu được'+(c||m?' ('+[c,m.slice(0,90)].filter(Boolean).join(': ')+')':'')+'. Bạn thử lại nhé.');   // kèm mã lỗi để dễ tìm nguyên nhân
  console.error(e);
}
async function fnCall(name,body){
  const {data,error}=await sb.functions.invoke(name,{body});
  if(error){
    let m='Chưa lưu được, bạn thử lại nhé.';
    try{ if(error.context&&error.context.json){const j=await error.context.json(); if(j&&j.error) m=j.error} }catch(_){}
    throw {code:'app',message:m};
  }
  if(data&&data.error) throw {code:'app',message:data.error};
  return data;
}
const staffCall=b=>fnCall('staff-admin',b);
// Đọc hết bảng theo từng trang 1000 dòng (Supabase giới hạn mỗi lần trả về)
async function fetchAll(table,build){
  const out=[];
  for(let from=0;;from+=1000){
    let q=sb.from(table).select('*'); if(build) q=build(q);
    const {data,error}=await q.order(table==='settings'?'key':'id').range(from,from+999);
    if(error) throw error;
    out.push(...data); if(data.length<1000) break;
  }
  return out;
}
// Theo dõi một truy vấn: tải ngay, tải lại khi có thay đổi (Realtime), khi quay lại tab, và 30 giây một lần phòng khi mất kết nối realtime.
function watch(table,filter,load,cb){
  let t=null,stopped=false,seq=0;
  const run=async()=>{
    const my=++seq;
    try{const rows=await load(); if(!stopped&&my===seq) cb(rows)}catch(e){console.error(e)}
  };
  const sched=()=>{clearTimeout(t);t=setTimeout(run,120)};
  const ch=sb.channel('w_'+table+'_'+Math.random().toString(36).slice(2))
    .on('postgres_changes',Object.assign({event:'*',schema:'public',table},filter?{filter}:{}),sched)
    .subscribe(st=>{if(st==='SUBSCRIBED') sched()});
  const poll=setInterval(run,30000), vis=()=>{if(!document.hidden) run()};
  document.addEventListener('visibilitychange',vis);
  run();
  return ()=>{stopped=true;clearTimeout(t);clearInterval(poll);document.removeEventListener('visibilitychange',vis);try{sb.removeChannel(ch)}catch(_){}};
}
function subOrders(){
  if(S.unsub){S.unsub();S.unsub=null}
  S.loaded.orders=false;
  if(!sb||!S.authId) return;
  const day=S.date;
  S.unsub=watch('orders','date=eq.'+day,()=>fetchAll('orders',q=>q.eq('date',day)),rows=>{S.orders=rows.map(r=>fromRow('orders',r));S.loaded.orders=true;render()});
}
function subReport(){
  const r=S.rep; if(r.unsub){r.unsub();r.unsub=null}
  r.loaded=false; r.orders=[];
  if(!r.from||!r.to||r.from>r.to){r.loaded=true;return}
  if(!sb||!S.authId) return;
  const from=r.from,to=r.to;
  r.unsub=watch('orders','date=gte.'+from,()=>fetchAll('orders',q=>q.gte('date',from).lte('date',to)),rows=>{r.orders=rows.map(x=>fromRow('orders',x));r.loaded=true;if(S.view==='report')render()});
}
function startData(){
  stopData();
  const ws=S._w=[];
  for(const c of ['staff','shops','menu','groups','customers','settings','costs'])
    ws.push(watch(TBL[c],null,()=>fetchAll(TBL[c]),rows=>{S[c]=rows.map(r=>fromRow(c,r));S.loaded[c]=true;afterData()}));
  subOrders();
}
function stopData(){
  (S._w||[]).forEach(f=>f()); S._w=[];
  if(S.unsub){S.unsub();S.unsub=null}
  if(S.rep.unsub){S.rep.unsub();S.rep.unsub=null}
  S.menu=[];S.groups=[];S.customers=[];S.orders=[];S.staff=[];S.shops=[];S.settings=[];S.costs=[];S.rep.orders=[];S.rep.from='';S.rep.loaded=false;
  for(const k in S.loaded) S.loaded[k]=false;
}
// Đăng xuất / bị khoá: dọn dữ liệu và quay về màn hình đăng nhập
function leave(msg){
  S.me=null;S.authId=null;S.loginMsg=msg||'';S.sub=null;S.sel&&S.sel.clear();S._autoDay=false;S._dayTouched=false;
  stopData(); closeSheet(); authMode=null;
  if(sb) sb.auth.signOut().catch(()=>{});
  render();
}
function afterData(){
  if(S.authId){
    const fresh=S.staff.find(x=>x.id===S.authId);
    if(fresh&&fresh.active!==false) S.me=fresh;
    else if(S.loaded.staff){ leave(S.me?'Tài khoản đã bị khoá hoặc xoá.':'Tài khoản này đã bị khoá hoặc chưa được cấp quyền.'); return }
  }
  // Quán bị đình chỉ: máy chủ không trả dòng quán nào về
  if(S.authId&&S.loaded.staff&&S.loaded.shops&&!S.shops.length){ leave('Quán này đang tạm khoá. Bạn liên hệ nhà cung cấp để mở lại nhé.'); return }
  if(S.shopTitle!==brandName()){S.shopTitle=brandName(); document.title=(brandName()?brandName()+' · ':'')+'Đông Khách'}
  autoDay();
  render();
}
// Mở app sau giờ chốt (Cài đặt → Thông tin cửa hàng) thì danh sách đơn tự chuyển sang ngày mai.
// Chỉ làm 1 lần mỗi lần mở app, và không đè lên ngày người dùng đã tự chọn.
function autoDay(){
  if(S._autoDay||!S.me||!S.loaded.settings||!S.loaded.staff) return;
  S._autoDay=true;
  if(restricted()||S._dayTouched) return;                       // shipper luôn mở ở hôm nay
  const n=new Date(), hm=pad(n.getHours())+':'+pad(n.getMinutes());
  if(S.date===dstr(n)&&hm>=(shop().cutoff||'17:00')){S.date=tomorrowStr();S.sel.clear();subOrders()}
}
// Để máy/tab nằm im lâu (≥30 phút) rồi mở lại = coi như mở app mới
(function(){let hid=0; document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hid=Date.now();return}
  if(hid&&Date.now()-hid>=30*60000&&S.me){hid=0;S._autoDay=false;S._dayTouched=false;const t=dstr(new Date()); if(S.date<t){S.date=t;S.sel.clear();subOrders()} autoDay();render()}
})})();
// Tải file về máy (hoạt động trên mọi trình duyệt, không cần Claude)
function saveFile(name,data,mime){
  const url=URL.createObjectURL(new Blob([data],{type:mime||'application/octet-stream'}));
  const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click();
  setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},1500);
}

/* ---------- derived ---------- */
function sortedOrders(){
  const no={}; [...S.orders].sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)).forEach((o,i)=>no[o.id]=i+1);
  const list=[...visibleOrders()].sort((a,b)=>{const ta=a.time||'99:99',tb=b.time||'99:99'; if(ta!==tb) return ta<tb?-1:1; return (a.createdAt||0)-(b.createdAt||0)});
  return {list,no};
}
function statsOf(orders){
  const r={rev:0,cash:0,ck:0,due:0,dueN:0,later:0,laterV:0,n:orders.length,paying:orders.length};
  for(const o of orders){const t=o.total||0;
    r.rev+=t;r.paying++;
    const p=payOf(o); if(p==='cash')r.cash+=t; else if(p==='transfer')r.ck+=t; else {r.due+=t;r.dueN++; if(noCol(o)){r.later++;r.laterV+=t}}}
  return r;
}
const hasSample=()=>S.menu.some(x=>x.sample)||S.groups.some(x=>x.sample)||S.customers.some(x=>x.sample)||S.orders.some(x=>x.sample);

/* ---------- render ---------- */
let authMode=null;
function render(){
  applyBrand();
  const app=$('#app');
  if(!S.me){
    const mode=!sb?'noconfig':(S.authId||!S.booted)?'wait':(S.signup?'signup':'login');
    S._themeFor=null;
    if(authMode!==mode){authMode=mode;app.innerHTML=viewAuth(mode);const f=app.querySelector('input');if(f)setTimeout(()=>f.focus(),30)}
    return;
  }
  // vừa đăng nhập: áp giao diện đã lưu trong tài khoản (nếu có)
  if(S._themeFor!==S.me.id){S._themeFor=S.me.id; if(S.me.theme&&S.me.theme!==themeGet()) themeApply(S.me.theme)}
  const keepScroll=authMode===null;
  authMode=null;
  if(S.view==='report'&&!can('report.view')) S.view='orders';
  if(S.view==='customers'&&!can('cust.view')) S.view='orders';
  if(restricted()){
    if(S.filter==='noship') S.filter='all';
    const [lo,hi]=shipRange(); if(S.date<lo||S.date>hi){S.date=dstr(new Date());subOrders()}
  }
  const tabs=[['orders','Đơn hàng']].concat(can('cust.view')?[['customers','Khách hàng']]:[]).concat(can('report.view')?[['report','Báo cáo']]:[]).concat([['settings','Cài đặt']]);
  let body=planBanner();
  if(hasSample()&&isAdmin()&&S.view!=='report') body+=`<div class="banner"><span>Đang có dữ liệu mẫu (khách/đơn có chữ “mẫu”).</span><button class="sbtn" data-act="clear-sample">Xoá dữ liệu mẫu</button></div>`;
  body+= S.view==='orders'?viewOrders(): S.view==='customers'?viewCustomers(): S.view==='report'?viewReport(): viewSettings();
  const wide=S.view==='orders'&&curLay()!=='cards';
  app.innerHTML=`<div class="shell ${wide?'wide':''}">
    <header class="top">
      ${logoOf(shopSlug())}
      <div class="brand"><b>${esc(brandName())}</b><span>${esc(S.me.name)} · ${ROLE[roleOf(S.me)]||''}</span></div>
      ${can('order.create')?'<button class="newbtn" data-act="new-order">+ Tạo đơn</button>':''}
      <button class="roundbtn" data-act="logout" aria-label="Đăng xuất" title="Đăng xuất">${icon('logout')}</button>
    </header>
    <main>${body}</main>
  </div>
  <nav class="bnav ${wide?'wide':''}" aria-label="Menu chính"><div>${tabs.map(([k,l])=>`<button data-act="nav" data-v="${k}" ${S.view===k?'aria-current="page"':''}>${icon(k)}<span>${l}</span></button>`).join('')}</div></nav>`;
  const dp=$('#datePick'); if(dp) dp.value=S.date;
  const q=$('#q'); if(q&&S._qfocus){q.focus();q.setSelectionRange(q.value.length,q.value.length)}
  if(S.view==='report') bindChart();
}

function viewAuth(mode){
  const code=shopCodeDefault(), name=CFG.brandName||'Đông Khách';
  if(mode==='wait') return `<div class="auth">${logoOf(code,true)}<p>Đang tải…</p></div>`;
  if(mode==='noconfig') return `<div class="auth">${logoOf(code,true)}<h1>Chưa cấu hình</h1><p>Chưa nối được với Supabase. Mở file <b>config.js</b> và điền địa chỉ dự án + khoá công khai (xem README).</p></div>`;
  if(mode==='signup') return `<div class="auth">${logoOf(code,true)}<h1>Tạo quán mới</h1>
    <form id="signupForm">
      <div class="field"><label for="s_shop">Tên quán</label><input type="text" id="s_shop" maxlength="100" autocomplete="organization"></div>
      <div class="field"><label for="s_user">Tên đăng nhập của bạn (quản lý)</label><input type="text" id="s_user" autocapitalize="off" autocomplete="username"><span class="hint">Không dấu, không cách, ít nhất 3 ký tự. Ví dụ: chu, admin.</span></div>
      <div class="field"><label for="s_pw">Mật khẩu</label><input type="password" id="s_pw" autocomplete="new-password"><span class="hint">Ít nhất 6 ký tự, không dùng mật khẩu dễ đoán.</span></div>
      <div class="field"><label for="s_phone">Số điện thoại liên hệ</label><input type="tel" id="s_phone" maxlength="40" autocomplete="tel"></div>
      <input type="text" id="s_site" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
      <div class="err" id="authErr">${esc(S.loginMsg||'')}</div>
      <button class="btn primary block" type="submit">Tạo quán và dùng thử</button>
    </form><p class="hint"><button class="linkbtn" data-act="go-login" type="button">‹ Đã có quán? Đăng nhập</button></p></div>`;
  return `<div class="auth">${logoOf(code,true)}<h1>${esc(name)}</h1>
    <form id="loginForm">
      <div class="field"><label for="l_shop">Mã quán</label><input type="text" id="l_shop" value="${esc(code)}" autocapitalize="off" autocomplete="organization" placeholder="mã do quán cấp"></div>
      <div class="field"><label for="l_user">Tên đăng nhập</label><input type="text" id="l_user" autocapitalize="off" autocomplete="username"></div>
      <div class="field"><label for="l_pw">Mật khẩu</label><input type="password" id="l_pw" autocomplete="current-password"></div>
      <div class="err" id="authErr">${esc(S.loginMsg||'')}</div>
      <button class="btn primary block" type="submit">Đăng nhập</button>
    </form><p class="hint">Quên mật khẩu? Nhờ quản lý vào Cài đặt → Nhân viên để đặt lại.</p>
    ${CFG.allowSignup===false?'':'<p class="hint"><button class="linkbtn" data-act="go-signup" type="button">Chưa có quán? Tạo quán mới (dùng thử miễn phí)</button></p>'}</div>`;
}

function viewOrders(){
  const d=dparse(S.date); const isToday=S.date===dstr(new Date());
  const sh=restricted();
  const st=statsOf(visibleOrders()); const {list,no}=sortedOrders();
  const cnt={all:list.length,unpaid:list.filter(o=>payOf(o)==='unpaid').length,paid:list.filter(o=>payOf(o)!=='unpaid').length,todo:list.filter(o=>!o.delivered).length,noship:list.filter(o=>o.mode!=='lay'&&!o.shipperId).length};
  const f=S.filter;
  const shown=list.filter(o=>f==='all'||(f==='unpaid'&&payOf(o)==='unpaid')||(f==='paid'&&payOf(o)!=='unpaid')||(f==='todo'&&!o.delivered)||(f==='noship'&&o.mode!=='lay'&&!o.shipperId));
  const dayName=ds=>{const dd=dparse(ds); return ds===dstr(new Date())?'Hôm nay':ds===tomorrowStr()?'Ngày mai':ds===dstr(new Date(Date.now()-864e5))?'Hôm qua':WD[dd.getDay()]};
  const [shLo,shHi]=shipRange();
  const dayBar=sh?`<div class="datebar">
    <button class="iconbtn" data-act="day" data-d="-1" aria-label="Ngày trước" ${S.date<=shLo?'disabled':''}>‹</button>
    <div class="datepick" style="cursor:default"><b>${dayName(S.date)}</b><span class="num">${WD[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}</span></div>
    <button class="iconbtn" data-act="day" data-d="1" aria-label="Ngày sau" ${S.date>=shHi?'disabled':''}>›</button>
    ${isToday?'':'<button class="todaybtn" data-act="today">Hôm nay</button>'}
  </div>${isToday?'':'<div class="banner"><span>Đơn ngày khác chỉ để xem. Thu tiền và đánh dấu đã giao ở đơn hôm nay.</span></div>'}`:`<div class="datebar">
    <button class="iconbtn" data-act="day" data-d="-1" aria-label="Ngày trước">‹</button>
    <label class="datepick"><b>${isToday?'Hôm nay':S.date===tomorrowStr()?'Ngày mai':WD[d.getDay()]}</b><span class="num">${isToday||S.date===tomorrowStr()?WD[d.getDay()]+', ':''}${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}</span><input type="date" id="datePick" aria-label="Chọn ngày"></label>
    <button class="iconbtn" data-act="day" data-d="1" aria-label="Ngày sau">›</button>
    ${isToday?'':'<button class="todaybtn" data-act="today">Hôm nay</button>'}
  </div>`;
  const chipDefs=[['all','Tất cả'],['unpaid','Chưa thu'],['paid','Đã thu'],['todo','Chưa giao']].concat(sh?[]:[['noship','Chưa gán shipper']]);
  const lay=curLay();
  const toggle=!canAssign()?'':`<div class="layoutbar"><div class="seg2" role="group" aria-label="Kiểu hiển thị">${[['cards','Thẻ'],['table','Tổng quan'],['assign','Phân shipper']].map(([k,l])=>`<button type="button" data-act="layout" data-v="${k}" aria-pressed="${lay===k}">${l}</button>`).join('')}</div></div>`;
  const dl=list.filter(o=>o.mode!=='lay');
  const sIds=[...new Set([...shippers().map(s=>s.id),...dl.map(o=>o.shipperId).filter(Boolean)])];
  const sName=id=>{const s=S.staff.find(x=>x.id===id);return s?s.name:((dl.find(o=>o.shipperId===id)||{}).shipperName||'Shipper cũ')};
  if(S.shipFilter!=='all'&&S.shipFilter!=='none'&&!sIds.includes(S.shipFilter)) S.shipFilter='all';
  const sf=S.shipFilter;
  const chips=lay==='assign'
    ?[['all','Tất cả',dl.length],['none','Chưa gán',dl.filter(o=>!o.shipperId).length]].concat(sIds.map(id=>[id,sName(id),dl.filter(o=>o.shipperId===id).length])).map(([k,l,n])=>`<button class="chip" data-act="ship-filter" data-v="${esc(k)}" aria-pressed="${sf===k}">${esc(l)}<span>${n}</span></button>`).join('')
    :chipDefs.map(([k,l])=>`<button class="chip" data-act="filter" data-v="${k}" aria-pressed="${f===k}">${l}<span>${cnt[k]}</span></button>`).join('');
  const summary=lay==='cards'?`<div class="summary">
    <div><small>Số đơn</small><b>${list.length}</b><em>${cnt.todo} đơn chưa giao</em></div>
    <div><small>Doanh thu</small><b>${vnd(st.rev)}</b><em>${st.later?st.later+' đơn khách trả sau':'&nbsp;'}</em></div>
    <div><small>Đã thu</small><b>${vnd(st.cash+st.ck)}</b><em>TM ${vnd(st.cash)} · CK ${vnd(st.ck)}</em></div>
    <div class="due"><small>Chưa thu</small><b>${vnd(st.due)}</b><em>${st.dueN} đơn</em></div>
  </div>`:`<div class="sumline"><span><b>${list.length}</b> đơn</span><span>Đã thu <b>${vnd(st.cash+st.ck)}</b></span><span class="due">Chưa thu <b>${vnd(st.due)}</b></span></div>`;
  const cmtRow=(aiOn()&&!sh&&can('order.create'))?`<button class="cmtbtn" data-act="cmt-open">${icon('paste')}<span><b>Nhập đơn từ comment Facebook</b><small>Dán chữ hoặc ảnh chụp, xem lại rồi tạo hàng loạt</small></span></button>`:'';
  let h=`${dayBar}
  ${summary}
  ${cmtRow}
  ${toggle}
  <div class="chips">${chips}</div>`;
  if(S.db&&!S.loaded.orders) return h+`<div class="empty"><b>Đang tải đơn…</b></div>`;
  if(!list.length) return h+(sh?`<div class="empty"><b>${dayName(S.date)} chưa có đơn nào gán cho tài khoản này</b>Khi thu ngân gán đơn cho bạn, đơn sẽ hiện ở đây.</div>`:`<div class="empty"><b>Chưa có đơn nào ${isToday?'hôm nay':'ngày này'}</b>Bấm “+ Tạo đơn” ở trên để ghi đơn. Đơn tự xếp theo giờ giao.</div>`);
  if(lay==='assign') return h+assignView(dl,sf,list.length-dl.length);
  if(!shown.length) return h+`<div class="empty"><b>Không có đơn trong mục này</b>Chọn “Tất cả” để xem toàn bộ.</div>`;
  S._shown=shown.map(o=>o.id);
  const bar=`<div class="printall"><span class="hint">${shown.length} đơn đang hiện</span>${!can('order.print')?'':`<button class="sbtn prt" data-act="print-all">${icon('print')}In tất cả ${shown.length} bill</button>`}</div>`;
  if(lay==='table') return h+bar+tableView(shown);
  // Đơn đã giao giữ nguyên chỗ (theo giờ), không làm mờ: thẻ đổi sang màu xanh, cột trái có dấu ✓ "Đã giao"
  return h+bar+`<div class="list">${shown.map(o=>ticket(o,no[o.id])).join('')}</div>`;
}

/* ---------- chế độ "Tổng quan": bảng gọn toàn bộ đơn trong ngày ---------- */
const editAttr=o=>can('order.edit')?`data-act="edit-order" data-id="${o.id}" tabindex="0"`:'';
function orow(o){
  const lay=o.mode==='lay'; const shn=shipperLabel(o);
  const shipCell=lay?'<span class="sp lay">Khách lấy</span>':(shn?`<span class="sp">${esc(shn)}</span>`:'<span class="sp none">Chưa gán</span>');
  return `<div class="orow ${o.delivered?'done':''}" ${editAttr(o)}>
    <b class="c-time num">${o.time?esc(o.time):'--:--'}</b>
    <b class="c-cust">${esc(o.name||'Khách lẻ')}</b>
    <b class="c-tot num">${vnd(o.total)}</b>
    <div class="c-meta"><span class="pill pay-${payCls(o)}">${payShort(o)}</span>${shipCell}<span class="dvs ${o.delivered?'ok':''}">${o.delivered?'✓ Đã '+(lay?'lấy':'giao'):'Chưa '+(lay?'lấy':'giao')}</span></div>
  </div>`;
}
function tableView(shown){
  const sum=shown.reduce((s,o)=>s+(o.total||0),0);
  return `<div class="otable"><div class="ohead"><span>Giờ</span><span>Khách</span><span class="r">Tiền</span><span>Thu</span><span>Shipper</span><span>Giao</span></div>${shown.map(orow).join('')}<div class="ofoot"><span>${shown.length} đơn</span><span>${vnd(sum)}</span></div></div>`;
}

/* ---------- chế độ "Phân shipper": gán từng đơn hoặc tick nhiều đơn rồi gán một lần ---------- */
function shipOpts(cur,none){
  const opts=shippers().map(s=>({id:s.id,name:s.name}));
  if(cur&&!opts.some(x=>x.id===cur)){const s=S.staff.find(x=>x.id===cur); opts.push({id:cur,name:(s?s.name:'Shipper cũ')+' (đã khoá)'})}
  return `<option value="">${none}</option>`+opts.map(s=>`<option value="${s.id}" ${s.id===cur?'selected':''}>${esc(s.name)}</option>`).join('');
}
function arow(o){
  const on=S.sel.has(o.id), cur=o.shipperId||'';
  return `<div class="arow ${on?'sel':''} ${o.delivered?'done':''}">
    <label class="chk"><input type="checkbox" data-sel="${o.id}" ${on?'checked':''} aria-label="Chọn đơn ${esc(o.name||'khách lẻ')}"></label>
    <div class="a-info" ${editAttr(o)}>
      <div class="a-top"><b class="a-time num">${o.time?esc(o.time):'--:--'}</b><b class="a-name">${esc(o.name||'Khách lẻ')}</b></div>
      <div class="a-sub">${o.delivered?`<span class="a-dv">✓ Đã ${o.mode==='lay'?'lấy':'giao'}</span>`:''}<b class="num">${vnd(o.total)}</b>${o.address?' · '+esc(o.address):''}</div>
    </div>
    <select class="a-sel ${cur?'':'none'}" data-ship-for="${o.id}" aria-label="Shipper cho đơn ${esc(o.name||'khách lẻ')}">${shipOpts(cur,'Chưa gán')}</select>
  </div>`;
}
function assignView(dl,sf,nLay){
  const shown=dl.filter(o=>sf==='all'||(sf==='none'&&!o.shipperId)||o.shipperId===sf);
  S._ashown=shown.map(o=>o.id);
  S.sel=new Set([...S.sel].filter(id=>S._ashown.includes(id)));
  const nSel=S.sel.size, nNone=shown.filter(o=>!o.shipperId).length, act=shippers();
  if(S.bulkShip!==''&&S.bulkShip!=='__none'&&!act.some(s=>s.id===S.bulkShip)) S.bulkShip='';
  let h='';
  if(!act.length) h+=`<div class="banner warn"><span>Chưa có tài khoản shipper.${isAdmin()?' Vào Cài đặt → Nhân viên → + Thêm, chọn vai trò Shipper.':' Nhờ quản lý tạo tài khoản shipper.'}</span></div>`;
  h+=`<div class="assignhead"><span class="hint">${shown.length} đơn giao${nLay?` · ${nLay} đơn khách lấy (không cần shipper)`:''}</span>
    <span class="bulk-links"><button class="linkbtn" data-act="sel-unassigned" ${nNone?'':'disabled'}>Chọn chưa gán (${nNone})</button><button class="linkbtn" data-act="sel-all" ${shown.length?'':'disabled'}>Chọn tất cả</button>${nSel?'<button class="linkbtn" data-act="sel-clear">Bỏ chọn</button>':''}</span></div>`;
  if(!shown.length) return h+`<div class="empty"><b>Không có đơn giao trong mục này</b>${dl.length?'Chọn “Tất cả” để xem toàn bộ đơn giao.':'Đơn khách ghé lấy không cần shipper.'}</div>`;
  h+=`<div class="alist">${shown.map(arow).join('')}</div>`;
  if(nSel) h+=`<div class="bulk"><span class="bcount">Đã chọn <b>${nSel}</b> đơn</span>
    <select id="bulkShip" aria-label="Shipper nhận các đơn đã chọn"><option value="" ${S.bulkShip===''?'selected':''}>Chọn shipper…</option>${act.map(s=>`<option value="${s.id}" ${S.bulkShip===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}<option value="__none" ${S.bulkShip==='__none'?'selected':''}>Bỏ gán (chưa gán)</option></select>
    <button class="btn primary" data-act="bulk-assign" ${S.bulkShip===''?'disabled':''}>Gán ${nSel} đơn</button></div>`;
  return h;
}
function ticket(o,n){
  const lay=o.mode==='lay';
  const items=(o.items||[]).map(it=>`<li><span class="q">${it.qty}×</span><span class="n">${esc(it.name)}${it.note?`<em>${esc(it.note)}</em>`:''}</span><span class="p">${vnd(it.price*it.qty)}</span></li>`).join('');
  const ro=!can('order.edit')||offDay(o); // không được sửa (hoặc shipper xem đơn ngày khác): thẻ không bấm mở được
  let acts='';
  if(can('order.print')) acts+=`<button class="sbtn prt" data-act="print-one" data-id="${o.id}" aria-label="In bill" title="In bill">${icon('print')}</button>`;
  if(can('order.pay')&&!offDay(o)){
    if(payOf(o)==='unpaid') acts+=`<button class="sbtn cash" data-act="pay" data-id="${o.id}" data-v="cash">Tiền mặt</button><button class="sbtn ck" data-act="pay" data-id="${o.id}" data-v="transfer">Chuyển khoản</button>`;
    else acts+=`<button class="sbtn paid-${payOf(o)}" data-act="pay" data-id="${o.id}" data-v="unpaid" title="Bấm để chuyển về chưa thu">✓ Đã thu ${payOf(o)==='cash'?'tiền mặt':'chuyển khoản'}</button>`;
    acts+=`<button class="sbtn ${o.delivered?'on':'dv'}" data-act="deliver" data-id="${o.id}">${o.delivered?'✓ Đã '+(lay?'lấy':'giao'):'Đã '+(lay?'lấy':'giao')}</button>`;
  }
  const shn=shipperLabel(o);
  const shipLine=(!restricted()&&!lay)?`<div class="shp ${shn?'':'none'}">${shn?'Shipper: '+esc(shn):'Chưa gán shipper'}</div>`:'';
  return `<article class="ticket ${o.delivered?'done':''} ${lay?'lay':''} ${ro?'ro':''}" ${ro?'':`data-act="edit-order" data-id="${o.id}" tabindex="0"`}>
    <div class="stub">${o.delivered
      ?`<span class="sck">${icon('check')}</span><div class="m">${lay?'Đã lấy':'Đã giao'}</div>${o.time?`<div class="ht">hẹn ${esc(o.time)}</div>`:''}`
      :`${o.time?'<div class="pre">trước</div>':''}<div class="t ${o.time?'':'none'}">${o.time?esc(o.time):'--:--'}</div><div class="m">${lay?'Ghé lấy':'Giao'}</div>`}<div class="no">#${n}</div></div>
    <div class="tbody">
      <div class="row1"><div class="who"><h3>${esc(o.name||'Khách lẻ')}</h3>${o.phone?`<span class="ph">${esc(o.phone)}<button class="copy" data-act="copy" data-v="${esc(o.phone)}">copy</button></span>`:''}</div><span class="pill pay-${payCls(o)}">${payLabel(o)}</span></div>
      ${o.address&&!lay?`<div class="addr">${esc(o.address)}</div>`:''}
      ${shipLine}
      ${o.note?`<p class="onote"><b>Ghi chú</b>${esc(o.note)}</p>`:''}
      <ul class="items">${items}</ul>
      <div class="totrow"><span>Thành tiền</span><b class="total">${vnd(o.total)}</b></div>
    </div>
    ${acts?`<div class="acts">${acts}</div>`:''}
  </article>`;
}

function viewCustomers(){
  const q=norm(S.q), qd=digits(S.q);
  let list=[...S.customers].sort(byName);
  if(q) list=list.filter(c=>norm(c.name).includes(q)||norm(c.address).includes(q)||(qd&&digits(c.phone).includes(qd)));
  let h=`<div class="pagehead"><h2>Khách hàng</h2>${can('cust.edit')?'<button class="btn primary" data-act="new-cust">+ Thêm</button>':''}</div>
  <div class="toolbar"><input type="search" id="q" placeholder="Tìm tên, số điện thoại, địa chỉ" value="${esc(S.q)}" aria-label="Tìm khách"></div>`;
  if(S.db&&!S.loaded.customers) return h+`<div class="empty"><b>Đang tải khách…</b></div>`;
  if(!S.customers.length) return h+`<div class="empty"><b>Chưa có khách nào</b>Khách mới tự lưu vào đây khi ghi đơn, hoặc bấm “+ Thêm”.</div>`;
  if(!list.length) return h+`<div class="empty"><b>Không tìm thấy khách</b>Thử tìm bằng số điện thoại.</div>`;
  return h+`<div class="sectionlabel">${list.length} khách</div><div class="rows">${list.map(c=>`<button class="rowi" ${can('cust.edit')?`data-act="edit-cust" data-id="${c.id}"`:''}>
    <div class="main"><b>${esc(c.name)}</b><span class="num">${esc(c.phone||'Chưa có SĐT')}${c.address?' · '+esc(c.address):''}</span></div>${icon('chev','ic chev')}
  </button>`).join('')}</div>`;
}

/* ---------- report ---------- */
function presetRange(p){
  const t=new Date(); const today=dstr(t);
  if(p==='today') return [today,today];
  if(p==='7d'){const a=new Date(t);a.setDate(a.getDate()-6);return [dstr(a),today]}
  if(p==='month') return [dstr(new Date(t.getFullYear(),t.getMonth(),1)),today];
  if(p==='lastmonth') return [dstr(new Date(t.getFullYear(),t.getMonth()-1,1)),dstr(new Date(t.getFullYear(),t.getMonth(),0))];
  return [S.rep.from||today,S.rep.to||today];
}
function setPreset(p){const r=S.rep; r.preset=p; if(p!=='custom'){[r.from,r.to]=presetRange(p)} subReport(); render()}
function daysBetween(a,b){const out=[];const d=dparse(a),e=dparse(b);while(d<=e&&out.length<400){out.push(dstr(d));d.setDate(d.getDate()+1)}return out}
function niceMax(v){if(v<=0)return 100000;const p=Math.pow(10,Math.floor(Math.log10(v)));for(const m of [1,1.5,2,2.5,3,4,5,6,8,10]){if(m*p>=v)return m*p}return 10*p}
let chartData=null;
function chartSVG(days,byDay){
  const W=600,H=210,L=44,R=8,T=18,B=26,pw=W-L-R,ph=H-T-B;
  const vals=days.map(d=>byDay[d]||0), max=niceMax(Math.max(...vals));
  const step=pw/days.length, bw=Math.max(2,Math.min(40,step*0.68));
  const y=v=>T+ph-(v/max)*ph;
  let g='';
  [0,0.5,1].forEach(f=>{const yy=y(max*f);g+=`<line class="grid" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text class="axis" x="${L-6}" y="${yy+4}" text-anchor="end">${kvnd(max*f)}</text>`});
  const every=Math.ceil(days.length/8);
  const maxI=vals.indexOf(Math.max(...vals));
  days.forEach((d,i)=>{
    const v=vals[i], cx=L+step*i+step/2, x=cx-bw/2, top=y(v), h=T+ph-top, r=Math.min(4,bw/2,h);
    const path=v>0?`M${x},${T+ph}V${top+r}Q${x},${top} ${x+r},${top}H${x+bw-r}Q${x+bw},${top} ${x+bw},${top+r}V${T+ph}Z`:`M${x},${T+ph-1.5}h${bw}v1.5h${-bw}Z`;
    g+=`<g data-i="${i}"><rect class="hit" x="${L+step*i}" y="${T}" width="${step}" height="${ph+B}"/><path class="bar ${v>0?'':'zero'}" d="${path}"/></g>`;
    if((i%every===0)||i===days.length-1&&days.length<=8) g+=`<text class="axis" x="${cx}" y="${H-8}" text-anchor="middle">${ddm(d)}</text>`;
    if(i===maxI&&v>0) g+=`<text class="val" x="${cx}" y="${top-5}" text-anchor="middle">${kvnd(v)}</text>`;
  });
  chartData={days,vals,step,L,W,T,y};
  return `<div class="chartwrap" id="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Doanh thu theo ngày">${g}</svg><div class="tip" id="tip" hidden></div></div>`;
}
function bindChart(){
  const c=$('#chart'); if(!c||!chartData)return; const tip=$('#tip'); const svg=c.querySelector('svg');
  const show=gEl=>{const i=+gEl.dataset.i; const {days,vals,step,L,W,y}=chartData;
    c.querySelectorAll('g.on').forEach(x=>x.classList.remove('on')); gEl.classList.add('on');
    const scale=svg.getBoundingClientRect().width/W;
    tip.innerHTML=`${WD[dparse(days[i]).getDay()]}, ${ddm(days[i])}<b>${vnd(vals[i])}</b>`;
    tip.style.left=Math.min(Math.max((L+step*i+step/2)*scale,60),svg.getBoundingClientRect().width-60)+'px'; tip.style.top=(y(vals[i])*scale-8)+'px'; tip.hidden=false;};
  c.querySelectorAll('g[data-i]').forEach(gEl=>{gEl.addEventListener('pointerenter',()=>show(gEl));gEl.addEventListener('click',()=>show(gEl))});
  c.addEventListener('pointerleave',()=>{tip.hidden=true;c.querySelectorAll('g.on').forEach(x=>x.classList.remove('on'))});
}
function viewReport(){
  const r=S.rep;
  if(!r.from){[r.from,r.to]=presetRange(r.preset);subReport()}
  let h=`<div class="pagehead"><h2>Báo cáo</h2></div>
  <div class="chips" style="margin-top:0">${[['today','Hôm nay'],['7d','7 ngày'],['month','Tháng này'],['lastmonth','Tháng trước'],['custom','Tự chọn']].map(([k,l])=>`<button class="chip" data-act="preset" data-v="${k}" aria-pressed="${r.preset===k}">${l}</button>`).join('')}</div>
  ${r.preset==='custom'?`<div class="range"><div class="field"><label for="r_from">Từ ngày</label><input type="date" id="r_from" value="${r.from}"></div><div class="field"><label for="r_to">Đến ngày</label><input type="date" id="r_to" value="${r.to}"></div></div>`:`<p class="hint" style="margin:-4px 2px 10px">${r.from===r.to?ddm(r.from)+'/'+r.from.slice(0,4):ddm(r.from)+' – '+ddm(r.to)+'/'+r.to.slice(0,4)}</p>`}`;
  if(r.from>r.to) return h+`<div class="empty"><b>Ngày bắt đầu đang sau ngày kết thúc</b>Chọn lại khoảng ngày.</div>`;
  if(!r.loaded) return h+`<div class="empty"><b>Đang tính…</b></div>`;
  const st=statsOf(r.orders);
  h+=`<div class="kpis">
    <div class="kpi hero"><small>Doanh thu</small><b>${vnd(st.rev)}</b><span>${st.n} đơn${st.paying?' · TB '+vnd(st.rev/st.paying)+'/đơn':''}</span></div>
    <div class="kpi"><small>Tiền mặt</small><b>${vnd(st.cash)}</b><span>đã thu</span></div>
    <div class="kpi"><small>Chuyển khoản</small><b>${vnd(st.ck)}</b><span>đã thu</span></div>
    <div class="kpi due"><small>Chưa thu</small><b>${vnd(st.due)}</b><span>${st.dueN} đơn</span></div>
    <div class="kpi"><small>Khách trả sau</small><b>${vnd(st.laterV)}</b><span>${st.later} đơn shipper không thu</span></div>
  </div>`;
  if(!r.orders.length) return h+`<div class="empty" style="margin-top:12px"><b>Chưa có đơn trong khoảng này</b>Chọn khoảng ngày khác.</div>`;
  const days=daysBetween(r.from,r.to);
  if(days.length>1){
    const byDay={}; r.orders.forEach(o=>{byDay[o.date]=(byDay[o.date]||0)+(o.total||0)});
    h+=`<section class="card"><h3>Doanh thu theo ngày <small>chạm vào cột để xem</small></h3>${days.length<=62?chartSVG(days,byDay):'<p class="hint">Chọn khoảng ngắn hơn 2 tháng để xem biểu đồ theo ngày.</p>'}</section>`;
  } else chartData=null;
  // món bán chạy
  const agg={}; r.orders.forEach(o=>{(o.items||[]).forEach(it=>{const k=it.menuId||it.name;const a=agg[k]||(agg[k]={name:it.name,qty:0,rev:0,menuId:it.menuId});a.qty+=it.qty||0;a.rev+=(it.price||0)*(it.qty||0)})});
  const by=r.topBy; const top=Object.values(agg).sort((a,b)=>b[by]-a[by]).slice(0,10); const mx=Math.max(1,...top.map(a=>a[by]));
  h+=`<section class="card"><h3>${W.M} bán chạy <span class="seg2"><button data-act="topby" data-v="rev" aria-pressed="${by==='rev'}">Doanh thu</button><button data-act="topby" data-v="qty" aria-pressed="${by==='qty'}">Số lượng</button></span></h3>
    ${top.map(a=>`<div class="hbar"><span class="nm">${esc(a.name)}<small>${a.qty} ${W.u}</small></span><span class="rv">${by==='rev'?vnd(a.rev):a.qty}</span><span class="track"><i style="width:${(a[by]/mx*100).toFixed(1)}%"></i></span></div>`).join('')}</section>`;
  // theo nhóm
  const gagg={}; Object.values(agg).forEach(a=>{const m=S.menu.find(x=>x.id===a.menuId);const g=groupOf(m);const k=g?g.name:'Khác';const x=gagg[k]||(gagg[k]={name:k,rev:0,qty:0});x.rev+=a.rev;x.qty+=a.qty});
  const gl=Object.values(gagg).sort((a,b)=>b.rev-a.rev); const gm=Math.max(1,...gl.map(a=>a.rev));
  h+=`<section class="card"><h3>Theo nhóm ${W.m}</h3>${gl.map(a=>`<div class="hbar"><span class="nm">${esc(a.name)}<small>${a.qty} ${W.u}</small></span><span class="rv">${vnd(a.rev)}</span><span class="track"><i style="width:${(a.rev/gm*100).toFixed(1)}%"></i></span></div>`).join('')}</section>`;
  // chưa thu
  const debts=r.orders.filter(o=>payOf(o)==='unpaid').sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  if(debts.length) h+=`<section class="card"><h3>Đơn chưa thu <small>${debts.length} đơn · ${vnd(st.due)}</small></h3>${debts.map(o=>`<div class="debt" data-act="open-order" data-id="${o.id}"><div><b>${esc(o.name||'Khách lẻ')}${noCol(o)?'<span class="nocol">trả sau</span>':''}</b><span class="num">${ddm(o.date)}${o.phone?' · '+esc(o.phone):''}</span></div><strong>${vnd(o.total)}</strong></div>`).join('')}</section>`;
  return h;
}

/* ---------- settings ---------- */
function viewSettings(){
  if(S.sub==='menu'&&can('menu.edit')) return viewMenu();
  if(S.sub==='staff'&&isAdmin()) return viewStaff();
  const row=(act,ic,t,s)=>`<button class="rowi setrow" data-act="${act}"><span class="ibox">${icon(ic)}</span><div class="main"><b>${t}</b><span>${s}</span></div>${icon('chev','ic chev')}</button>`;
  let h=`<div class="pagehead"><h2>Cài đặt</h2></div>`;
  // Giao diện: ai cũng chọn được cho tài khoản của mình, nên đặt lên đầu
  const tm=themeGet();
  h+=`<div class="sectionlabel" style="margin-top:4px">Giao diện</div><div class="fs"><div class="seg" role="group" aria-label="Giao diện">${[['light','Sáng'],['dark','Tối'],['system','Theo máy']].map(([k,l])=>`<button type="button" data-act="theme" data-v="${k}" aria-pressed="${tm===k}">${l}</button>`).join('')}</div><span class="hint">Lưu theo tài khoản của bạn: đăng nhập trên máy nào cũng dùng giao diện này. “Theo máy” tự đổi sáng/tối theo cài đặt của điện thoại, máy tính.</span></div>`;
  const shopRows=(can('menu.edit')?row('sub-menu','menu',`Danh mục ${W.m}`,`${S.groups.length} nhóm · ${S.menu.length} ${W.m}${S.menu.some(m=>m.active===false)?' · '+S.menu.filter(m=>m.active===false).length+' đang ẩn':''}`):'')
    +(can('shop.edit')?row('biz-form','menu','Loại hình kinh doanh',isRetail()?'Bán sản phẩm · gọi là “sản phẩm”':'Ăn uống · gọi là “món”'):'')
    +(isAdmin()?row('sub-staff','staff','Nhân viên và phân quyền',`${S.staff.filter(x=>x.active!==false).length} tài khoản đang dùng`):'')
    +(can('cust.import')?row('imp-open','customers','Nhập khách từ Excel/CSV',`${S.customers.length} khách hiện có`):'')
    +(can('shop.edit')?row('brand-form','palette','Logo và màu giao diện',esc(accentName(brandNow().accent))+(brandNow().logo?' · đã có logo':' · chưa có logo')):'')
    +(can('shop.edit')?row('shop-form','print','Thông tin cửa hàng',esc(shop().name)+' · đơn sau '+esc(shop().cutoff)+' tính ngày mai'):'');
  if(shopRows) h+=`<div class="sectionlabel">Cửa hàng</div><div class="rows">${shopRows}</div>`;
  h+=`<div class="sectionlabel">Tài khoản của bạn</div><div class="rows">
    ${row('change-pw','key','Đổi mật khẩu',`Đăng nhập bằng: ${esc(S.me.username)} · mã quán ${esc(shopSlug())}`)}
    ${row('logout','logout','Đăng xuất','Thoát khỏi app trên máy này')}
  </div>
  <p class="hint appver" style="text-align:center;margin:14px 0 4px">${CFG.brandName||'Đông Khách'} · Phiên bản ${APP_VERSION}</p>`;
  return h;
}
/* giá vốn: S.costs (chỉ có dữ liệu khi tài khoản có quyền cost.view) */
const costOf=id=>{const r=S.costs.find(x=>x.id===id); return r&&r.cost!==''&&r.cost!=null&&Number.isFinite(Number(r.cost))?Number(r.cost):null};
// "lãi 15.000đ (33%)" — % tính trên giá bán; giá vốn cao hơn giá bán thì báo lỗ
const marginTxt=(price,cost)=>{const d=price-cost; return (d<0?'lỗ ':'lãi ')+vnd(Math.abs(d))+(price>0?' ('+Math.round(d/price*100)+'%)':'')};
function menuRow(m){
  const off=m.active===false, cv=can('cost.view'), c=cv?costOf(m.id):null;
  const sub=[off?'Đang ẩn, không hiện khi tạo đơn':'', cv?(c==null?'Chưa có giá vốn':'Vốn '+vnd(c)+' · '+marginTxt(Number(m.price)||0,c)):''].filter(Boolean).join(' · ');
  return `<div class="rowi mrow ${off?'off':''}"><button class="mmain" data-act="edit-menu" data-id="${m.id}">
    <div class="main"><b>${esc(m.name)}</b>${sub?`<span class="${cv&&c!=null&&c>(Number(m.price)||0)?'loss':''}">${sub}</span>`:''}</div><span class="price">${vnd(m.price)}${m.unit?`<small> /${esc(m.unit)}</small>`:''}</span></button>
    <button type="button" class="tgl" role="switch" aria-checked="${!off}" data-act="menu-toggle" data-id="${m.id}" aria-label="${off?'Hiện lại':'Ẩn'} ${esc(m.name)}" title="${off?'Đang ẩn — bấm để bán lại':'Đang bán — bấm để ẩn'}"><i></i></button></div>`;
}
async function menuToggle(id){
  const m=S.menu.find(x=>x.id===id); if(!m) return;
  const on=m.active===false;                       // đang ẩn → bật lại
  m.active=on; render();                           // hiện ngay, máy chủ báo về sau
  try{await patch('menu',id,{active:on}); toast(on?`Đã hiện lại “${m.name}”`:`Đã ẩn “${m.name}”, không hiện khi tạo đơn`)}
  catch(e){m.active=!on; render(); fail(e)}
}
function viewMenu(){
  let h=`<div class="pagehead"><button class="back" data-act="sub-back">‹ Cài đặt</button><h2>Danh mục ${W.m}</h2></div>
  <div class="toolbar"><span class="hint" style="flex:1">Bấm tên nhóm để đổi thứ tự (0 = ẩn khi tạo đơn). Công tắc bên phải: bán / ẩn ${W.m}.</span><button class="btn" data-act="new-group">+ Nhóm</button><button class="btn primary" data-act="new-menu">+ ${W.M}</button></div>`;
  if(S.db&&(!S.loaded.menu||!S.loaded.groups)) return h+`<div class="empty"><b>Đang tải ${W.m}…</b></div>`;
  if(!S.menu.length&&!S.groups.length) return h+`<div class="empty"><b>Chưa có nhóm ${W.m} nào</b>Tạo nhóm trước (VD: ${isRetail()?'Chăm sóc da, Trang điểm, Phụ kiện':'Cơm, Topping, Nước'}), rồi thêm ${W.m} vào nhóm.</div>`;
  const sortItems=l=>l.sort((a,b)=>(a.active===false)-(b.active===false)||byName(a,b));
  for(const g of groupsSorted()){
    const o=gOrd(g); const items=sortItems(S.menu.filter(m=>m.groupId===g.id));
    h+=`<div class="ghead"><button class="gname" data-act="edit-group" data-id="${g.id}"><b>${esc(g.name)}</b><span class="ord ${o?'':'hid'}">${o?'Thứ tự '+o:'Ẩn khi tạo đơn'}</span><span class="hint">${items.length} ${W.m}</span></button><button class="sbtn" data-act="new-menu" data-gid="${g.id}">+ ${W.M}</button></div>
    <div class="rows">${items.length?items.map(menuRow).join(''):`<div class="none">Chưa có ${W.m} trong nhóm này.</div>`}</div>`;
  }
  const loose=sortItems(S.menu.filter(m=>!groupOf(m)));
  if(loose.length) h+=`<div class="ghead"><span class="gname"><b>Chưa xếp nhóm</b></span></div><div class="rows">${loose.map(menuRow).join('')}</div>`;
  return h;
}
function viewStaff(){
  const rank={admin:0,cashier:1,shipper:2};
  const list=[...S.staff].sort((a,b)=>(a.active===false)-(b.active===false)||(rank[roleOf(a)]??9)-(rank[roleOf(b)]??9)||byName(a,b));
  return `<div class="pagehead"><button class="back" data-act="sub-back">‹ Cài đặt</button><h2>Nhân viên</h2><button class="btn primary" data-act="new-staff">+ Thêm</button></div>
  <div class="hint" style="margin:0 2px 10px;display:flex;flex-direction:column;gap:2px"><span><b>Quản lý:</b> ${tw(ROLE_HINT.admin)}</span><span><b>Thu ngân:</b> ${tw(ROLE_HINT.cashier)}</span><span><b>Shipper:</b> ${tw(ROLE_HINT.shipper)}</span><span>Bấm vào từng người để chỉnh quyền chi tiết.</span></div>
  <div class="rows">${list.map(s=>`<button class="rowi" data-act="edit-staff" data-id="${s.id}"><div class="main"><b>${esc(s.name)}${s.id===S.me.id?' (bạn)':''}</b><span>${esc(s.username)}${roleOf(s)!=='admin'&&s.perms&&Object.keys(s.perms).length?' · quyền tuỳ chỉnh':''}</span></div>
    ${s.active===false?'<span class="role lock">Đã khoá</span>':`<span class="role ${roleOf(s)==='admin'?'':'staff'}">${ROLE[roleOf(s)]||''}</span>`}${icon('chev','ic chev')}</button>`).join('')}</div>`;
}

/* ---------- sheets ---------- */
let F=null, CM=null;
function openSheet(html){$('#sheetBox').innerHTML=html;$('#sheet').hidden=false;document.body.style.overflow='hidden'}
function closeSheet(){$('#sheet').hidden=true;$('#sheetBox').innerHTML='';document.body.style.overflow='';F=null;CM=null;BR=null;if(BR_PREVIEW){BR_PREVIEW=null;applyBrand()}}
const head=(t,sub)=>`<div class="sh-head"><div><h2>${t}</h2>${sub?`<small>${sub}</small>`:''}</div><button class="btn" data-act="close">Đóng</button></div>`;

function orderForm(o,presetCust){
  F=o?JSON.parse(JSON.stringify(o)):{date:defaultOrderDate(),mode:'giao',time:'',note:'',payment:'unpaid',delivered:false,customerId:'',name:'',phone:'',address:'',items:[]};
  F.itemMap={}; (F.items||[]).forEach(it=>F.itemMap[it.menuId]={...it});
  F.noCollect=o?noCol(o):false; F.payment=o?payOf(o):'unpaid';
  F.shipperId=o?(o.shipperId||''):''; F.shipperName=o?(o.shipperName||''):'';
  const shList=shippers().map(s=>({id:s.id,name:s.name}));
  if(F.shipperId&&!shList.some(x=>x.id===F.shipperId)) shList.push({id:F.shipperId,name:(shipperLabel(o)||'Shipper cũ')+' (đã khoá/xoá)'});
  const shipSel=!can('order.assign')?'':`<div class="field" id="shipWrap" ${F.mode==='lay'?'hidden':''}><label for="f_ship">Shipper giao đơn</label><select id="f_ship"><option value="">Chưa gán shipper</option>${shList.map(s=>`<option value="${s.id}" ${s.id===F.shipperId?'selected':''}>${esc(s.name)}</option>`).join('')}</select>${shList.length?'':'<span class="hint">Chưa có tài khoản shipper. Quản lý vào Cài đặt → Nhân viên → + Thêm, chọn vai trò Shipper.</span>'}</div>`;
  if(presetCust){F.customerId=presetCust.id;F.name=presetCust.name||'';F.phone=presetCust.phone||'';F.address=presetCust.address||''}
  const visible=groupsSorted().filter(g=>gOrd(g)>0);
  const rows=[];
  S.menu.filter(m=>m.active!==false).sort(byName).forEach(m=>{const g=groupOf(m);
    if(g&&gOrd(g)>0) rows.push({menuId:m.id,name:m.name,price:m.price,unit:m.unit||'',gid:g.id});
    else if(!g) rows.push({menuId:m.id,name:m.name,price:m.price,unit:m.unit||'',gid:'_other'});});
  Object.values(F.itemMap).forEach(it=>{if(!rows.some(r=>r.menuId===it.menuId)) rows.push({menuId:it.menuId,name:it.name,price:it.price,gid:'_other'})});
  F.rows=rows;
  F.tabs=visible.filter(g=>rows.some(r=>r.gid===g.id)).map(g=>({id:g.id,name:g.name}));
  if(rows.some(r=>r.gid==='_other')) F.tabs.push({id:'_other',name:'Khác'});
  const firstPicked=F.tabs.find(t=>rows.some(r=>r.gid===t.id&&F.itemMap[r.menuId]?.qty));
  F.tab=(firstPicked||F.tabs[0]||{}).id||'';
  const seg=(k,opts)=>`<div class="seg">${opts.map(([v,l])=>`<button type="button" data-act="seg" data-k="${k}" data-v="${v}" aria-pressed="${F[k]===v}">${l}</button>`).join('')}</div>`;
  const by=o&&o.createdBy?`Tạo bởi ${esc(o.createdBy)}${o.createdAt?' lúc '+new Date(o.createdAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})+' '+ddm(dstr(new Date(o.createdAt))):''}`:'';
  openSheet(`${head(o?'Sửa đơn':'Tạo đơn mới',by)}
  <div class="sh-body">
    <section class="fs"><div class="fs-head"><h4>Khách hàng</h4><button type="button" class="linkbtn" id="clearCust" data-act="clearcust" hidden>Xóa hết</button></div>
      <div id="picked"></div>
      <div class="namerow">
        <div class="field"><label for="f_name">Tên khách</label><input type="text" id="f_name" autocomplete="off" value="${esc(F.name)}" placeholder="Gõ tên để tìm khách cũ"></div>
        <div class="field"><label for="f_phone">Số điện thoại</label><input type="tel" id="f_phone" autocomplete="off" value="${esc(F.phone)}"></div>
      </div>
      <div class="sugg" id="sugg"></div>
      <div class="field"><label for="f_addr">Địa chỉ giao</label><input type="text" id="f_addr" value="${esc(F.address)}" placeholder="Số nhà, đường, khu…"></div>
      ${roleOf(S.me)==='shipper'?'':'<label class="check" id="saveCustWrap"><input type="checkbox" id="f_savecust" checked> Lưu khách mới vào danh sách</label>'}
    </section>
    <section class="fs"><h4>${W.M}</h4>
      ${rows.length?`<div class="gtabs" id="gtabs" role="tablist"></div><div class="chosen" id="chosen"></div><div id="itemList"></div>`:`<p class="hint">Chưa có ${W.m} để chọn. Quản lý vào Cài đặt → Danh mục ${W.m} để thêm.</p>`}
    </section>
    <section class="fs"><h4>Giao nhận</h4>
      ${seg('mode',[['giao','Giao tận nơi'],['lay','Khách ghé lấy']])}
      ${shipSel}
      <div class="grid2 tdate">
        <div class="field"><label for="f_time">Trước mấy giờ</label><input type="time" id="f_time" value="${esc(F.time)}"></div>
        <div class="field"><label for="f_date">Ngày</label><input type="date" id="f_date" value="${esc(F.date)}"></div>
      </div>
      <div class="quick">${['06:00','06:30','07:00','07:30','10:30','11:00','11:30'].map(t=>`<button type="button" data-act="time" data-v="${t}">${t}</button>`).join('')}<button type="button" data-act="time" data-v="">Không hẹn giờ</button></div>
    </section>
    <section class="fs"><h4>Ghi chú đơn</h4><textarea id="f_note" placeholder="VD: gọi trước khi tới, để ở bảo vệ…">${esc(F.note)}</textarea></section>
    ${o?`<div style="display:flex;gap:8px;flex-wrap:wrap">${can('order.print')?`<button class="btn" data-act="print-one" data-id="${o.id}">In bill đơn này</button>`:''}${can('order.delete')?`<button class="btn danger" data-act="del" data-col="orders" data-id="${o.id}">Xoá đơn này</button>`:''}</div>`:''}
  </div>
  <div class="sh-foot"><div><small>Thành tiền</small><strong id="f_total" class="num">0đ</strong></div><button class="btn primary" data-act="save-order">${o?'Lưu thay đổi':'Lưu đơn'}</button></div>`);
  updPicked(); renderItems(); updTotal();
  if(!o&&!presetCust) setTimeout(()=>$('#f_name')&&$('#f_name').focus(),50);
}
function updTotal(){if(!F)return;const t=Object.values(F.itemMap).reduce((s,it)=>s+it.price*it.qty,0);const el=$('#f_total');if(el)el.textContent=vnd(t)}
function updTabs(){
  const box=$('#gtabs'); if(!box)return;
  box.innerHTML=F.tabs.map(t=>{const n=F.rows.filter(r=>r.gid===t.id).reduce((s,r)=>s+(F.itemMap[r.menuId]?.qty||0),0);
    return `<button type="button" role="tab" data-act="gtab" data-v="${t.id}" aria-pressed="${F.tab===t.id}">${esc(t.name)}${n?`<span class="bd">${n}</span>`:''}</button>`}).join('');
  const ch=Object.values(F.itemMap).filter(it=>it.qty>0); const c=$('#chosen');
  if(c){c.hidden=!ch.length;c.innerHTML=ch.length?'Đã chọn: '+ch.map(it=>`<b>${it.qty}×</b> ${esc(it.name)}`).join(', '):''}
}
function renderItems(){
  const box=$('#itemList'); if(!box)return;
  box.innerHTML=F.rows.filter(r=>r.gid===F.tab).map(r=>{const it=F.itemMap[r.menuId];const q=it?it.qty:0;return `<div class="irow ${q?'on':''}" data-mid="${r.menuId}">
      <div class="iname" data-act="qty" data-mid="${r.menuId}" data-d="1"><span>${esc(r.name)}</span><small>${vnd(r.price)}${r.unit?' / '+esc(r.unit):''}</small></div>
      <div class="stepper"><button type="button" data-act="qty" data-mid="${r.menuId}" data-d="-1" aria-label="Bớt">−</button><output class="num">${q}</output><button type="button" data-act="qty" data-mid="${r.menuId}" data-d="1" aria-label="Thêm">+</button></div>
      <input type="text" class="inote" id="note_${r.menuId}" data-mid="${r.menuId}" placeholder="${isRetail()?'Ghi chú: màu, dung tích, quà tặng…':'Ghi chú món: ít cơm, không hành…'}" value="${esc(it?it.note:'')}" ${q?'':'hidden'}>
    </div>`}).join('');
  updTabs();
}
function updPicked(){
  const p=$('#picked'); if(!p)return;
  const c=F.customerId&&S.customers.find(x=>x.id===F.customerId);
  p.innerHTML=c?`<div class="picked"><span>Khách cũ: ${esc(c.name)}</span><button class="sbtn" data-act="unpick">Đổi khách</button></div>`:'';
  {const w=$('#saveCustWrap'); if(w) w.hidden=!!c}
  updClear();
}
// Nút “Xóa hết”: hiện khi form khách có gì đó để xóa (tên, SĐT, địa chỉ hoặc khách cũ đã chọn)
function updClear(){
  const b=$('#clearCust'); if(!b||!F) return;
  const v=id=>(($(id)||{}).value||'').trim();
  b.hidden=!(F.customerId||v('#f_name')||v('#f_phone')||v('#f_addr'));
}
function updSugg(){
  const box=$('#sugg'); if(!box)return;
  if(F.customerId){box.innerHTML='';return}
  const qn=norm(F.name), qd=digits(F.phone);
  if(!qn&&qd.length<3){box.innerHTML='';return}
  const m=S.customers.filter(c=>(qn&&norm(c.name).includes(qn))||(qd.length>=3&&digits(c.phone).includes(qd))).slice(0,5);
  box.innerHTML=m.map(c=>`<button type="button" data-act="pick" data-id="${c.id}"><b>${esc(c.name)} <i>· ${esc(c.phone||'chưa có SĐT')}</i></b>${c.address?`<span>${esc(c.address)}</span>`:''}</button>`).join('');
}
async function saveOrder(btn){
  if(!can(F&&F.id?'order.edit':'order.create')){toast(NOPERM);return}
  const items=Object.values(F.itemMap).filter(it=>it.qty>0);
  if(!items.length){toast(`Chọn ít nhất một ${W.m}.`);return}
  F.name=$('#f_name').value.trim();F.phone=$('#f_phone').value.trim();F.address=$('#f_addr').value.trim();
  F.time=$('#f_time').value;F.date=$('#f_date').value||S.date;F.note=$('#f_note').value.trim();
  if(!F.name&&!F.phone){toast('Nhập tên hoặc số điện thoại khách.');return}
  btn.disabled=true;
  try{
    let cid=F.customerId;
    if(!cid&&F.phone){const ex=S.customers.find(c=>digits(c.phone)&&digits(c.phone)===digits(F.phone)); if(ex) cid=ex.id}
    if(!cid&&roleOf(S.me)!=='shipper'&&$('#f_savecust')&&$('#f_savecust').checked&&F.name){cid=newId('c');await put('customers',cid,{name:F.name,phone:F.phone,address:F.address,note:'',createdAt:Date.now()})}
    const now=Date.now(), id=F.id||newId('o');
    const doc={date:F.date,time:F.time||'',mode:F.mode,customerId:cid||'',name:F.name,phone:F.phone,address:F.address,
      items:items.map(it=>({menuId:it.menuId,name:it.name,price:it.price,qty:it.qty,note:(it.note||'').trim()})),
      total:items.reduce((s,it)=>s+it.price*it.qty,0),note:F.note,payment:F.payment,noCollect:!!F.noCollect,delivered:!!F.delivered,
      createdAt:F.createdAt||now,updatedAt:now,createdBy:F.createdBy||S.me.name,createdById:F.createdById||S.me.id,updatedBy:S.me.name};
    const shId=F.mode==='lay'?'':(can('order.assign')&&$('#f_ship')?$('#f_ship').value:(F.shipperId||''));
    const shS=shId&&S.staff.find(x=>x.id===shId);
    doc.shipperId=shId; doc.shipperName=shId?(shS?shS.name:(F.shipperName||'')):'';
    if(F.sample) doc.sample=true;
    await put('orders',id,doc);
    const isNew=!F.id;
    closeSheet();
    if(isNew&&doc.date!==S.date){S.date=doc.date;S.view='orders';S.sub=null;S.filter='all';subOrders();render()}
    toast(doc.date===dstr(new Date())?'Đã lưu đơn hôm nay':doc.date===tomorrowStr()?'Đã lưu đơn ngày mai '+ddm(doc.date):'Đã lưu đơn ngày '+ddm(doc.date));
  }catch(e){fail(e);btn.disabled=false}
}

/* ---------- nhập đơn từ comment Facebook: AI đọc → đơn nháp → người xem lại, sửa → tạo ---------- */
const CM_MAX_IMG=20, CM_CHUNK=4;   // tối đa 20 ảnh mỗi lần nhập; gửi AI từng đợt 4 ảnh
// Bỏ các dòng chữ giao diện Facebook khi dán (Thích, Trả lời, "12 giờ"…) cho đỡ nhiễu
const FB_UI=/^(thích|trả lời|chia sẻ|tác giả|theo dõi|đã chỉnh sửa|hàng đầu|phù hợp nhất|tất cả bình luận|viết bình luận.*|xem (thêm )?\d* ?(câu trả lời|phản hồi|bình luận).*)$/i;
const FB_TIME=/^\d+\s*(giây|phút|giờ|ngày|tuần|tháng|năm)$/i;
// Dòng "12 giờ" đứng một mình có thể là giờ giao do khách viết, nên chỉ bỏ thời gian khi nó nằm trong dòng tiêu đề có dấu "·"
function cleanFb(t){
  return String(t||'').split(/\r?\n/).map(l=>{
    const parts=l.trim().split(/\s*[·•]\s*/).filter(Boolean), multi=parts.length>1;
    const kept=parts.filter(p=>!FB_UI.test(p)&&!(multi&&FB_TIME.test(p)));
    const s=kept.join(' ');
    return /^((thích|trả lời|chia sẻ)\s*)+$/i.test(s)?'':s;
  }).filter(Boolean).join('\n');
}
const cmMenu=id=>S.menu.find(m=>m.id===id);
function cmMatches(d){
  const ph=digits(d.phone), nm=norm(d.name).trim();
  if(ph.length>=9){const m=S.customers.filter(c=>digits(c.phone)===ph); if(m.length) return m}
  return nm?S.customers.filter(c=>norm(c.name).trim()===nm):[];
}
// Danh sách khách cũ để chọn: trùng SĐT hoặc trùng tên (để đổi tên sang khách khác vẫn thấy được khách đó)
function cmChoices(d){
  const ph=digits(d.phone), nm=norm(d.name).trim(), out=[];
  for(const c of S.customers) if((ph.length>=9&&digits(c.phone)===ph)||(nm&&norm(c.name).trim()===nm)) out.push(c);
  return out;
}
function cmDraft(o,i){
  const d={on:true,done:false,name:o.customer_name||'',phone:o.phone||'',address:o.address||'',time:o.delivery_time||'',date:o.date||CM.date,
    mode:o.mode==='lay'?'lay':'giao',note:o.note||'',conf:o.confidence||'medium',issues:o.issues||[],raw:o.raw||'',custId:'',
    items:(o.items||[]).map(it=>({mid:it.menu_id&&cmMenu(it.menu_id)?it.menu_id:'',qty:Math.max(1,it.qty|0||1),note:it.note||'',text:it.text||''}))};
  const m=cmMatches(d); if(m.length===1){d.custId=m[0].id; cmFill(d,m[0])}
  return d;
}
function cmFill(d,c,force){ if(force||!d.phone) d.phone=c.phone||''; if(force||!d.address) d.address=c.address||'' }
// Gợi ý khách cũ khi gõ tên/SĐT trong đơn nháp (giống ô gợi ý ở form tạo đơn)
function cmSuggHtml(d,i){
  if(d.done||d.custId) return '';
  const qn=norm(d.name).trim(), qd=digits(d.phone);
  if(!qn&&qd.length<3) return '';
  const m=S.customers.filter(c=>(qn&&norm(c.name).includes(qn))||(qd.length>=3&&digits(c.phone).includes(qd))).slice(0,5);
  return m.map(c=>`<button type="button" data-act="cmt-pick" data-i="${i}" data-id="${c.id}"><b>${esc(c.name)} <i>· ${esc(c.phone||'chưa có SĐT')}</i></b>${c.address?`<span>${esc(c.address)}</span>`:''}</button>`).join('');
}
function cmPick(i,id){ const d=CM&&CM.drafts[i], c=S.customers.find(x=>x.id===id); if(!d||d.done||!c) return;
  d.custId=c.id; d.name=c.name||d.name; cmFill(d,c,true); renderCmt() }
const cmTotal=d=>d.items.reduce((s,it)=>{const m=cmMenu(it.mid);return s+(m?m.price*it.qty:0)},0);
function cmMenuOpts(sel){
  const act=S.menu.filter(m=>m.active!==false).sort(byName), used=new Set();
  const opt=m=>`<option value="${m.id}" ${m.id===sel?'selected':''}>${esc(m.name)} · ${vnd(m.price)}</option>`;
  let h=`<option value="">— Chọn ${W.m} —</option>`;
  for(const g of groupsSorted()){const ms=act.filter(m=>m.groupId===g.id); if(!ms.length) continue; ms.forEach(m=>used.add(m.id)); h+=`<optgroup label="${esc(g.name)}">${ms.map(opt).join('')}</optgroup>`}
  const rest=act.filter(m=>!used.has(m.id)); if(rest.length) h+=`<optgroup label="Khác">${rest.map(opt).join('')}</optgroup>`;
  return h;
}
// Món của bài đăng: comment kiểu "Chị A 1p" không ghi tên món → AI hiểu là món của bài. Nhớ theo máy, trong ngày, theo quán.
const CMPK='dk_cmt_post_v1', CM_FEW=12;
// Lưu theo máy, theo quán: món đã chọn + ghi chú (chỉ dùng lại trong ngày) và danh sách món hay chọn gần đây (giữ qua các ngày)
function cmPostStore(){try{return JSON.parse(localStorage.getItem(CMPK)||'{}')||{}}catch(_){return {}}}
function cmPostGet(){const v=cmPostStore()[shopSlug()]||{}; return {today:v.day===dstr(new Date())?v:null, recent:Array.isArray(v.recent)?v.recent:[]}}
function cmPostSet(){try{const m=cmPostStore(), old=(m[shopSlug()]||{}).recent||[];
  m[shopSlug()]={day:dstr(new Date()),ids:CM.post,note:CM.pnote,recent:[...new Set([...CM.post,...old])].slice(0,16)}; localStorage.setItem(CMPK,JSON.stringify(m))}catch(_){}}
function cmPostMenu(){
  const act=S.menu.filter(m=>m.active!==false).sort(byName), used=new Set(), out=[];
  for(const g of groupsSorted()){const ms=act.filter(m=>m.groupId===g.id); ms.forEach(m=>{used.add(m.id);out.push(m)})}
  return out.concat(act.filter(m=>!used.has(m.id)));
}
function cmtOpen(){
  const pv=cmPostGet(), ok=new Set(S.menu.filter(m=>m.active!==false).map(m=>m.id));
  CM={step:'in',text:'',imgs:[],date:tomorrowStr(),busy:false,err:'',drafts:[],ignored:[],prog:null,resume:false,
    post:pv.today?(pv.today.ids||[]).filter(id=>ok.has(id)):[],pnote:pv.today?String(pv.today.note||''):'',pq:'',pall:false,recent:pv.recent.filter(id=>ok.has(id))};
  renderCmt();
}
const cmChip=(m,on)=>`<button type="button" class="chip${on?' on':''}" data-act="cmt-post" data-id="${m.id}" aria-pressed="${on}" ${CM.busy?'disabled':''}>${on?'✓ ':''}${esc(m.name)}<span>${vnd(m.price)}</span>${on?'<b aria-hidden="true">×</b>':''}</button>`;
// Menu ít (≤12): hiện hết để bấm. Menu dài (vd 100 món, hôm nay bán 3): món đã chọn ở trên; gõ tìm → hiện món khớp;
// chưa gõ → hiện món hay chọn gần đây + nút "Xem tất cả".
function cmPostChips(){
  const all=cmPostMenu(), sel=new Set(CM.post), byId=new Map(all.map(m=>[m.id,m]));
  if(all.length<=CM_FEW) return `<div class="cm-post">${all.map(m=>cmChip(m,sel.has(m.id))).join('')}</div>`;
  const q=norm(CM.pq||'').trim();
  const picked=CM.post.map(id=>byId.get(id)).filter(Boolean);
  let h=picked.length?`<div class="cm-post cm-sel">${picked.map(m=>cmChip(m,true)).join('')}</div>`:'';
  if(q){
    const hit=all.filter(m=>!sel.has(m.id)&&norm(m.name).includes(q));
    h+=hit.length?`<div class="cm-post">${hit.slice(0,24).map(m=>cmChip(m,false)).join('')}</div>${hit.length>24?`<p class="hint">…và ${hit.length-24} ${W.m} khác, gõ thêm chữ để lọc.</p>`:''}`
      :`<p class="hint">Không có ${W.m} nào khớp "${esc(CM.pq)}".</p>`;
  } else if(CM.pall){
    h+=`<div class="cm-post">${all.filter(m=>!sel.has(m.id)).map(m=>cmChip(m,false)).join('')}</div><button type="button" class="linkbtn" data-act="cmt-pall">Thu gọn danh sách</button>`;
  } else {
    const rec=CM.recent.filter(id=>!sel.has(id)).map(id=>byId.get(id)).filter(Boolean).slice(0,8);
    if(rec.length) h+=`<p class="cm-lab">Hay chọn gần đây</p><div class="cm-post">${rec.map(m=>cmChip(m,false)).join('')}</div>`;
    h+=`<button type="button" class="linkbtn" data-act="cmt-pall">Xem tất cả ${all.length} ${W.m}</button>`;
  }
  return h;
}
function cmSync(){ if(!CM||CM.step!=='in')return; const t=$('#cm_text'),d=$('#cm_date'),n=$('#cm_pnote'); if(t) CM.text=t.value; if(d&&d.value) CM.date=d.value; if(n) CM.pnote=n.value }
function renderCmt(){
  if(!CM) return;
  const sb=document.querySelector('#sheetBox .sh-body'), top=sb?sb.scrollTop:0;
  if(CM.step==='in'){
    openSheet(`${head('Nhập đơn từ comment','Dán chữ hoặc ảnh chụp comment Facebook')}
    <div class="sh-body">
      <section class="fs"><h4>Bài đăng này bán ${W.m} gì?${CM.post.length?` <span class="cm-cnt">đã chọn ${CM.post.length}</span>`:''}</h4>
        <p class="hint">Chọn ${W.m} của bài đăng. Comment chỉ ghi "1p", "2 phần", "1 M"… thì AI hiểu là ${W.m} này. Không chọn thì AI đoán theo chữ trong comment.</p>
        ${cmPostMenu().length>CM_FEW?`<input type="search" id="cm_pq" class="cm-pq" placeholder="Gõ tên ${W.m} để tìm, vd: hai san" value="${esc(CM.pq)}" autocomplete="off" ${CM.busy?'disabled':''}>`:''}
        <div id="cm_post">${cmPostChips()}</div>
        <div class="field"><label for="cm_pnote">Ghi thêm cho AI (không bắt buộc)</label><input type="text" id="cm_pnote" maxlength="500" value="${esc(CM.pnote)}" placeholder="VD: không ghi size thì là size M" ${CM.busy?'disabled':''}></div>
      </section>
      <section class="fs"><h4>Comment</h4>
        <textarea id="cm_text" class="cm-text" placeholder="Dán comment vào đây.&#10;VD: Chị Như : 2p ( Sóc Trăng )&#10;Chị Yến : mai 6h ship 1p, ko tiêu" ${CM.busy?'disabled':''}>${esc(CM.text)}</textarea>
        <div class="cm-imgs">${CM.imgs.map((im,i)=>`<div class="cm-th"><img src="${im.url}" alt="Ảnh ${i+1}"><button type="button" data-act="cmt-rmimg" data-i="${i}" aria-label="Bỏ ảnh">×</button></div>`).join('')}
          ${CM.imgs.length<CM_MAX_IMG?`<label class="cm-add" for="cm_file">+ Thêm ảnh chụp<input type="file" id="cm_file" class="vh" accept="image/*" multiple></label>`:''}</div>
        <span class="hint">Chụp màn hình comment rồi thêm ảnh (máy tính: Ctrl+V để dán). Tối đa ${CM_MAX_IMG} ảnh mỗi lần; chụp cuộn chồng lên nhau cũng được, đơn bị trùng sẽ tự bỏ tick.</span>
      </section>
      <section class="fs"><h4>Ngày giao</h4>
        <div class="field"><label for="cm_date">Dùng ngày này cho đơn không ghi ngày</label><input type="date" id="cm_date" value="${esc(CM.date)}"></div>
      </section>
      ${CM.err?`<div class="banner warn" role="alert">${esc(CM.err)}</div>`:''}
      <p class="hint">AI chỉ tạo <b>đơn nháp</b>. Anh/chị xem lại và sửa từng đơn trước khi bấm tạo — chưa có đơn nào được lưu ở bước này.</p>
    </div>
    <div class="sh-foot"><span></span><button class="btn primary" data-act="cmt-read" ${CM.busy?'disabled':''}>${CM.busy?(CM.prog?`Đang đọc… đợt ${CM.prog.k}/${CM.prog.n}`:'Đang đọc comment…'):'Đọc comment'}</button></div>`);
    return;
  }
  const todo=CM.drafts.filter(d=>d.on&&!d.done).length;
  openSheet(`${head('Xem lại đơn nháp',`Đọc được ${CM.drafts.length} đơn${CM.ignored.length?' · bỏ qua '+CM.ignored.length+' dòng':''}`)}
  <div class="sh-body">
    <p class="hint">AI có thể đọc sai. Kiểm tra ${W.m}, size, giờ của từng đơn rồi mới tạo. Bỏ tick đơn nào không muốn tạo.</p>
    ${CM.err?`<div class="banner warn" role="alert">${esc(CM.err)}</div>`:''}
    ${CM.drafts.map(cmCard).join('')||'<div class="empty"><b>Không đọc được đơn nào</b>Thử dán rõ hơn hoặc thêm ảnh chụp.</div>'}
    ${CM.ignored.length?`<details class="cm-ign"><summary>${CM.ignored.length} dòng đã bỏ qua (không phải đặt ${W.m})</summary><ul>${CM.ignored.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`:''}
  </div>
  <div class="sh-foot"><button class="btn" data-act="cmt-back">‹ Đọc lại</button><button class="btn primary" data-act="cmt-save" ${todo?'':'disabled'}>Tạo ${todo} đơn</button></div>`);
  const nb=document.querySelector('#sheetBox .sh-body'); if(nb&&top) nb.scrollTop=top;
}
const CONF={high:['Rõ ràng','ok'],medium:['Cần xem lại','mid'],low:['Nhiều chỗ chưa chắc','low']};
function cmCard(d,i){
  const ms=cmChoices(d), cf=CONF[d.conf]||CONF.medium;
  const cust=ms.length?`<div class="field"><label for="cm_c${i}">Khách cũ trùng tên/SĐT</label><select id="cm_c${i}" data-cm="cust" data-i="${i}"><option value="">— Khách mới —</option>${ms.map(c=>`<option value="${c.id}" ${c.id===d.custId?'selected':''}>${esc(c.name)} · ${esc(c.phone||'chưa có SĐT')}${c.address?' · '+esc(c.address.slice(0,30)):''}</option>`).join('')}</select></div>`:'';
  const rows=d.items.map((it,j)=>`<div class="cm-item ${it.mid?'':'bad'}">
      <select data-cm="item-mid" data-i="${i}" data-j="${j}" aria-label="${W.M}">${cmMenuOpts(it.mid)}</select>
      <div class="stepper"><button type="button" data-act="cmt-qty" data-i="${i}" data-j="${j}" data-d="-1" aria-label="Bớt">−</button><output class="num">${it.qty}</output><button type="button" data-act="cmt-qty" data-i="${i}" data-j="${j}" data-d="1" aria-label="Thêm">+</button></div>
      <span class="cm-lp num">${cmMenu(it.mid)?vnd(cmMenu(it.mid).price*it.qty):''}</span>
      <button type="button" class="sbtn" data-act="cmt-rmitem" data-i="${i}" data-j="${j}" aria-label="Xoá ${W.m}">×</button>
      <input type="text" class="cm-inote" data-cm="item-note" data-i="${i}" data-j="${j}" placeholder="Ghi chú ${W.m}" value="${esc(it.note)}">
      ${it.mid?'':`<small class="cm-miss">Chưa chọn ${W.m}${it.text?' · khách viết: “'+esc(it.text)+'”':''}</small>`}
    </div>`).join('');
  return `<section class="cm-card ${d.on?'':'off'} ${d.done?'done':''}" data-card="${i}">
    <div class="cm-top"><label class="check"><input type="checkbox" data-cm="on" data-i="${i}" ${d.on&&!d.done?'checked':''} ${d.done?'disabled':''}><b>Đơn ${i+1}</b></label>
      ${d.done?'<span class="cm-conf ok">Đã tạo ✓</span>':`<span class="cm-conf ${cf[1]}">${cf[0]}</span>`}</div>
    ${d.raw?`<div class="cm-raw">“${esc(d.raw)}”</div>`:''}
    ${d.issues.length&&!d.done?`<ul class="cm-issues">${d.issues.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
    <div class="namerow">
      <div class="field"><label for="cm_n${i}">Tên khách</label><input type="text" id="cm_n${i}" data-cm="name" data-i="${i}" value="${esc(d.name)}"></div>
      <div class="field"><label for="cm_p${i}">Số điện thoại</label><input type="tel" id="cm_p${i}" data-cm="phone" data-i="${i}" value="${esc(d.phone)}"></div>
    </div>
    <div class="sugg" id="cm_s${i}">${cmSuggHtml(d,i)}</div>
    ${cust}
    <div class="field"><label for="cm_a${i}">Địa chỉ giao</label><input type="text" id="cm_a${i}" data-cm="address" data-i="${i}" value="${esc(d.address)}"></div>
    <div class="seg"><button type="button" data-act="cmt-mode" data-i="${i}" data-v="giao" aria-pressed="${d.mode==='giao'}">Giao tận nơi</button><button type="button" data-act="cmt-mode" data-i="${i}" data-v="lay" aria-pressed="${d.mode==='lay'}">Khách ghé lấy</button></div>
    <div class="grid2 tdate">
      <div class="field"><label for="cm_t${i}">Trước mấy giờ</label><input type="time" id="cm_t${i}" data-cm="time" data-i="${i}" value="${esc(d.time)}"></div>
      <div class="field"><label for="cm_d${i}">Ngày</label><input type="date" id="cm_d${i}" data-cm="date" data-i="${i}" value="${esc(d.date)}"></div>
    </div>
    <div class="cm-items">${rows}<button type="button" class="sbtn" data-act="cmt-additem" data-i="${i}">+ Thêm ${W.m}</button></div>
    <div class="field"><label for="cm_o${i}">Ghi chú đơn</label><input type="text" id="cm_o${i}" data-cm="note" data-i="${i}" value="${esc(d.note)}"></div>
    <div class="cm-sum"><small>Thành tiền</small><strong class="num" id="cm_tot${i}">${vnd(cmTotal(d))}</strong></div>
  </section>`;
}
// Cập nhật khi gõ/chọn trong màn hình xem lại (không vẽ lại cả form để giữ con trỏ)
function cmField(t,kind){
  if(!CM||CM.step!=='review')return;
  const i=+t.dataset.i, d=CM.drafts[i]; if(!d||d.done) return;
  const k=t.dataset.cm, j=+t.dataset.j;
  if(kind==='input'){
    if(k==='name'||k==='phone'||k==='address'||k==='note'||k==='time'){
      d[k]=t.value;
      if((k==='name'||k==='phone')&&d.custId){ const c=S.customers.find(x=>x.id===d.custId); if(!c||(k==='name'?norm(c.name).trim()!==norm(t.value).trim():digits(c.phone)!==digits(t.value))) d.custId='' }
      if(k==='name'||k==='phone'){ const box=$('#cm_s'+i); if(box) box.innerHTML=cmSuggHtml(d,i) }
    }
    else if(k==='date'){ if(t.value) d.date=t.value }
    else if(k==='item-note'&&d.items[j]) d.items[j].note=t.value;
    return;
  }
  // change
  if(k==='on'){d.on=t.checked; renderCmt(); return}
  if(k==='cust'){d.custId=t.value; const c=S.customers.find(x=>x.id===t.value); if(c) cmFill(d,c,true); renderCmt(); return}
  if(k==='item-mid'&&d.items[j]){d.items[j].mid=t.value; renderCmt(); return}
  if(k==='name'||k==='phone'){
    if(!d.custId){
      // vừa sửa tên -> ưu tiên khách trùng TÊN (SĐT cũ có thể là của người khác); vừa sửa SĐT -> khách trùng SĐT
      const m=k==='name'?S.customers.filter(c=>norm(c.name).trim()===norm(d.name).trim()&&norm(d.name).trim()):cmMatches(d);
      if(m.length===1){ d.custId=m[0].id; cmFill(d,m[0],true) }
      if(m.length||cmChoices(d).length) renderCmt()
    }
  }
}
function cmtQty(i,j,dl){ const d=CM&&CM.drafts[i], it=d&&d.items[j]; if(!it)return; it.qty=Math.max(1,Math.min(999,it.qty+dl));
  const out=document.querySelectorAll(`[data-card="${i}"] .cm-item`)[j]; if(out){out.querySelector('output').textContent=it.qty; const m=cmMenu(it.mid); out.querySelector('.cm-lp').textContent=m?vnd(m.price*it.qty):''}
  const tot=$('#cm_tot'+i); if(tot) tot.textContent=vnd(cmTotal(d)) }
async function cmtFiles(files){
  if(!CM||CM.step!=='in') return;
  cmSync();
  let bad=0;
  for(const f of [...files]){
    if(CM.imgs.length>=CM_MAX_IMG){CM.err='Tối đa '+CM_MAX_IMG+' ảnh mỗi lần.';break}
    try{CM.imgs.push(await cmtPrep(f))}catch(e){bad++}
  }
  if(bad) CM.err=bad+' ảnh không đọc được hoặc quá nặng.';
  renderCmt();
}
// Thu nhỏ ảnh trước khi gửi (ảnh chụp màn hình điện thoại có thể rất nặng)
function cmtPrep(file){
  return new Promise((res,rej)=>{
    if(!/^image\//.test(file.type||'')) return rej(new Error('not image'));
    const LIM=2400000, rd=new FileReader();
    rd.onerror=()=>rej(new Error('read'));
    rd.onload=()=>{
      const src=String(rd.result), done=u=>{const m=/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(u); (m&&m[2].length<=LIM)?res({media_type:m[1],data:m[2],url:u}):rej(new Error('bad'))};
      let c=null; try{c=document.createElement('canvas'); if(!c.getContext||!c.getContext('2d')) c=null}catch(_){c=null}
      if(!c) return done(src);
      const im=new Image(), tm=setTimeout(()=>im.onerror&&im.onerror(),10000);
      im.onerror=()=>{clearTimeout(tm); done(src)};
      im.onload=()=>{clearTimeout(tm);
        try{ let k=Math.min(1,2400/Math.max(im.width,im.height)), q=.82, out='';
          for(let n=0;n<4;n++){ c.width=Math.max(1,Math.round(im.width*k)); c.height=Math.max(1,Math.round(im.height*k)); const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); x.drawImage(im,0,0,c.width,c.height); out=c.toDataURL('image/jpeg',q); if(out.length<=LIM) break; k*=.8; q=.7 }
          done(out) }catch(e){ done(src) }
      };
      im.src=src;
    };
    rd.readAsDataURL(file);
  });
}
// Đánh dấu đơn có thể trùng (ảnh chụp cuộn màn hình chồng lên nhau): cùng nguyên văn comment, hoặc cùng tên khách + cùng món/số lượng.
// Không xoá: bỏ tick và ghi chú để người dùng tự quyết.
function cmMarkDup(list){
  const seen=new Map();
  list.forEach((d,i)=>{
    const sig=d.items.map(it=>(it.mid||norm(it.text))+'x'+it.qty).sort().join(',');
    const keys=[norm(d.raw).replace(/\s+/g,' ').trim(), norm(d.name).trim()+'|'+sig].filter(k=>k.length>3);
    const hit=keys.map(k=>seen.get(k)).find(x=>x!==undefined);
    if(hit!==undefined&&!d.done){ d.on=false; if(!d.issues.some(x=>/trùng với đơn/.test(x))) d.issues=['Có thể trùng với đơn '+(hit+1)+' (ảnh chụp chồng nhau), đã bỏ tick',...d.issues] }
    else keys.forEach(k=>{ if(!seen.has(k)) seen.set(k,i) });
  });
  return list;
}
// Đọc theo từng đợt CM_CHUNK ảnh (mỗi đợt một lần gọi AI) để không quá thời gian của máy chủ; chữ dán gửi kèm đợt đầu.
// Một đợt lỗi: giữ các đơn đã đọc được, các ảnh chưa đọc ở lại để bấm "‹ Đọc lại" đọc tiếp (đơn mới được nối thêm).
async function cmtRead(btn){
  cmSync();
  const text=cleanFb(CM.text);
  if(!text&&!CM.imgs.length){CM.err='Dán chữ hoặc thêm ảnh chụp trước nhé.';renderCmt();return}
  const chunks=[]; for(let i=0;i<CM.imgs.length;i+=CM_CHUNK) chunks.push(CM.imgs.slice(i,i+CM_CHUNK));
  if(!chunks.length) chunks.push([]);
  cmPostSet();
  CM.busy=true; CM.err='';
  const got=[], ign=[]; let failAt=-1, msg='';
  for(let k=0;k<chunks.length;k++){
    CM.prog=chunks.length>1?{k:k+1,n:chunks.length}:null; renderCmt();
    try{
      const r=await fnCall('parse-orders',{text:k===0?text:'',images:chunks[k].map(i=>({media_type:i.media_type,data:i.data})),post_items:CM.post,post_note:String(CM.pnote||'').trim()});
      if(!CM) return;
      got.push(...(r.orders||[])); ign.push(...(r.ignored||[]));
    }catch(e){
      if(!CM) return;
      failAt=k; msg=(e&&e.code==='app'&&e.message)||'Chưa đọc được, thử lại nhé.'; console.error(e); break;
    }
  }
  CM.busy=false; CM.prog=null;
  if(failAt===0){ CM.err=msg; renderCmt(); return }   // chưa đọc được gì: ở lại màn hình nhập như cũ
  const fresh=got.map(cmDraft);
  CM.drafts=cmMarkDup(CM.resume?[...CM.drafts,...fresh]:fresh); CM.ignored=CM.resume?[...CM.ignored,...ign]:ign;
  CM.step='review'; CM.resume=false; CM.err='';
  if(failAt>0){
    const doneImgs=failAt*CM_CHUNK, left=CM.imgs.length-doneImgs;
    CM.imgs=CM.imgs.slice(doneImgs); CM.text=''; CM.resume=true;
    CM.err=`Đã đọc ${doneImgs} ảnh đầu. Còn ${left} ảnh chưa đọc được (${msg}). Bấm "‹ Đọc lại" để đọc tiếp các ảnh đó, đơn đọc được sẽ nối thêm vào đây.`;
  } else if(!CM.drafts.length) CM.err='Không đọc được đơn nào trong nội dung này.';
  renderCmt();
}
async function cmtSave(btn){
  if(!can('order.create')){toast(NOPERM);return}
  const todo=CM.drafts.filter(d=>d.on&&!d.done); if(!todo.length) return;
  const errs=[];
  CM.drafts.forEach((d,i)=>{ if(!d.on||d.done) return;
    if(!d.name.trim()&&!d.phone.trim()) errs.push(`Đơn ${i+1}: thiếu tên khách`);
    else if(!d.items.length) errs.push(`Đơn ${i+1}: chưa có ${W.m}`);
    else if(d.items.some(it=>!it.mid)) errs.push(`Đơn ${i+1}: còn ${W.m} chưa chọn`);
    else if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) errs.push(`Đơn ${i+1}: ngày không hợp lệ`) });
  if(errs.length){CM.err=errs.join(' · ')+'. Sửa hoặc bỏ tick đơn đó.'; renderCmt(); const f=document.querySelector('.cm-item.bad,.cm-card:not(.off)'); if(f&&f.scrollIntoView) try{f.scrollIntoView({block:'center'})}catch(_){} return}
  btn.disabled=true; CM.err='';
  const made=[], batch=new Map(); let bad=0;
  for(const d of todo){
    try{
      let cid=d.custId;
      if(!cid&&digits(d.phone)){const ex=S.customers.find(c=>digits(c.phone)&&digits(c.phone)===digits(d.phone)); if(ex) cid=ex.id}
      if(!cid&&d.name.trim()){const key=norm(d.name).trim()+'|'+digits(d.phone);
        if(batch.has(key)) cid=batch.get(key); else {cid=newId('c'); await put('customers',cid,{name:d.name.trim(),phone:d.phone.trim(),address:d.address.trim(),note:'',createdAt:Date.now()}); batch.set(key,cid)}}
      const merged=new Map();
      for(const it of d.items){const m=cmMenu(it.mid); const e=merged.get(it.mid);
        if(e){e.qty+=it.qty; if(it.note.trim()&&!e.note.includes(it.note.trim())) e.note=(e.note?e.note+'; ':'')+it.note.trim()}
        else merged.set(it.mid,{menuId:m.id,name:m.name,price:m.price,qty:it.qty,note:it.note.trim()})}
      const items=[...merged.values()], now=Date.now(), id=newId('o');
      await put('orders',id,{date:d.date,time:d.mode==='lay'&&!d.time?'':d.time,mode:d.mode,customerId:cid||'',name:d.name.trim(),phone:d.phone.trim(),address:d.address.trim(),
        items,total:items.reduce((s,it)=>s+it.price*it.qty,0),note:d.note.trim(),payment:'unpaid',noCollect:false,delivered:false,
        createdAt:now,updatedAt:now,createdBy:S.me.name,createdById:S.me.id,updatedBy:S.me.name,shipperId:'',shipperName:''});
      d.done=true; d.on=false; made.push(d);
    }catch(e){bad++; console.error(e); d.err=true}
  }
  if(bad){CM.err=`Đã tạo ${made.length} đơn. ${bad} đơn chưa lưu được (giữ lại bên dưới), bấm Tạo lại nhé.`; todo.forEach(d=>{if(!d.done) d.on=true}); renderCmt(); return}
  const dt=made[0].date; closeSheet();
  if(dt!==S.date){S.date=dt;S.view='orders';S.sub=null;S.filter='all';subOrders()}
  render(); toast(`Đã tạo ${made.length} đơn${dt===tomorrowStr()?' cho ngày mai':' ngày '+ddm(dt)}`);
}

function groupForm(g){
  const n=g?S.menu.filter(m=>m.groupId===g.id).length:0;
  const next=g?gOrd(g):(Math.max(0,...S.groups.map(gOrd))+1);
  openSheet(`${head(g?`Sửa nhóm ${W.m}`:`Thêm nhóm ${W.m}`)}
  <div class="sh-body"><section class="fs">
    <div class="field"><label for="g_name">Tên nhóm</label><input type="text" id="g_name" value="${esc(g?g.name:'')}" placeholder="VD: ${isRetail()?'Chăm sóc da, Trang điểm':'Cơm, Topping, Nước'}"></div>
    <div class="field"><label for="g_order">Thứ tự hiển thị</label><input inputmode="numeric" id="g_order" value="${next}"><span class="hint">0 = ẩn khi tạo đơn. 1, 2, 3… = thứ tự tab trong form tạo đơn.</span></div>
  </section>
  ${g&&can('menu.delete')?`<div><button class="btn danger" data-act="del" data-col="groups" data-id="${g.id}">Xoá nhóm</button></div>${n?`<p class="hint">${n} ${W.m} trong nhóm sẽ chuyển sang “Chưa xếp nhóm”, không bị xoá.</p>`:''}`:''}
  </div>
  <div class="sh-foot"><span></span><button class="btn primary" data-act="save-group" data-id="${g?g.id:''}">Lưu nhóm</button></div>`);
  if(!g) setTimeout(()=>$('#g_name').focus(),50);
}
async function saveGroup(btn){
  const name=$('#g_name').value.trim(); if(!name){toast('Nhập tên nhóm.');return}
  const order=parseInt(digits($('#g_order').value)||'0',10);
  btn.disabled=true;
  const id=btn.dataset.id||newId('g'); const old=S.groups.find(x=>x.id===id);
  const doc={name,order,createdAt:old?.createdAt||Date.now()}; if(old?.sample) doc.sample=true;
  try{await put('groups',id,doc);closeSheet();toast(order?'Đã lưu nhóm':'Đã lưu, nhóm này ẩn khi tạo đơn')}catch(e){fail(e);btn.disabled=false}
}
function menuForm(m,presetGid){
  const gid=m?(groupOf(m)?m.groupId:''):(presetGid||'');
  const opts=groupsSorted().map(g=>`<option value="${g.id}" ${g.id===gid?'selected':''}>${esc(g.name)}${gOrd(g)?'':' (ẩn)'}</option>`).join('');
  const cv=can('cost.view'), c=m&&cv?costOf(m.id):null, units=UNITS[bizType()];
  openSheet(`${head(m?`Sửa ${W.m}`:`Thêm ${W.m}`)}
  <div class="sh-body"><section class="fs">
    <div class="namesell"><div class="field"><label for="m_name">Tên ${W.m}</label><input type="text" id="m_name" value="${esc(m?m.name:'')}" placeholder="${isRetail()?'VD: Son kem lì 03':'VD: Cơm Gà Mắm Tỏi'}"></div>
      <label class="check sell" title="Bỏ tick = ẩn, không hiện khi tạo đơn"><input type="checkbox" id="m_active" ${!m||m.active!==false?'checked':''}> Đang bán</label></div>
    <div class="field"><label for="m_group">Nhóm ${W.m}</label><select id="m_group"><option value="" ${gid?'':'selected'}>Chưa xếp nhóm</option>${opts}</select></div>
    <div class="grid2">
      <div class="field"><label for="m_price">Giá bán (VNĐ)</label><input inputmode="numeric" id="m_price" autocomplete="off" value="${m?fmtN(m.price):''}" placeholder="VD: 45.000"></div>
      ${cv?`<div class="field"><label for="m_cost">Giá vốn (VNĐ)</label><input inputmode="numeric" id="m_cost" autocomplete="off" value="${c!=null?fmtN(c):''}" placeholder="Chưa có"><span class="hint" id="m_margin"></span></div>`:''}
    </div>
    <div class="field"><label for="m_unit">Đơn vị tính</label><input type="text" id="m_unit" value="${esc(m?m.unit||'':units[0])}" placeholder="${units.slice(0,3).join(', ')}…">
      <div class="unitchips">${units.map(u=>`<button type="button" class="chip" data-act="unit-pick" data-v="${esc(u)}">${esc(u)}</button>`).join('')}</div></div>
    ${cv?`<span class="hint">Giá vốn chỉ người có quyền “Xem và sửa giá vốn” mới thấy. Đơn đã bán giữ giá vốn lúc bán, đổi ở đây chỉ áp dụng cho đơn mới.</span>`:''}
  </section>
  ${m&&can('menu.delete')?`<div><button class="btn danger" data-act="del" data-col="menu" data-id="${m.id}">Xoá ${W.m}</button></div><p class="hint">Xoá ${W.m} không ảnh hưởng các đơn cũ đã ghi. Muốn tạm ngừng bán thì bỏ tick “Đang bán” thay vì xoá.</p>`:''}
  </div>
  <div class="sh-foot"><span></span><button class="btn primary" data-act="save-menu" data-id="${m?m.id:''}">Lưu ${W.m}</button></div>`);
  const pv=()=>{
    const mg=$('#m_margin'); if(!mg) return;
    const p=+digits($('#m_price').value), cs=$('#m_cost').value.trim(), cn=+digits(cs);
    mg.textContent=cs&&p?marginTxt(p,cn):''; mg.classList.toggle('loss',!!(cs&&p&&cn>p));
  };pv();
  for(const id of ['#m_price','#m_cost']){const el=$(id); if(el) el.addEventListener('input',()=>{moneyInput(el);pv()})}
  if(!m) setTimeout(()=>$('#m_name').focus(),50);
}
async function saveMenu(btn){
  const name=$('#m_name').value.trim(), price=+digits($('#m_price').value);
  if(!name){toast(`Nhập tên ${W.m}.`);return} if(!price){toast(`Nhập giá bán ${W.m}.`);return}
  const ce=$('#m_cost'), cs=ce?ce.value.trim():'', cost=cs===''?null:+digits(cs);
  if(ce&&cs!==''&&!/\d/.test(cs)){toast('Giá vốn chỉ nhập số.');return}
  btn.disabled=true;
  const id=btn.dataset.id||newId('m'); const old=S.menu.find(x=>x.id===id);
  const doc={name,price,unit:$('#m_unit').value.trim(),groupId:$('#m_group').value,active:$('#m_active').checked,createdAt:old?.createdAt||Date.now()}; if(old?.sample) doc.sample=true;
  try{
    await put('menu',id,doc);                                  // lưu món trước (giá vốn gắn vào món)
    if(ce&&can('cost.view')){
      const cur=costOf(id);
      try{
        if(cost===null&&cur!==null) await del('costs',id);
        else if(cost!==null&&cost!==cur) await put('costs',id,{cost});
      }catch(e){ if(!old) S.menu.push(Object.assign({id},doc)); closeSheet(); toast(`Đã lưu ${W.m}, nhưng chưa lưu được giá vốn. Mở lại để nhập giá vốn.`); console.error(e); return }
    }
    closeSheet(); toast(`Đã lưu ${W.m}`);
  }catch(e){fail(e);btn.disabled=false}
}
/* loại hình kinh doanh (Cài đặt): chỉ đổi cách gọi tên và mặc định, dữ liệu giữ nguyên */
let BZ='food';
function bizForm(){
  BZ=bizType();
  openSheet(`${head('Loại hình kinh doanh','Đổi cách gọi tên, không ảnh hưởng dữ liệu đã có')}
  <div class="sh-body"><section class="fs">
    <div class="seg" role="group" aria-label="Loại hình kinh doanh">${[['food','Ăn uống'],['retail','Bán sản phẩm']].map(([k,l])=>`<button type="button" data-act="biz-pick" data-v="${k}" aria-pressed="${BZ===k}">${l}</button>`).join('')}</div>
    <span class="hint"><b>Ăn uống</b>: quán cơm, bún, cà phê, trà sữa… gọi là “món”, đơn vị mặc định “Phần”.<br><b>Bán sản phẩm</b>: mỹ phẩm, quần áo, đồ gia dụng… gọi là “sản phẩm”, đơn vị mặc định “Cái”.<br>Đổi qua lại lúc nào cũng được, dữ liệu giữ nguyên.</span>
  </section></div>
  <div class="sh-foot"><span></span><button class="btn primary" data-act="biz-save">Lưu</button></div>`);
}
async function bizSave(btn){
  const type=BZ==='retail'?'retail':'food';
  btn.disabled=true;
  try{
    await put('settings','biz',{type});
    const i=S.settings.findIndex(x=>x.id==='biz'), row={id:'biz',type};
    if(i>=0) S.settings[i]=row; else S.settings.push(row);      // hiện ngay, không chờ máy chủ báo về
    closeSheet(); render(); toast('Đã đổi loại hình: '+(type==='retail'?'Bán sản phẩm':'Ăn uống'));
  }catch(e){fail(e);btn.disabled=false}
}
function custForm(c){
  const n=c?S.orders.filter(o=>o.customerId===c.id).length:0;
  openSheet(`${head(c?'Thông tin khách':'Thêm khách')}
  <div class="sh-body"><section class="fs">
    <div class="namerow">
      <div class="field"><label for="c_name">Tên khách</label><input type="text" id="c_name" value="${esc(c?c.name:'')}"></div>
      <div class="field"><label for="c_phone">Số điện thoại</label><input type="tel" id="c_phone" value="${esc(c?c.phone:'')}"></div>
    </div>
    <div class="field"><label for="c_addr">Địa chỉ</label><input type="text" id="c_addr" value="${esc(c?c.address:'')}"></div>
    <div class="field"><label for="c_note">Ghi chú về khách</label><input type="text" id="c_note" value="${esc(c?c.note:'')}" placeholder="VD: hay lấy ít cơm"></div>
  </section>
  ${c?`${can('order.create')?`<button class="btn" data-act="order-for" data-id="${c.id}">+ Tạo đơn cho khách này</button>`:''}${can('cust.delete')?`<div><button class="btn danger" data-act="del" data-col="customers" data-id="${c.id}">Xoá khách</button></div>`:''}`:''}
  </div>
  <div class="sh-foot"><span></span><button class="btn primary" data-act="save-cust" data-id="${c?c.id:''}">Lưu khách</button></div>`);
}
async function saveCust(btn){
  const name=$('#c_name').value.trim(); if(!name){toast('Nhập tên khách.');return}
  btn.disabled=true;
  const id=btn.dataset.id||newId('c'); const old=S.customers.find(x=>x.id===id);
  const doc={name,phone:$('#c_phone').value.trim(),address:$('#c_addr').value.trim(),note:$('#c_note').value.trim(),createdAt:old?.createdAt||Date.now()}; if(old?.sample) doc.sample=true;
  try{await put('customers',id,doc);closeSheet();toast('Đã lưu khách')}catch(e){fail(e);btn.disabled=false}
}

/* ---------- nhập khách từ Excel / CSV (chỉ quản lý) ---------- */
let IMP=null;
const IMP_KEYS={
  phone:['so dien thoai','dien thoai','sdt','so dt','dt','phone','tel','telephone','mobile','zalo','sdt khach'],
  address:['dia chi','dia chi giao','dia chi giao hang','dc','address','addr'],
  note:['ghi chu','ghi chu khach','note','notes','nhan xet'],
  name:['ten khach hang','ten khach','ho va ten','ho ten','khach hang','ten','name','customer','full name','nguoi nhan']
};
// Số điện thoại: bỏ ký tự thừa, +84 → 0, Excel làm mất số 0 đầu (9 chữ số) thì thêm lại
function normPhone(v){
  let d=String(v==null?'':v).replace(/\D/g,'');
  if(d.startsWith('84')&&(d.length===11||d.length===12)) d='0'+d.slice(2);
  else if(d.length===9&&/^[35789]/.test(d)) d='0'+d;
  return d;
}
function decodeText(buf){
  let t;
  try{t=new TextDecoder('utf-8',{fatal:true}).decode(buf)}
  catch(_){try{t=new TextDecoder('windows-1258').decode(buf)}catch(_2){t=new TextDecoder().decode(buf)}}
  return t.replace(/^﻿/,'');
}
function parseCSV(text,preferTab){
  text=String(text).replace(/^﻿/,'');
  const first=text.split(/\r?\n/,1)[0]||'';
  const count=ch=>first.split(ch).length-1;
  let delim=',',best=count(',');
  if(preferTab&&count('\t')>0){delim='\t'}
  else for(const d of [';','\t','|']){const c=count(d); if(c>best){best=c;delim=d}}
  const rows=[]; let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){cur+='"';i++} else q=false } else cur+=ch }
    else if(ch==='"'&&cur==='') q=true;
    else if(ch===delim){row.push(cur);cur=''}
    else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n') i++; row.push(cur);cur='';rows.push(row);row=[] }
    else cur+=ch;
  }
  if(cur!==''||row.length){row.push(cur);rows.push(row)}
  return rows;
}
const readBuf=file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error||new Error('read'));r.readAsArrayBuffer(file)});
let xlsxP=null;
function loadXLSX(){
  if(window.XLSX) return Promise.resolve(window.XLSX);
  if(xlsxP) return xlsxP;
  xlsxP=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload=()=>window.XLSX?res(window.XLSX):rej(new Error('no XLSX'));
    s.onerror=()=>{xlsxP=null;rej(new Error('load fail'))}; document.head.appendChild(s)});
  return xlsxP;
}
function detectHeader(rows){
  const m={name:-1,phone:-1,address:-1,note:-1}; let hits=0;
  (rows[0]||[]).forEach((h,i)=>{
    const n=' '+norm(h).replace(/[^a-z0-9]+/g,' ').trim()+' ';
    for(const k of ['phone','address','note','name']){
      if(m[k]===-1&&IMP_KEYS[k].some(w=>n.includes(' '+w+' '))){m[k]=i;hits++;break}
    }
  });
  return {m,hits};
}
function guessMap(rows,ncol){
  const m={name:-1,phone:-1,address:-1,note:-1}, sample=rows.slice(0,50);
  const isPhone=v=>{const s=String(v||'').trim(),d=normPhone(s);return d.length>=9&&d.length<=11&&s.replace(/[\d\s.+\-()]/g,'')===''};
  const isIdx=v=>/^\d{1,4}$/.test(String(v||'').trim());
  let best=-1,bs=0;
  for(let c=0;c<ncol;c++){const hit=sample.filter(r=>isPhone(r[c])).length; if(hit>bs){bs=hit;best=c}}
  if(best>=0&&bs>=Math.ceil(sample.length/2)) m.phone=best;
  const rest=[...Array(ncol).keys()].filter(c=>c!==m.phone&&!(sample.length&&sample.filter(r=>isIdx(r[c])).length>=sample.length*0.8));
  m.name=rest[0]!=null?rest[0]:-1; m.address=rest[1]!=null?rest[1]:-1; m.note=rest[2]!=null?rest[2]:-1;
  return m;
}
const colLabel=i=>{const h=IMP&&IMP.header&&IMP.rows[0]?String(IMP.rows[0][i]||'').trim():''; return h||('Cột '+(i<26?String.fromCharCode(65+i):i+1))};
function impLoad(raw,name,note){
  let rows=raw.map(r=>r.map(c=>String(c==null?'':c).trim())).filter(r=>r.some(c=>c!==''));
  if(!rows.length){toast('Không thấy dữ liệu nào trong file.');return false}
  let cut=false; if(rows.length>5001){rows=rows.slice(0,5001);cut=true}
  const ncol=Math.min(60,Math.max(...rows.slice(0,300).map(r=>r.length)));
  const {m,hits}=detectHeader(rows);
  let header=hits>0, map=m;
  if(!header) map=guessMap(rows,ncol);
  else if(m.name===-1&&m.phone===-1) map=guessMap(rows.slice(1),ncol);
  Object.assign(IMP,{rows,ncol,header,map,name:name||'',note:note||'',cut});
  renderImp();
  if(cut) toast('File dài, chỉ đọc 5.000 dòng đầu.');
  return true;
}
async function impFile(file){
  if(!can('cust.import')||!IMP||!file) return;
  try{
    const buf=await readBuf(file); const b=new Uint8Array(buf.slice(0,4));
    const isX=/\.(xlsx|xlsm|xls)$/i.test(file.name)||(b[0]===0x50&&b[1]===0x4B)||(b[0]===0xD0&&b[1]===0xCF);
    if(isX){
      const X=await loadXLSX(); const wb=X.read(new Uint8Array(buf),{type:'array'});
      let rows=null,sheet='';
      for(const n of wb.SheetNames){const r=X.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''}); if(r.some(x=>x.some(c=>String(c).trim()!==''))){rows=r;sheet=n;break}}
      if(!rows){toast('File Excel không có dữ liệu.');return}
      impLoad(rows,file.name,wb.SheetNames.length>1?'Đang đọc trang tính “'+sheet+'”':'');
    }else impLoad(parseCSV(decodeText(buf)),file.name,'');
  }catch(e){console.error(e);toast('Không đọc được file này. Thử lưu thành .csv hoặc dán dữ liệu bên dưới.')}
}
function impPaste(){
  if(!can('cust.import')||!IMP) return;
  const t=($('#imp_paste')||{}).value||'';
  if(!t.trim()){toast('Chưa có dữ liệu để đọc. Hãy dán vào ô trống.');return}
  impLoad(parseCSV(t,true),'Dữ liệu dán','');
}
function impBuild(){
  const st={add:0,update:0,skip:0,existing:0,reasons:{},badPhone:0}, items=[];
  if(!IMP||!IMP.rows.length) return {items,stats:st};
  const body=IMP.rows.slice(IMP.header?1:0);
  const get=(r,k)=>{const i=IMP.map[k]; return i>=0?String(r[i]==null?'':r[i]).trim():''};
  const exPhone=new Map(), exKey=new Map();
  S.customers.forEach(c=>{const d=normPhone(c.phone); if(d) exPhone.set(d,c); else exKey.set('n:'+norm(c.name)+'|'+norm(c.address),c)});
  const seen=new Set();
  const skip=reason=>{st.skip++;st.reasons[reason]=(st.reasons[reason]||0)+1;items.push({action:'skip',reason})};
  for(const r of body){
    let name=get(r,'name'), phone=normPhone(get(r,'phone')), address=get(r,'address'), note=get(r,'note');
    if(!name&&!phone&&!address&&!note) continue;
    if(!name&&!phone){skip('thiếu tên và số điện thoại');continue}
    const hasName=!!name; if(!name) name=phone;
    if(phone&&(phone.length<9||phone.length>11)) st.badPhone++;
    const key=phone?'p:'+phone:'n:'+norm(name)+'|'+norm(address);
    if(seen.has(key)){skip('trùng trong file');continue}
    seen.add(key);
    const ex=phone?exPhone.get(phone):exKey.get(key);
    if(!ex){st.add++;items.push({action:'add',name,phone,address,note});continue}
    st.existing++;
    if(IMP.mode==='skip'){skip('khách đã có trong app');continue}
    const patch={}, inc={name:hasName?name:'',address,note};
    for(const k of ['name','address','note']){
      const v=inc[k]; if(!v) continue;
      const cur=String(ex[k]||'').trim();
      if(IMP.mode==='fill'?!cur:v!==cur) patch[k]=v;
    }
    if(!Object.keys(patch).length){skip('khách đã có, không có gì mới');continue}
    st.update++; items.push({action:'update',name:patch.name||ex.name,phone:phone,address:patch.address||ex.address||'',ex,patch});
  }
  return {items,stats:st};
}
function renderImp(){
  const box=$('#impBody'); if(!box||!IMP||!IMP.rows.length) return;
  const sample=IMP.rows[IMP.header?1:0]||[];
  const opt=(k,i)=>`<option value="${i}" ${IMP.map[k]===i?'selected':''}>${i<0?'— Không nhập —':esc(colLabel(i))+(sample[i]?' · '+esc(String(sample[i]).slice(0,16)):'')}</option>`;
  const sel=(k,label)=>`<div class="field"><label for="impm_${k}">${label}</label><select id="impm_${k}" data-imp-map="${k}">${[-1,...Array(IMP.ncol).keys()].map(i=>opt(k,i)).join('')}</select></div>`;
  const plan=impBuild(), st=plan.stats, ops=st.add+st.update;
  const preview=plan.items.filter(x=>x.action!=='skip').slice(0,6);
  const reasons=Object.entries(st.reasons).map(([r,n])=>`${n} dòng ${r}`);
  const modes=[['fill','Bổ sung ô trống'],['skip','Bỏ qua'],['over','Ghi đè']];
  box.innerHTML=`<section class="fs"><h4>2. Ghép cột</h4>
    <span class="hint">${esc(IMP.name)} · ${IMP.rows.length-(IMP.header?1:0)} dòng dữ liệu${IMP.note?' · '+esc(IMP.note):''}</span>
    <label class="check"><input type="checkbox" id="imp_hdr" ${IMP.header?'checked':''}> Dòng đầu là tiêu đề cột</label>
    <div class="grid2">${sel('name','Tên khách')}${sel('phone','Số điện thoại')}</div>
    <div class="grid2">${sel('address','Địa chỉ')}${sel('note','Ghi chú')}</div>
  </section>
  <section class="fs"><h4>3. Kiểm tra trước khi nhập</h4>
    <div class="impstats"><span class="sp">Thêm mới ${st.add}</span><span class="sp upd">Cập nhật ${st.update}</span><span class="sp none">Bỏ qua ${st.skip}</span></div>
    ${reasons.length?`<span class="hint">${reasons.map(esc).join(' · ')}</span>`:''}
    ${st.badPhone?`<span class="hint">⚠ ${st.badPhone} số điện thoại có độ dài lạ, vẫn được nhập, nên kiểm tra lại.</span>`:''}
    ${st.existing?`<div class="field"><label>Khách đã có trong app (trùng số điện thoại)</label><div class="seg">${modes.map(([v,l])=>`<button type="button" data-act="imp-mode" data-v="${v}" aria-pressed="${IMP.mode===v}">${l}</button>`).join('')}</div><span class="hint">${IMP.mode==='fill'?'Chỉ điền vào ô đang trống của khách cũ, không đổi thông tin đã có.':IMP.mode==='skip'?'Không đụng tới khách đã có.':'Thông tin trong file thay cho thông tin cũ của khách đã có.'}</span></div>`:''}
    ${preview.length?`<div class="impprev">${preview.map(x=>`<div class="ip"><span class="sp ${x.action==='add'?'':'upd'}">${x.action==='add'?'Mới':'Cập nhật'}</span><div><b>${esc(x.name)}</b><small>${esc([x.phone,x.address].filter(Boolean).join(' · '))}</small></div></div>`).join('')}${ops>preview.length?`<div class="hint" style="padding-top:6px">… và ${ops-preview.length} khách nữa</div>`:''}</div>`:'<span class="hint">Chưa có khách nào hợp lệ. Kiểm tra lại phần ghép cột.</span>'}
  </section>`;
  const run=$('#impRun'); if(run){run.disabled=!ops||!!IMP.running; run.textContent=ops?`Nhập ${ops} khách`:'Nhập'}
  const hint=$('#impHint'); if(hint) hint.textContent=IMP.name?IMP.name:'Chưa chọn file';
}
function importForm(){
  IMP={rows:[],ncol:0,header:true,map:{name:-1,phone:-1,address:-1,note:-1},mode:'fill',name:'',note:'',running:false};
  openSheet(`${head('Nhập khách từ Excel/CSV','Chỉ tài khoản được cấp quyền mới dùng được')}
  <div class="sh-body">
    <section class="fs"><h4>1. Chọn file</h4>
      <label class="btn primary block filebtn" for="imp_file">Chọn file Excel / CSV<input type="file" id="imp_file" class="vh" accept=".xlsx,.xls,.csv,.tsv,.txt,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label>
      <span class="hint">File .xlsx, .xls hoặc .csv. Dòng đầu nên là tiêu đề cột như: Tên, Số điện thoại, Địa chỉ, Ghi chú. App tự nhận cột, có thể chỉnh lại ở bước sau.</span>
      <div><button type="button" class="linkbtn" data-act="imp-template">Tải file mẫu (.csv)</button></div>
      <details class="paste"><summary>Hoặc dán dữ liệu copy từ Excel</summary>
        <textarea id="imp_paste" placeholder="Bôi đen các ô trong Excel, copy rồi dán vào đây (dòng đầu là tiêu đề cột)"></textarea>
        <button type="button" class="btn" data-act="imp-paste">Đọc dữ liệu đã dán</button>
      </details>
    </section>
    <div id="impBody"></div>
  </div>
  <div class="sh-foot"><span class="hint" id="impHint">Chưa chọn file</span><button class="btn primary" data-act="imp-run" id="impRun" disabled>Nhập</button></div>`);
}
async function impRun(btn){
  if(!can('cust.import')||!IMP||IMP.running) return;
  const plan=impBuild(), ops=plan.items.filter(x=>x.action!=='skip');
  if(!ops.length){toast('Không có khách nào để nhập.');return}
  IMP.running=true; btn.disabled=true;
  let done=0,added=0,upd=0;
  try{
    for(let i=0;i<ops.length;i+=15){
      const chunk=ops.slice(i,i+15);
      await Promise.all(chunk.map(x=>x.action==='add'
        ?put('customers',newId('c'),{name:x.name,phone:x.phone,address:x.address,note:x.note,createdAt:Date.now(),imported:true})
        :patch('customers',x.ex.id,x.patch)));
      chunk.forEach(x=>{x.action==='add'?added++:upd++}); done+=chunk.length;
      btn.textContent=`Đang nhập ${done}/${ops.length}…`;
    }
    IMP.running=false;
    openSheet(`${head('Đã nhập xong')}
    <div class="sh-body"><section class="fs"><div class="impdone"><b>${added}</b> khách mới${upd?` · <b>${upd}</b> khách được cập nhật`:''}${plan.stats.skip?` · ${plan.stats.skip} dòng bỏ qua`:''}</div></section></div>
    <div class="sh-foot"><button class="btn" data-act="imp-view">Xem danh sách khách</button><button class="btn primary" data-act="close">Xong</button></div>`);
    toast(`Đã nhập ${added} khách mới`+(upd?`, cập nhật ${upd}`:''));
  }catch(e){
    IMP.running=false; fail(e);
    if(done) toast(`Đã nhập được ${done}/${ops.length} khách trước khi bị lỗi.`);
    renderImp();
  }
}
async function impTemplate(){
  const csv='﻿Tên,Số điện thoại,Địa chỉ,Ghi chú\nNguyễn Văn A,0903456789,12 Nguyễn Văn Cừ,Hay lấy ít cơm\nTrần Thị B,0912345678,KTX khu B ĐH Cần Thơ,\n';
  try{ saveFile('mau-nhap-khach.csv',csv,'text/csv;charset=utf-8'); toast('Đã tải file mẫu') }
  catch(e){ toast('Chưa tải được file mẫu.'); console.error(e) }
}

/* staff */
const activeAdmins=()=>S.staff.filter(s=>roleOf(s)==='admin'&&s.active!==false);
let PF=null; // trạng thái bảng quyền đang sửa trong form nhân viên
function permBodyHTML(){
  if(PF.role==='admin') return '<p class="hint">Quản lý có toàn quyền nên không cần chọn quyền.</p>';
  const note=PF.role==='shipper'?'<p class="hint">Shipper chỉ xem được đơn giao gán cho mình (3 ngày trước → ngày mai) và tên, SĐT, địa chỉ khách ghi trên các đơn đó. Không thể cấp quyền xem tất cả đơn, báo cáo, giá vốn, gán shipper, danh sách khách hay tạo đơn mới cho vai trò này.</p>':'';
  return note+PERM_GROUPS.map(([g,items0])=>[g,items0.filter(([k])=>!permLocked(PF.role,k))]).filter(([g,items])=>items.length).map(([g,items])=>`<div class="permgrp"><h5>${tw(g)}</h5>${items.map(([k,l,h])=>`<label class="permrow"><input type="checkbox" data-perm="${k}" ${PF.perms[k]?'checked':''}><span><b>${tw(l)}</b>${h?`<small>${tw(h)}</small>`:''}</span></label>`).join('')}</div>`).join('');
}
function renderPerm(){const bd=$('#permBody'); if(bd) bd.innerHTML=permBodyHTML(); const r=$('#permReset'); if(r) r.hidden=PF.role==='admin'}
function permToggle(t){
  const k=t.dataset.perm; if(!PF||PF.role==='admin'||!ALL_PERMS.includes(k)||permLocked(PF.role,k)) return;
  PF.perms[k]=t.checked;
  if(t.checked){ let p=PERM_DEP[k]; while(p){PF.perms[p]=true;p=PERM_DEP[p]} }
  else { let ch=true; while(ch){ch=false; ALL_PERMS.forEach(c=>{if(PERM_DEP[c]&&!PF.perms[PERM_DEP[c]]&&PF.perms[c]){PF.perms[c]=false;ch=true}})} }
  document.querySelectorAll('#permBody [data-perm]').forEach(i=>{i.checked=!!PF.perms[i.dataset.perm]});
}
function staffForm(s){
  const self=s&&s.id===S.me.id;
  const role0=s?roleOf(s):'cashier';
  PF={role:role0,perms:s&&role0!=='admin'?permsOf(s):roleDefault(role0)};   // permsOf đã tắt cứng các quyền xem rộng của shipper
  openSheet(`${head(s?'Sửa nhân viên':'Thêm nhân viên')}
  <div class="sh-body"><section class="fs">
    <div class="field"><label for="st_name">Họ tên</label><input type="text" id="st_name" value="${esc(s?s.name:'')}"></div>
    <div class="field"><label for="st_user">Tên đăng nhập</label><input type="text" id="st_user" autocapitalize="off" autocomplete="off" value="${esc(s?s.username:'')}"></div>
    <div class="field"><label for="st_role">Vai trò</label><select id="st_role" ${self?'disabled':''}>${['admin','cashier','shipper'].map(r=>`<option value="${r}" ${role0===r?'selected':''}>${ROLE[r]}</option>`).join('')}</select>${self?'<span class="hint">Không tự đổi vai trò của mình được.</span>':'<span class="hint" id="st_rolehint"></span>'}</div>
    <div class="field"><label for="st_pw">${s?'Đặt lại mật khẩu (để trống nếu không đổi)':'Mật khẩu'}</label><input type="password" id="st_pw" autocomplete="new-password"><span class="hint">Ít nhất 6 ký tự, không dùng dãy dễ đoán như 123456.</span></div>
    ${s&&!self?`<label class="check"><input type="checkbox" id="st_active" ${s.active!==false?'checked':''}> Cho phép đăng nhập</label>`:''}
  </section>
  <section class="fs"><h4>Quyền chi tiết</h4>
    <span class="hint">Tick những việc người này được làm. Ban đầu theo vai trò; tick khác đi thì chỉ áp dụng riêng cho tài khoản này.</span>
    <div id="permBody"></div>
    <div><button type="button" class="linkbtn" id="permReset" data-act="perm-reset">Về mặc định của vai trò</button></div>
  </section>
  ${s&&!self?`<div><button class="btn danger" data-act="del-staff" data-id="${s.id}">Xoá tài khoản</button></div>`:''}
  </div>
  <div class="sh-foot"><span></span><button class="btn primary" data-act="save-staff" data-id="${s?s.id:''}">Lưu</button></div>`);
  renderPerm();
  const rh=()=>{const h=$('#st_rolehint'); if(h) h.textContent=tw(ROLE_HINT[$('#st_role').value]||'')};
  rh(); $('#st_role').addEventListener('change',()=>{PF.role=$('#st_role').value; PF.perms=roleDefault(PF.role); renderPerm(); rh()});
  if(!s) setTimeout(()=>$('#st_name').focus(),50);
}
async function saveStaff(btn){
  if(!isAdmin()||!PF) return;
  const id=btn.dataset.id, old=id&&S.staff.find(x=>x.id===id);
  const name=$('#st_name').value.trim(), username=$('#st_user').value.trim().toLowerCase(), pw=$('#st_pw').value;
  const role=old&&old.id===S.me.id?roleOf(old):$('#st_role').value;
  const active=$('#st_active')?$('#st_active').checked:true;
  if(!name){toast('Nhập họ tên.');return}
  if(!/^[a-z0-9._-]{3,}$/.test(username)){toast('Tên đăng nhập: ít nhất 3 ký tự, không dấu, không cách.');return}
  if(S.staff.some(x=>x.username===username&&x.id!==id)){toast('Tên đăng nhập này đã có người dùng.');return}
  if(!old&&!pw){toast('Nhập mật khẩu.');return}
  if(pw){const pe=pwProblem(pw); if(pe){toast(pe);return}}
  if(old&&roleOf(old)==='admin'&&(role!=='admin'||!active)&&activeAdmins().length<=1){toast('Phải còn ít nhất 1 quản lý đang hoạt động.');return}
  // chỉ gửi những quyền khác mặc định của vai trò
  if(PF.role!==role){PF.role=role;PF.perms=roleDefault(role)}
  let perms={};
  if(role!=='admin'){const d=roleDefault(role); ALL_PERMS.forEach(k=>{if(permLocked(role,k)) return; const v=!!PF.perms[k]; if(v!==d[k]) perms[k]=v})}
  btn.disabled=true;
  try{
    if(old) await staffCall(Object.assign({action:'update',id,name,username,role,active,perms},pw?{password:pw}:{}));
    else await staffCall({action:'create',name,username,role,perms,password:pw});
    closeSheet(); toast(old?'Đã lưu':'Đã thêm '+name);
  }catch(e){fail(e);btn.disabled=false}
}
function pwForm(){
  openSheet(`${head('Đổi mật khẩu',esc(S.me.name)+' · '+esc(S.me.username))}
  <div class="sh-body"><section class="fs">
    <div class="field"><label for="p_cur">Mật khẩu hiện tại</label><input type="password" id="p_cur" autocomplete="current-password"></div>
    <div class="field"><label for="p_new">Mật khẩu mới</label><input type="password" id="p_new" autocomplete="new-password"></div>
    <div class="field"><label for="p_new2">Nhập lại mật khẩu mới</label><input type="password" id="p_new2" autocomplete="new-password"></div>
  </section></div>
  <div class="sh-foot"><span></span><button class="btn primary" data-act="save-pw">Đổi mật khẩu</button></div>`);
  setTimeout(()=>$('#p_cur').focus(),50);
}
async function savePw(btn){
  const cur=$('#p_cur').value,n1=$('#p_new').value,n2=$('#p_new2').value;
  if(!cur){toast('Nhập mật khẩu hiện tại.');return}
  {const pe=pwProblem(n1); if(pe){toast(pe);return}}
  if(n1!==n2){toast('Hai lần nhập mật khẩu mới chưa khớp.');return}
  btn.disabled=true;
  try{
    const re=await sb.auth.signInWithPassword({email:emailOf(S.me.username,shopSlug()),password:cur});
    if(re.error){toast('Mật khẩu hiện tại chưa đúng.');btn.disabled=false;return}
    const {error}=await sb.auth.updateUser({password:n1}); if(error) throw error;
    closeSheet();toast('Đã đổi mật khẩu');
  }catch(e){fail(e);btn.disabled=false}
}

async function clearSample(btn){
  btn.disabled=true;
  try{
    const {data:so,error:soe}=await sb.from('orders').select('id').eq('sample',true); if(soe) throw soe;
    const orders=so||[];
    for(const o of orders) await del('orders',o.id);
    for(const m of S.menu.filter(x=>x.sample)) await del('menu',m.id);
    for(const g of S.groups.filter(x=>x.sample)) await del('groups',g.id);
    for(const c of S.customers.filter(x=>x.sample)) await del('customers',c.id);
    toast('Đã xoá dữ liệu mẫu');
  }catch(e){fail(e);btn.disabled=false}
}


/* ---------- in bill (máy Xprinter XP-360B, giấy 80mm, xé tay) ---------- */
const SHOP_DEF={name:'',address:'',phone:'',thanks:'Cảm ơn quý khách!\nChúc quý khách một ngày vui vẻ!',cutoff:'17:00'};
// Thông tin in bill của quán (Cài đặt → Thông tin cửa hàng); chưa nhập tên thì dùng tên quán
const shop=()=>{const o=Object.assign({},SHOP_DEF,(S.settings.find(x=>x.id==='shop')||{})); if(!o.name) o.name=(shopRow()||{}).name||''; return o};
const tomorrowStr=()=>{const t=new Date();t.setDate(t.getDate()+1);return dstr(t)};
function defaultOrderDate(){
  const today=dstr(new Date());
  if(S.view==='orders'&&S.date>today) return S.date;              // đang xem ngày tương lai → tạo cho ngày đó
  const n=new Date(), hm=pad(n.getHours())+':'+pad(n.getMinutes());
  return hm>=(shop().cutoff||'17:00')?tomorrowStr():today;          // tối (từ giờ chốt) → ngày mai
}
const fmtN=n=>Math.round(n||0).toLocaleString('vi-VN');
// Ô nhập tiền: tự thêm dấu chấm phần ngàn khi gõ (50000 → 50.000), giữ con trỏ đúng chỗ. Đọc lại bằng +digits(value).
function moneyInput(el){
  const pos=el.selectionStart==null?el.value.length:el.selectionStart, before=digits(el.value.slice(0,pos)).length;
  const raw=digits(el.value).replace(/^0+(?=\d)/,'').slice(0,13), f=raw?raw.replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'';
  if(el.value===f) return;
  el.value=f;
  let i=0,c=0; while(i<f.length&&c<before){ if(f[i]!=='.') c++; i++ }
  try{ if(document.activeElement===el) el.setSelectionRange(i,i) }catch(_){}
}
const BILL_CSS=`@page{margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#fff;color:#000}
body{font-family:Tahoma,'Segoe UI','Noto Sans','DejaVu Sans',Arial,sans-serif;font-size:13.5px;line-height:1.3;text-rendering:optimizeLegibility}
.bill{width:72mm;margin:0 auto;padding:2mm 1mm 0;break-after:page;page-break-after:always}
.bill:last-child{break-after:auto;page-break-after:auto}
.c{text-align:center}
.nm{font-size:20px;font-weight:900;line-height:1.1}
.ad{font-size:13px}
.rule{border:0;border-top:1px dashed #000;margin:1.5mm 0}
.ttl{font-size:14.5px;font-weight:900;margin-top:1mm}
.meta{display:flex;justify-content:space-between;font-size:12.5px}
.ln{margin-top:.6mm;overflow-wrap:anywhere}
.ln b{font-weight:700}
.ln.cust{font-size:14px}
.ln.note{font-style:italic}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th{font-size:12.5px;font-weight:900;padding:0 0 .8mm;border-bottom:1px solid #000}
th.n{text-align:left}th.q{width:7mm;text-align:center}th.p{width:16mm;text-align:right}th.t{width:18mm;text-align:right}
td{vertical-align:top;padding:1mm 0 0}
td.n{overflow-wrap:anywhere;padding-right:1mm}
td.n i{display:block;font-size:12.5px}
td.q{text-align:center;font-weight:700}
td.p{text-align:right;font-size:13px}
td.t{text-align:right;font-weight:700}
.tot{display:flex;justify-content:flex-end;gap:2mm;align-items:baseline;font-weight:900;font-size:16px}
.thx{margin-top:1.5mm;text-align:center;font-style:italic;font-size:13px;white-space:pre-line}
.end{text-align:center;font-size:12px}
.tear{height:8mm}
.bar{font-family:Arial,sans-serif;font-size:14px;text-align:center;padding:12px;background:#f1f5ec;border-bottom:1px solid #cfd8c4}
.bar button{font-size:18px;font-weight:700;padding:12px 28px;border:0;border-radius:10px;background:#2D6A2E;color:#fff;cursor:pointer}
.bar p{margin:8px 0 0;color:#333}
@media print{.bar{display:none}}`;
function billBody(o,n){
  const sh=shop(); const lay=o.mode==='lay'; const d=o.date||'';
  const cAt=o.createdAt?new Date(o.createdAt):null; const note=o.note||'';
  return `<div class="bill">
  <div class="c nm">${esc(sh.name)}</div>
  ${sh.address?`<div class="c ad">${esc(sh.address)}</div>`:''}
  ${sh.phone?`<div class="c ad">ĐT: ${esc(sh.phone)}</div>`:''}
  <div class="c ttl">HÓA ĐƠN THANH TOÁN</div>
  <div class="meta"><span>Số: ${n?'#'+n:'—'}</span><span>${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(0,4)}</span></div>
  <hr class="rule">
  <div class="ln cust">KH: <b>${esc(o.name||'Khách lẻ')}</b>${o.phone?` - <b>${esc(o.phone)}</b>`:''}</div>
  ${o.address&&!lay?`<div class="ln">ĐC: ${esc(o.address)}</div>`:''}
  ${note?`<div class="ln note">Ghi chú: <b>${esc(note)}</b></div>`:''}
  <hr class="rule">
  <table><thead><tr><th class="n">Thức ăn</th><th class="q">SL</th><th class="p">Đ.GIÁ</th><th class="t">T.TIỀN</th></tr></thead><tbody>
  ${(o.items||[]).map(it=>`<tr><td class="n">${esc(it.name)}${it.note?`<i>- ${esc(it.note)}</i>`:''}</td><td class="q">${it.qty}</td><td class="p">${fmtN(it.price)}</td><td class="t">${fmtN(it.price*it.qty)}</td></tr>`).join('')}
  </tbody></table>
  <hr class="rule">
  <div class="tot"><span>Tổng cộng:</span><span>${fmtN(o.total)}</span></div>
  ${sh.thanks?`<div class="thx">${esc(sh.thanks)}</div>`:''}
  <div class="end">-oOo-</div>
  <div class="tear"></div>
</div>`;
}
function billDoc(list,autoPrint){
  const {no}=sortedOrders();
  const bar=autoPrint?'<div class="bar"><button id="pb" type="button" onclick="window.print()">&#128424; In bill ('+list.length+')</button><p>Hộp thoại in không tự hiện? Bấm nút trên, hoặc Ctrl+P. Chọn máy in <b>XP-360B</b>, Margins: <b>None</b>, Scale: <b>100%</b>. Mở bằng Chrome/Edge trên máy tính nối máy in.</p></div>':'';
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bill ${esc(shop().name)}</title><style>${BILL_CSS}</style></head><body>${bar}<main>${list.map(o=>billBody(o,no[o.id])).join('')}</main>${autoPrint?'<script>window.addEventListener("load",function(){setTimeout(function(){try{window.print()}catch(e){}},400)})<\/script>':''}</body></html>`;
}
let printList=[];
function printSheet(list){
  const k=o=>o.time||'99:99';
  printList=[...list].sort((a,b)=>k(a)<k(b)?-1:k(a)>k(b)?1:(a.createdAt||0)-(b.createdAt||0));
  openSheet(`${head(printList.length>1?'In '+printList.length+' bill':'In bill',printList.length>1?'Mỗi đơn một tờ, xếp theo giờ giao':esc(printList[0].name||'Khách lẻ'))}
  <div class="sh-body">
    <div class="billprev"><iframe id="billFrame" title="Xem trước bill" sandbox="allow-same-origin allow-modals"></iframe></div>
    <p class="hint">Bấm “In ngay” rồi chọn máy XP-360B (Margins: None, Scale: 100%). Trên điện thoại, bấm “Tải file” rồi mở file để in. In nhiều bill thì máy in nối tiếp, cuối mỗi bill chừa một khoảng ngắn để xé.</p>
  </div>
  <div class="sh-foot"><span class="hint">Giấy 80mm</span><div class="footbtns"><button class="btn" data-act="save-bill">Tải file</button><button class="btn primary" data-act="print-now">In ngay</button></div></div>`);
  const fr=$('#billFrame'); fr.srcdoc=billDoc(printList,false);
  fr.addEventListener('load',()=>{try{fr.style.height=(fr.contentDocument.documentElement.scrollHeight+4)+'px'}catch(_){fr.style.height='640px'}});
}
async function saveBill(btn){
  btn.disabled=true;
  const o=printList[0]; const dd=(o.date||'').slice(8,10)+(o.date||'').slice(5,7);
  const name=printList.length>1?`bill-${dd}-${printList.length}-don.html`:`bill-${dd}-${(o.time||'').replace(':','h')||'don'}-${norm(o.name||'khach').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24)}.html`;
  try{saveFile(name,billDoc(printList,true),'text/html;charset=utf-8');btn.disabled=false;closeSheet();toast('Đã tải bill. Mở file để in.')}
  catch(e){btn.disabled=false; toast('Chưa tải được file bill.');console.error(e)}
}
function shopForm(){
  const sh=shop();
  openSheet(`${head('Thông tin cửa hàng','Ngày mặc định khi tạo đơn và thông tin in bill')}
  <div class="sh-body"><section class="fs">
    <div class="field"><label for="sh_cut">Đơn tạo từ mấy giờ thì mặc định giao ngày mai</label><input type="time" id="sh_cut" value="${esc(sh.cutoff)}"><span class="hint">Trước giờ này đơn mới chọn sẵn hôm nay, từ giờ này trở đi chọn sẵn ngày mai.</span></div>
  </section><section class="fs"><h4>In trên bill</h4>
    <div class="field"><label for="sh_name">Tên cửa hàng</label><input type="text" id="sh_name" value="${esc(sh.name)}"></div>
    <div class="field"><label for="sh_addr">Địa chỉ</label><input type="text" id="sh_addr" value="${esc(sh.address)}"></div>
    <div class="field"><label for="sh_phone">Điện thoại</label><input type="tel" id="sh_phone" value="${esc(sh.phone)}"></div>
    <div class="field"><label for="sh_thx">Lời cảm ơn cuối bill</label><textarea id="sh_thx">${esc(sh.thanks)}</textarea></div>
  </section></div>
  <div class="sh-foot"><span></span><button class="btn primary" data-act="save-shop">Lưu</button></div>`);
}
async function saveShop(btn){
  btn.disabled=true;
  try{await put('settings','shop',{name:$('#sh_name').value.trim()||SHOP_DEF.name,address:$('#sh_addr').value.trim(),phone:$('#sh_phone').value.trim(),thanks:$('#sh_thx').value.trim(),cutoff:$('#sh_cut').value||SHOP_DEF.cutoff});closeSheet();toast('Đã lưu thông tin in bill')}
  catch(e){fail(e);btn.disabled=false}
}


/* ---------- logo và màu giao diện của quán (bảng settings, key 'brand') ---------- */
// [mã, tên, màu hiện trên ô chọn]. Bảng màu đầy đủ (sáng + tối) nằm trong app.css theo thuộc tính data-accent; "green" là mặc định.
const ACCENTS=[['green','Xanh lá','#2D6A2E'],['ocean','Xanh dương','#185395'],['teal','Xanh ngọc','#107066'],['orange','Cam đất','#AA470E'],['red','Đỏ','#AB2521'],['pink','Hồng','#A92362'],['purple','Tím','#6733A3'],['brown','Nâu','#714A28'],['slate','Xám than','#404A59']];
const accentName=a=>(ACCENTS.find(x=>x[0]===a)||ACCENTS[0])[1];
const LOGO_RE=/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/, LOGO_MAXLEN=60000;
const BKEY='lyly_brand_v1'; let BR=null, BR_PREVIEW=null, brandSaved='';
function brandCacheGet(){try{return JSON.parse(localStorage.getItem(BKEY)||'{}')||{}}catch(_){return {}}}
// Máy nhớ logo + màu của quán để màn hình đăng nhập (và lúc mới mở app) đã đúng thương hiệu quán
function brandCacheSet(code,b){
  const key=code+'|'+b.accent+'|'+b.logo.length+'|'+b.logo.slice(-24); if(!code||key===brandSaved) return; brandSaved=key;
  try{const m=brandCacheGet(); m[code]={accent:b.accent,logo:b.logo}; localStorage.setItem(BKEY,JSON.stringify(m))}catch(_){}
}
function brandNow(){
  let b=BR_PREVIEW;
  if(!b){
    if(S.me&&S.loaded.settings){const r=S.settings.find(x=>x.id==='brand'); b=r?{accent:r.accent,logo:r.logo}:{}}
    else b=brandCacheGet()[S.me?shopSlug():shopCodeDefault()];
  }
  b=b||{};
  return {accent:ACCENTS.some(x=>x[0]===b.accent)?b.accent:'green', logo:typeof b.logo==='string'&&b.logo.length<=LOGO_MAXLEN*2&&LOGO_RE.test(b.logo)?b.logo:''};
}
function applyBrand(){
  const b=brandNow(), r=document.documentElement;
  if(b.accent==='green'){ if(r.hasAttribute('data-accent')) r.removeAttribute('data-accent') }
  else if(r.getAttribute('data-accent')!==b.accent) r.setAttribute('data-accent',b.accent);
  const m=document.querySelector('meta[name="theme-color"]'), c=(ACCENTS.find(x=>x[0]===b.accent)||ACCENTS[0])[2];
  if(m&&m.getAttribute('content')!==c) m.setAttribute('content',c);
  if(S.me&&S.loaded.settings&&!BR_PREVIEW) brandCacheSet(shopSlug(),b);
}
// Thu nhỏ ảnh logo trên máy trước khi lưu (vài chục KB là đủ, đỡ tốn dung lượng và tốc độ tải)
function logoPrep(file){
  return new Promise((res,rej)=>{
    if(!/^image\//.test(file.type||'')) return rej(new Error('Chọn file ảnh (png, jpg, webp).'));
    if(file.size>8*1024*1024) return rej(new Error('Ảnh quá nặng (tối đa 8 MB).'));
    const rd=new FileReader(); rd.onerror=()=>rej(new Error('Không đọc được ảnh.'));
    rd.onload=()=>{
      const im=new Image(), tm=setTimeout(()=>im.onerror&&im.onerror(),10000);
      im.onerror=()=>{clearTimeout(tm);rej(new Error('Không mở được ảnh này, thử ảnh png/jpg khác.'))};
      im.onload=()=>{clearTimeout(tm);
        try{
          const c=document.createElement('canvas'); if(!c.getContext||!c.getContext('2d')) return rej(new Error('Máy này không thu nhỏ được ảnh.'));
          const enc=(t,q)=>{try{return c.toDataURL(t,q)}catch(_){return ''}};
          for(const box of [192,144,112]){
            const k=Math.min(1,box/Math.max(im.width,im.height)); c.width=Math.max(1,Math.round(im.width*k)); c.height=Math.max(1,Math.round(im.height*k));
            const x=c.getContext('2d'); x.clearRect(0,0,c.width,c.height); x.drawImage(im,0,0,c.width,c.height);
            let out=enc('image/webp',.85);
            if(!LOGO_RE.test(out)||out.length>LOGO_MAXLEN){ x.globalCompositeOperation='destination-over'; x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); out=enc('image/jpeg',.82) }   // ảnh nặng: chuyển JPEG nền trắng
            if(LOGO_RE.test(out)&&out.length<=LOGO_MAXLEN) return res(out);
          }
          rej(new Error('Ảnh quá phức tạp, thử logo đơn giản hơn.'));
        }catch(e){ rej(new Error('Không xử lý được ảnh này.')) }
      };
      im.src=String(rd.result);
    };
    rd.readAsDataURL(file);
  });
}
function brandSheet(){
  const cur=BR;
  return `${head('Logo và màu giao diện','Áp dụng cho mọi nhân viên của quán')}
  <div class="sh-body"><section class="fs"><h4>Logo</h4>
    <div class="brandprev">${markHtml(cur.logo)}<div class="btns">
      <label class="btn filebtn" for="br_file">${cur.logo?'Đổi logo':'Chọn ảnh logo'}<input type="file" id="br_file" class="vh" accept="image/*"></label>
      ${cur.logo?'<button class="btn" data-act="brand-rmlogo" type="button">Xoá logo</button>':''}
    </div></div>
    <span class="hint">Ảnh vuông hoặc nền trong suốt đẹp nhất. App tự thu nhỏ. Chưa có logo thì hiện chữ cái đầu tên quán.</span><div id="br_err" class="err" role="alert"></div>
  </section><section class="fs"><h4>Màu giao diện</h4>
    <div class="swatches">${ACCENTS.map(a=>`<button type="button" class="swatch" data-act="brand-accent" data-v="${a[0]}" aria-pressed="${cur.accent===a[0]}"><i style="background:${a[2]}"></i>${a[1]}</button>`).join('')}</div>
    <span class="hint">Chọn là thấy ngay. Sáng/Tối chọn riêng ở đầu trang Cài đặt, mỗi người một kiểu.</span>
  </section></div>
  <div class="sh-foot"><span></span><button class="btn primary" data-act="brand-save">Lưu</button></div>`;
}
function brandForm(){ const b=brandNow(); BR={accent:b.accent,logo:b.logo}; BR_PREVIEW=null; openSheet(brandSheet()) }
function brandPreview(){ BR_PREVIEW={accent:BR.accent,logo:BR.logo}; applyBrand() }
function brandAccent(v){
  if(!BR||!ACCENTS.some(x=>x[0]===v)) return;
  BR.accent=v; brandPreview();
  document.querySelectorAll('#sheetBox .swatch').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===v)));
}
function brandRmLogo(){ if(!BR) return; BR.logo=''; brandPreview(); $('#sheetBox').innerHTML=brandSheet() }
async function brandFile(file){
  if(!BR) return; const er=$('#br_err'); if(er) er.textContent='';
  try{ const u=await logoPrep(file); if(!BR) return; BR.logo=u; brandPreview(); $('#sheetBox').innerHTML=brandSheet() }
  catch(e){ const e2=$('#br_err'); if(e2) e2.textContent=e.message||'Không dùng được ảnh này.' }
}
async function brandSave(btn){
  if(!BR) return; btn.disabled=true;
  try{
    const doc={accent:BR.accent}; if(BR.logo) doc.logo=BR.logo;
    await put('settings','brand',doc);
    const i=S.settings.findIndex(x=>x.id==='brand'), row=Object.assign({id:'brand'},doc);
    if(i>=0) S.settings[i]=row; else S.settings.push(row);     // hiện ngay, không chờ máy chủ báo về
    BR_PREVIEW=null; closeSheet(); render(); toast('Đã lưu logo và màu giao diện');
  }catch(e){fail(e);btn.disabled=false}
}

/* ---------- auth submit ---------- */
async function enter(code,u,pw,err,b){
  const {data,error}=await sb.auth.signInWithPassword({email:emailOf(u,code),password:pw});
  if(error||!data||!data.user){
    const msg=String((error&&error.message)||'');
    if(error&&(error.code==='user_banned'||/banned/i.test(msg))) err.textContent='Tài khoản này đã bị khoá.';
    else if(error&&(error.status===0||/fetch|network/i.test(msg))) err.textContent='Chưa kết nối được máy chủ, thử lại nhé.';
    else {const r=noteFail(); err.textContent=lockLeft()>0?'Nhập sai nhiều lần. Đã tạm khoá đăng nhập trên máy này.':'Sai mã quán, tên đăng nhập hoặc mật khẩu. Còn '+r+' lần thử.'}
    if(b) b.disabled=false; return false;
  }
  noteOk(); shopCodeSet(code); S.signup=false; S.authId=data.user.id; S.view='orders'; S.sub=null; startData(); render();
  return true;
}
document.addEventListener('submit',async e=>{
  e.preventDefault(); const err=$('#authErr'); const b=e.target.querySelector('button[type=submit]');
  if(!sb||!err) return;
  if(e.target.id==='signupForm'){
    S.loginMsg=''; err.textContent='';
    const name=$('#s_shop').value.trim(), u=$('#s_user').value.trim().toLowerCase(), pw=$('#s_pw').value, phone=$('#s_phone').value.trim();
    if(!name){err.textContent='Nhập tên quán.';return}
    if(!/^[a-z0-9._-]{3,}$/.test(u)){err.textContent='Tên đăng nhập: ít nhất 3 ký tự, không dấu, không cách.';return}
    {const pe=pwProblem(pw); if(pe){err.textContent=pe;return}}
    b.disabled=true;
    try{
      const r=await fnCall('shop-signup',{shopName:name,username:u,password:pw,phone,site:$('#s_site').value});
      toast('Đã tạo quán. Mã quán của bạn: '+r.slug);
      await enter(r.slug,u,pw,err,b);
    }catch(x){ err.textContent=(x&&x.code==='app')?x.message:'Chưa kết nối được máy chủ, thử lại nhé.'; console.error(x); b.disabled=false }
    return;
  }
  if(e.target.id!=='loginForm') return;
  S.loginMsg=''; err.textContent='';
  const left=lockLeft(); if(left>0){err.textContent='Nhập sai nhiều lần. Thử lại sau '+(left>60?Math.ceil(left/60)+' phút':left+' giây')+'.';return}
  const code=($('#l_shop').value||'').trim().toLowerCase(), u=$('#l_user').value.trim().toLowerCase(), pw=$('#l_pw').value;
  if(!code||!u||!pw){err.textContent='Nhập mã quán, tên đăng nhập và mật khẩu.';return}
  if(!/^[a-z0-9]{3,30}$/.test(code)){err.textContent='Mã quán gồm chữ thường và số, không dấu, không cách.';return}
  b.disabled=true;
  try{ await enter(code,u,pw,err,b) }catch(x){ err.textContent='Chưa kết nối được máy chủ, thử lại nhé.'; console.error(x); b.disabled=false }
});

/* ---------- events ---------- */
let tt;
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,2600)}
document.addEventListener('click',async e=>{
  if(e.target.id==='datePick'){try{e.target.showPicker()}catch(_){}return}
  const el=e.target.closest('[data-act]'); if(!el)return;
  const a=el.dataset.act, id=el.dataset.id;
  if(!S.me&&(a==='go-signup'||a==='go-login')){S.signup=(a==='go-signup');S.loginMsg='';render();return}   // màn hình đăng nhập ⇄ tạo quán mới
  if(!actAllowed(a,el)){ if(S.me&&a in ACT_PERM) toast(ACT_PERM[a]==='admin'?'Chỉ quản lý được làm việc này.':NOPERM); return }
  switch(a){
    case 'nav': S.view=el.dataset.v; S.sub=null; S._qfocus=false; render(); window.scrollTo(0,0); break;
    case 'logout': leave(''); break;
    case 'filter': S.filter=el.dataset.v; render(); break;
    case 'layout': if(!canAssign())return; S.layout=el.dataset.v; layoutSet(S.layout); S.sel.clear(); render(); break;
    case 'ship-filter': S.shipFilter=el.dataset.v; S.sel.clear(); render(); break;
    case 'sel-unassigned': S.sel=new Set((S._ashown||[]).filter(i=>{const o=S.orders.find(x=>x.id===i);return o&&!o.shipperId})); render(); break;
    case 'sel-all': S.sel=new Set(S._ashown||[]); render(); break;
    case 'sel-clear': S.sel.clear(); render(); break;
    case 'bulk-assign': {
      const ids=(S._ashown||[]).filter(i=>S.sel.has(i)); const v=S.bulkShip;
      if(!ids.length||v==='')return;
      el.disabled=true;
      const done=await assignShipper(ids,v==='__none'?'':v);
      if(done) S.sel.clear(); else el.disabled=false;
      render(); break}
    case 'day': {S._dayTouched=true; const d=dparse(S.date); d.setDate(d.getDate()+(+el.dataset.d)); S.date=restricted()?shipClamp(dstr(d)):dstr(d); S.sel.clear(); subOrders(); render(); break}
    case 'today': S._dayTouched=true; S.date=dstr(new Date()); S.sel.clear(); subOrders(); render(); break;
    case 'new-order': orderForm(null); break;
    case 'cmt-open': if(aiOn()) cmtOpen(); break;
    case 'cmt-read': cmtRead(el); break;
    case 'cmt-save': cmtSave(el); break;
    case 'cmt-back': if(CM){CM.step='in';CM.err=CM.resume?'Còn '+CM.imgs.length+' ảnh chưa đọc. Bấm "Đọc comment" để đọc tiếp; đơn đọc được sẽ nối thêm vào các đơn nháp trước.':'';renderCmt()} break;
    case 'cmt-post': if(CM&&CM.step==='in'&&!CM.busy){cmSync(); const i=CM.post.indexOf(id); if(i>=0) CM.post.splice(i,1); else if(CM.post.length<20){CM.post.push(id); CM.pq=''} else toast('Chọn tối đa 20 '+W.m+'.'); renderCmt()} break;
    case 'cmt-pall': if(CM&&CM.step==='in'){cmSync(); CM.pall=!CM.pall; renderCmt()} break;
    case 'cmt-rmimg': if(CM){cmSync();CM.imgs.splice(+el.dataset.i,1);CM.err='';renderCmt()} break;
    case 'cmt-pick': cmPick(+el.dataset.i,el.dataset.id); break;
    case 'cmt-mode': {const d=CM&&CM.drafts[+el.dataset.i]; if(d&&!d.done){d.mode=el.dataset.v; renderCmt()} break}
    case 'cmt-qty': cmtQty(+el.dataset.i,+el.dataset.j,+el.dataset.d); break;
    case 'cmt-rmitem': {const d=CM&&CM.drafts[+el.dataset.i]; if(d&&!d.done){d.items.splice(+el.dataset.j,1); renderCmt()} break}
    case 'cmt-additem': {const d=CM&&CM.drafts[+el.dataset.i]; if(d&&!d.done){d.items.push({mid:'',qty:1,note:'',text:''}); renderCmt()} break}
    case 'print-one': {const o=S.orders.find(x=>x.id===id)||S.rep.orders.find(x=>x.id===id); if(o){closeSheet();printSheet([o])} break}
    case 'print-all': {const ids=S._shown||[]; const list=ids.map(i=>S.orders.find(x=>x.id===i)).filter(Boolean); if(list.length) printSheet(list); break}
    case 'save-bill': saveBill(el); break;
    case 'print-now': {const fr=$('#billFrame'); try{fr.contentWindow.focus();fr.contentWindow.print()}catch(err){toast('Trình duyệt chưa cho in, thử “Tải file”.')} break}
    case 'shop-form': shopForm(); break;
    case 'save-shop': saveShop(el); break;
    case 'brand-form': brandForm(); break;
    case 'brand-save': brandSave(el); break;
    case 'brand-accent': brandAccent(el.dataset.v); break;
    case 'brand-rmlogo': brandRmLogo(); break;
    case 'edit-order': {const o=S.orders.find(x=>x.id===id); if(o) orderForm(o); break}
    case 'open-order': {const o=S.rep.orders.find(x=>x.id===id); if(o) orderForm(o); break}
    case 'copy': {const v=el.dataset.v; try{await navigator.clipboard.writeText(v);toast('Đã copy '+v)}catch(_){toast('Không copy được, bấm giữ số để chép.')} break}
    case 'pay': {const v=el.dataset.v; const o0=S.orders.find(x=>x.id===id); if(o0&&offDay(o0)){toast('Đơn ngày khác chỉ để xem.');return} el.disabled=true; try{await patch('orders',id,{payment:v,updatedAt:Date.now(),updatedBy:S.me.name}); toast(v==='unpaid'?'Đã chuyển về chưa thu':'Đã ghi nhận '+(v==='cash'?'tiền mặt':'chuyển khoản'))}catch(err){fail(err);el.disabled=false} break}
    case 'deliver': {const o=S.orders.find(x=>x.id===id); if(!o)return; if(offDay(o)){toast('Đơn ngày khác chỉ để xem.');return} el.disabled=true; try{await patch('orders',id,{delivered:!o.delivered,updatedAt:Date.now(),updatedBy:S.me.name})}catch(err){fail(err);el.disabled=false} break}
    case 'close': closeSheet(); break;
    case 'qty': {const mid=el.dataset.mid,d=+el.dataset.d; const r=F.rows.find(x=>x.menuId===mid); if(!r)return;
      const it=F.itemMap[mid]||(F.itemMap[mid]={menuId:mid,name:r.name,price:r.price,qty:0,note:''});
      it.qty=Math.max(0,it.qty+d);
      const row=document.querySelector(`.irow[data-mid="${mid}"]`); row.classList.toggle('on',it.qty>0); row.querySelector('output').textContent=it.qty;
      row.querySelector('.inote').hidden=!it.qty; updTotal(); updTabs(); break}
    case 'gtab': F.tab=el.dataset.v; renderItems(); break;
    case 'seg': F[el.dataset.k]=el.dataset.v; el.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===el)); if(el.dataset.k==='mode'){const w=$('#shipWrap'); if(w) w.hidden=F.mode==='lay'} break;
    case 'time': $('#f_time').value=el.dataset.v; break;
    case 'pick': {const c=S.customers.find(x=>x.id===id); if(!c)return; F.customerId=c.id; $('#f_name').value=F.name=c.name||''; $('#f_phone').value=F.phone=c.phone||''; $('#f_addr').value=F.address=c.address||''; updPicked(); updSugg(); break}
    case 'clearcust': F.customerId=''; $('#f_name').value=$('#f_phone').value=$('#f_addr').value=''; F.name=F.phone=F.address=''; {const sc=$('#f_savecust'); if(sc) sc.checked=true} updPicked(); updSugg(); $('#f_name').focus(); break;
    case 'unpick': F.customerId=''; $('#f_name').value=$('#f_phone').value=$('#f_addr').value=''; F.name=F.phone=F.address=''; updPicked(); updSugg(); $('#f_name').focus(); break;
    case 'save-order': saveOrder(el); break;
    case 'new-cust': custForm(null); break;
    case 'edit-cust': {const c=S.customers.find(x=>x.id===id); if(c) custForm(c); break}
    case 'save-cust': saveCust(el); break;
    case 'order-for': {const c=S.customers.find(x=>x.id===id); closeSheet(); orderForm(null,c); break}
    case 'preset': setPreset(el.dataset.v); break;
    case 'topby': S.rep.topBy=el.dataset.v; render(); break;
    case 'sub-menu': S.sub='menu'; render(); window.scrollTo(0,0); break;
    case 'sub-staff': S.sub='staff'; render(); window.scrollTo(0,0); break;
    case 'perm-reset': if(PF&&PF.role!=='admin'){PF.perms=roleDefault(PF.role); document.querySelectorAll('#permBody [data-perm]').forEach(i=>{i.checked=!!PF.perms[i.dataset.perm]})} break;
    case 'imp-open': importForm(); break;
    case 'imp-paste': impPaste(); break;
    case 'imp-mode': if(IMP){IMP.mode=el.dataset.v; renderImp()} break;
    case 'imp-run': impRun(el); break;
    case 'imp-template': impTemplate(); break;
    case 'imp-view': closeSheet(); S.view='customers'; S.sub=null; S.q=''; render(); window.scrollTo(0,0); break;
    case 'sub-back': S.sub=null; render(); break;
    case 'change-pw': pwForm(); break;
    case 'save-pw': savePw(el); break;
    case 'new-group': groupForm(null); break;
    case 'edit-group': {const g=S.groups.find(x=>x.id===id); if(g) groupForm(g); break}
    case 'save-group': saveGroup(el); break;
    case 'new-menu': menuForm(null,el.dataset.gid); break;
    case 'edit-menu': {const m=S.menu.find(x=>x.id===id); if(m) menuForm(m); break}
    case 'save-menu': saveMenu(el); break;
    case 'menu-toggle': menuToggle(id); break;
    case 'unit-pick': {const u=$('#m_unit'); if(u){u.value=el.dataset.v; u.focus()} break}
    case 'biz-form': bizForm(); break;
    case 'biz-pick': BZ=el.dataset.v; el.parentNode.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===el))); break;
    case 'biz-save': bizSave(el); break;
    case 'new-staff': staffForm(null); break;
    case 'edit-staff': {const s=S.staff.find(x=>x.id===id); if(s) staffForm(s); break}
    case 'save-staff': saveStaff(el); break;
    case 'del-staff': {const s=S.staff.find(x=>x.id===id); if(!s)return;
      if(roleOf(s)==='admin'&&s.active!==false&&activeAdmins().length<=1){toast('Phải còn ít nhất 1 quản lý.');return}
      if(!el.classList.contains('armed')){armDel(el);return}
      el.disabled=true; try{await staffCall({action:'delete',id});closeSheet();toast('Đã xoá tài khoản')}catch(err){fail(err);el.disabled=false} break}
    case 'del':
      if(!el.classList.contains('armed')){armDel(el);return}
      el.disabled=true; try{await del(el.dataset.col,id);closeSheet();toast('Đã xoá')}catch(err){fail(err);el.disabled=false} break;
    case 'clear-sample': clearSample(el); break;
    case 'theme': themeSet(el.dataset.v); render(); break;
  }
});
function armDel(el){el.classList.add('armed');el.dataset.label=el.textContent;el.textContent='Bấm lần nữa để xoá';setTimeout(()=>{if(el.isConnected&&!el.disabled){el.classList.remove('armed');el.textContent=el.dataset.label}},3500)}
document.addEventListener('paste',e=>{
  if(!CM||CM.step!=='in'||!can('order.create')) return;
  const fl=[...((e.clipboardData&&e.clipboardData.files)||[])].filter(f=>/^image\//.test(f.type));
  if(fl.length){e.preventDefault(); cmtFiles(fl)}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!$('#sheet').hidden) closeSheet();
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('.ticket,.debt,.orow,.a-info')){e.preventDefault();e.target.click()}
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.id==='q'){S.q=t.value;S._qfocus=true;render();return}
  if(CM&&t.id==='cm_text'){CM.text=t.value;return}
  if(CM&&t.id==='cm_pnote'){CM.pnote=t.value;return}
  if(CM&&t.id==='cm_pq'){CM.pq=t.value; const box=$('#cm_post'); if(box) box.innerHTML=cmPostChips(); return}
  if(CM&&t.dataset&&t.dataset.cm!==undefined){ if(can('order.create')) cmField(t,'input'); return}
  if(!F)return;
  if(t.classList.contains('inote')){const it=F.itemMap[t.dataset.mid]; if(it) it.note=t.value; return}
  if(t.id==='f_name'||t.id==='f_phone'){F.name=$('#f_name').value;F.phone=$('#f_phone').value;updSugg()}
  if(t.id==='f_name'||t.id==='f_phone'||t.id==='f_addr') updClear();
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='cm_file'){ if(!can('order.create')) return; const fl=t.files?[...t.files]:[]; try{t.value=''}catch(_){} if(fl.length) cmtFiles(fl); return}
  if(t.id==='br_file'){ if(!can('shop.edit')) return; const f=t.files&&t.files[0]; try{t.value=''}catch(_){} if(f) brandFile(f); return}
  if(t.id==='cm_date'){ if(CM&&t.value) CM.date=t.value; return}
  if(CM&&t.dataset&&t.dataset.cm!==undefined){ if(can('order.create')) cmField(t,'change'); return}
  if(t.dataset&&t.dataset.perm!==undefined){ if(!isAdmin())return; permToggle(t); return}
  if(t.id==='imp_file'){ if(!can('cust.import')) return; const f=t.files&&t.files[0]; try{t.value=''}catch(_){} if(f) impFile(f); return}
  if(t.id==='imp_hdr'){ if(!can('cust.import')||!IMP)return; IMP.header=t.checked; if(t.checked){const d=detectHeader(IMP.rows); if(d.hits) IMP.map=d.m} renderImp(); return}
  if(t.dataset&&t.dataset.impMap){ if(!can('cust.import')||!IMP)return; IMP.map[t.dataset.impMap]=+t.value; renderImp(); return}
  if(t.id==='datePick'&&t.value){S._dayTouched=true;S.date=restricted()?shipClamp(t.value):t.value;S.sel.clear();subOrders();render()}
  if(t.dataset&&t.dataset.sel!==undefined){ if(!canAssign())return; if(t.checked) S.sel.add(t.dataset.sel); else S.sel.delete(t.dataset.sel); render(); return}
  if(t.dataset&&t.dataset.shipFor){ if(!canAssign())return; assignShipper([t.dataset.shipFor],t.value); return}
  if(t.id==='bulkShip'){ if(!canAssign())return; S.bulkShip=t.value; render(); return}
  if((t.id==='r_from'||t.id==='r_to')&&t.value){S.rep[t.id==='r_from'?'from':'to']=t.value;subReport();render()}
});

/* ---------- giao diện sáng/tối (lưu trên từng máy) ---------- */
const TKEY='lyly_theme_v1'; let memTheme='system';
function themeGet(){try{return localStorage.getItem(TKEY)||'system'}catch(_){return memTheme}}
function applyTheme(){const m=themeGet(), r=document.documentElement;
  if(m==='light'||m==='dark'){if(r.getAttribute('data-theme')!==m) r.setAttribute('data-theme',m)}
  else if(r.hasAttribute('data-theme')) r.removeAttribute('data-theme');}
function themeApply(m){memTheme=m;try{localStorage.setItem(TKEY,m)}catch(_){}applyTheme()}
// Lưu theo tài khoản: ghi vào hồ sơ nhân viên để đăng nhập máy khác vẫn giữ giao diện
function themeSet(m){themeApply(m); if(S.me){patch('staff',S.me.id,{theme:m}).catch(e=>console.error(e))}}
applyTheme();
try{new MutationObserver(()=>{const m=themeGet(),cur=document.documentElement.getAttribute('data-theme');if((m==='system'&&cur)||(m!=='system'&&cur!==m))applyTheme()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']})}catch(_){}
/* ---------- boot ---------- */
render();
(async()=>{
  if(!sb){S.booted=true;render();return}
  try{ const {data}=await sb.auth.getSession(); if(data&&data.session){S.authId=data.session.user.id; startData()} }
  catch(e){console.error(e)}
  S.booted=true; if(!S.authId) render();
  sb.auth.onAuthStateChange(ev=>{ if(ev==='SIGNED_OUT'&&S.authId) leave('Phiên đăng nhập đã hết, đăng nhập lại nhé.') });
})();
})();
