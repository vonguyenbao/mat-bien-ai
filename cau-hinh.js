/* ─────────────────────────────────────────────────────────────────────
   CẤU HÌNH TRANG WEB MẮT BIỂN AI – nhóm sửa ở đây.
   Chỗ có «D…» là chỗ chờ dữ liệu của các bạn (mã D1 – D19 trong tệp 5).
   Sửa xong, lưu tệp và tải lại trang (F5).
   ───────────────────────────────────────────────────────────────────── */
window.MB_CAU_HINH = {
  TEN_SAN_PHAM: 'Mắt Biển AI',
  KHAU_HIEU: 'Biển lặng chưa chắc đã hiền',
  TEN_DOI: 'Nhóm NBK_03',
  THANH_VIEN: [],  // bản trên mạng: chưa ghi họ tên các bạn (chờ các gia đình đồng ý)
  TRUONG: 'Trường THCS Huỳnh Bá Chánh (Phân hiệu), phường Ngũ Hành Sơn, TP Đà Nẵng',
  CUOC_THI: 'Cuộc thi “Sáng tạo cùng AI – Đổi mới trong học tập, kiến tạo vì cộng đồng” 2026',

  // ── Mô hình AI ─────────────────────────────────────────────
  // Bảo chép 3 tệp Teachable Machine (model.json, weights.bin, metadata.json) vào thư mục mo-hinh.
  // Tên 3 lớp trên Teachable Machine: Dòng chảy xa bờ / Sóng bình thường / Không phải mặt biển.
  THU_MUC_MO_HINH: 'mo-hinh/',
  KIEU_MO_HINH: 'ca_anh',  // 'o' = AI chấm từng ô (mặc định) · 'ca_anh' = phương án dự phòng, AI chấm cả ảnh (python/xuat_ca_anh.py)
  NGUONG_DO: 0.5,    // «D8» Bảo chọn từ bảng số đo: từ mức này trở lên thì tô ĐỎ
  NGUONG_VANG: 0.3,  // «D8» từ mức này đến dưới ngưỡng đỏ thì tô VÀNG (AI chưa chắc)
  NGUONG_TU_CHOI: 0.8, // nếu từ 80% số ô trở lên là “không phải mặt biển” thì báo đây không phải ảnh bãi biển
  LUOI_SOI: [12, 8],   // số cột × số hàng khi soi ảnh (ô nhỏ hơn lưới duyệt 6 × 4 để vùng tô mịn hơn)
  // «D8» Kết quả đo trên bộ kiểm tra đã khóa (camera khác với ảnh huấn luyện) – để null khi chưa đo.
  // Lấy từ so-do.txt: do_nhay, bao_nham (số thập phân, ví dụ 0.85), so_o_dong_chay, so_o_khac (= số ô sóng bình thường).
  KET_QUA_MO_HINH: { do_nhay: null, bao_nham: null, so_o_dong_chay: null, so_o_khac: null, camera_kiem_tra: null, ngay_do: null },

  // ── Năm dấu hiệu và năm việc ── lời đọc ở tệp 12; Bảo sửa câu nào khi thu giọng thì sửa cả ở đây cho khớp
  NGU_HANH: [
    { hanh: 'KIM', ten: 'Khoảng lặng', mo_ta: 'Một dải ít hoặc không có sóng bạc đầu, nằm giữa hai vùng sóng vỡ.', am_thanh: 'am-thanh/kim.m4a' },
    { hanh: 'MỘC', ten: 'Rong rác trôi ra', mo_ta: 'Bọt, rong, rác trôi đều ra phía khơi.', am_thanh: 'am-thanh/moc.m4a' },
    { hanh: 'THỦY', ten: 'Nước sẫm', mo_ta: 'Vệt nước sẫm màu hơn, trông sâu hơn xung quanh.', am_thanh: 'am-thanh/thuy.m4a' },
    { hanh: 'HỎA', ten: 'Mặt nước gợn', mo_ta: 'Một dải nước gợn lăn tăn, xáo động như đang sôi.', am_thanh: 'am-thanh/hoa.m4a' },
    { hanh: 'THỔ', ten: 'Nước đục', mo_ta: 'Nước đục màu cát kéo dài ra ngoài vùng sóng vỡ.', am_thanh: 'am-thanh/tho.m4a' },
  ],
  NAM_VIEC: [
    { ten: 'Bình tĩnh', mo_ta: 'Dòng chảy kéo ra xa chứ không kéo chìm.', am_thanh: 'am-thanh/viec1.m4a' },
    { ten: 'Thả nổi', mo_ta: 'Đừng bơi ngược dòng, sẽ kiệt sức.', am_thanh: 'am-thanh/viec2.m4a' },
    { ten: 'Giơ tay, kêu cứu', mo_ta: 'Giơ một tay và gọi thật to.', am_thanh: 'am-thanh/viec3.m4a' },
    { ten: 'Bơi song song với bờ', mo_ta: 'Còn đứng được thì lội; bơi ngang theo bờ cho thoát khỏi dòng.', am_thanh: 'am-thanh/viec4.m4a' },
    { ten: 'Theo sóng vào bờ', mo_ta: 'Thoát khỏi dòng rồi mới bơi vào.', am_thanh: 'am-thanh/viec5.m4a' },
  ],
  // Nếu thấy người khác bị cuốn (theo khuyến cáo của NOAA và các tổ chức cứu hộ biển)
  KHI_THAY_NGUOI_BI_CUON: [
    'Hô to, gọi người lớn và cứu hộ.',
    'Ném phao hoặc vật nổi cho người bị cuốn.',
    'Không tự lao xuống cứu.',
  ],
  AM_THANH_KHI_THAY: 'am-thanh/nguoi-khac.m4a',
  LOI_HUA: [
    'Chỉ tắm trong vùng phao, vào giờ có cứu hộ.',
    'Không tắm ở nơi có biển cấm, cờ đỏ hoặc khi sóng to.',
    'Trẻ em luôn có người lớn đi cùng và trông chừng.',
  ],

  // ── Thử nghiệm với các bạn ─────────────────────────────────
  THOI_GIAN_HOC_PHUT: 10,
  CAU_HOI_CAM_NHAN: [
    'Trang web có dễ hiểu không?',
    'Bạn có muốn gửi thẻ Giao ước đi biển cho gia đình không?',
    'Sau khi học, bạn có thấy sợ biển hơn không?',
  ],

  // ── Ghi nguồn ────────────────────────────────────────────────
  NGUON_DU_LIEU: 'Ảnh và vùng dòng chảy do chuyên gia đánh dấu: RipAID v1.0.0 – Soriano-González và cộng sự (2025), SOCIB, Zenodo, DOI 10.5281/zenodo.15082427, giấy phép CC BY 4.0. Ảnh chụp từ camera đặt trên cao ở hai bãi biển Cala Millor và Son Bou (Tây Ban Nha); nhóm thu nhỏ ảnh và chia thành ô.',
  GHI_CONG_AI: [
    'Mô hình AI do nhóm tự huấn luyện trên Teachable Machine (Google), từ ảnh nguyên tấm có nhãn chuyên gia (bộ RipAID).',
    'Khung trang web, công cụ duyệt ô và hình minh hoạ do trợ lý AI tạo sinh (phụ huynh sử dụng) hỗ trợ soạn; nhóm chỉnh nội dung, chọn ngưỡng và thử nghiệm. Chi tiết trong Nhật ký đồng sáng tạo.',
    'Lời 5 dấu hiệu và 5 việc do trợ lý AI tạo sinh soạn nháp theo khuyến cáo của NOAA và các tổ chức cứu hộ biển; nhóm đọc lại và duyệt.',
  ],
};
