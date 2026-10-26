# Đông Khách — các phiên bản

Số phiên bản hiện ở cuối **Cài đặt** trong app. Mới nhất ở trên.

## v7 — 2026.10.27 (Đợt 1)
**Thay đổi**
- Loại hình kinh doanh (Cài đặt): *Ăn uống* (gọi là "món") hoặc *Bán sản phẩm* (gọi là "sản phẩm"). Quán chưa chọn = Ăn uống.
- Danh mục: công tắc Đang bán / Ẩn trên từng dòng; giá vốn + lãi/lỗ; đơn vị tính chọn nhanh.
- Quyền mới "Xem và sửa giá vốn, lợi nhuận": mặc định chỉ Quản lý; cấp được cho Thu ngân; Shipper không bao giờ.
- Máy chủ tự ghi giá vốn lúc bán cho từng đơn (chuẩn bị cho báo cáo lãi lỗ).
- Lệnh tạo quán: thêm `--type food|retail`; dữ liệu mẫu có giá vốn.
- Ô giá bán / giá vốn tự thêm dấu chấm phần ngàn (50.000), ghi (VNĐ); "Đang bán" nằm cạnh ô tên.
- App xưng "bạn" thay cho "anh" (Tài khoản của bạn, bạn thử lại nhé...).
- Sửa lỗi: nút **In ngay** trong màn hình in bill không mở hộp thoại in (phải Tải file mới in được).

**Cần đưa lên:** SQL `20261027000001_biz_and_cost.sql` · Edge Function `staff-admin` (bắt buộc) · web `app.js` + `app.css` · `scripts/shop.mjs` (máy anh)

## v6.1 — 2026.10.26.1 (bản vá)
- Sửa lỗi: nút **In ngay** không mở hộp thoại in (phải Tải file mới in được).

**Cần đưa lên:** chỉ web `app.js`. Không đổi SQL, không đổi Edge Function.

## v6 — 2026.10.26 (đưa lên khách tối 26/10/2026)
**Thay đổi**
- Shipper xem đơn gán cho mình trong 5 ngày (3 ngày trước → ngày mai); đơn ngày khác chỉ xem.
- Shipper không bao giờ có: xem tất cả đơn, báo cáo, gán shipper, danh sách khách, tạo đơn. Chỉ thấy tên/SĐT/địa chỉ khách trên đơn của mình.
- Số phiên bản ở cuối Cài đặt.

**Đã đưa lên:** SQL `20261023000002_shipper_window.sql` · Edge Function `staff-admin` · web `app.js`

## v5 — bản đầu tiên cho khách
Nhiều quán, đăng nhập bằng mã quán, logo và màu theo quán. SQL 5 file đầu (đến `…shop_branding.sql`). Không có số phiên bản trong app.
