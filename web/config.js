// Cấu hình kết nối Supabase. Khoá "anon / publishable" là khoá CÔNG KHAI, để trong code được:
// dữ liệu được bảo vệ bằng luật quyền (RLS) trong supabase/migrations, không phải bằng việc giấu khoá này.
// TUYỆT ĐỐI KHÔNG dán khoá bí mật (loại "secret" hoặc "service") vào đây.
window.LYLY_CONFIG = {
  // Dán Project URL và khoá công khai của dự án Supabase của anh vào 2 dòng dưới (xem HUONG-DAN-DUNG-MOI.md, bước 6).
  supabaseUrl: 'https://ydfckfiavcquoyaxuyxg.supabase.co',
  supabaseAnonKey: 'sb_publishable_js_n8ltN_AookzNyzRMklg_6yABeyIA',
  // Đuôi cuối của email "giả" <tên đăng nhập>@<mã quán>.<đuôi>. Phải trùng biến LOGIN_EMAIL_SUFFIX của Edge Function (mặc định app).
  // KHÔNG đổi sau khi đã có tài khoản.
  emailSuffix: 'app',
  // Mã quán điền sẵn ở màn hình đăng nhập (để trống: mỗi máy tự nhớ mã quán của lần đăng nhập trước)
  defaultShop: 'quanthu',
  // Tên hiển thị ở màn hình đăng nhập trước khi biết quán nào
  brandName: 'Đông Khách',
  // Cách liên hệ hiện trong biểu ngữ hết hạn dùng thử, ví dụ "Zalo 09xx xxx xxx"
  supportContact: '0353777082',
  // false = ẩn nút "Tạo quán mới": chỉ nhà cung cấp tạo quán bằng lệnh (scripts/shop.mjs create)
  allowSignup: false,
  // false = ẩn nút "Nhập đơn từ comment Facebook" (AI)
  enableAI: true
};
