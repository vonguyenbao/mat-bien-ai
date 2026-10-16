/* Tạo tự động bởi python/tao_ban_tren_mang.py – lưu sẵn trang và mô hình để chạy không cần mạng. Không sửa tay. */
const PHIEN_BAN = 'mba-cb5b9716f6';
const TEP = ["app.js", "cai-dat.js", "cau-hinh.js", "du-lieu-trang.js", "index.html", "manifest.webmanifest", "mb-chung.js", "style.css", "anh/snb02_20120522_0900.jpg", "anh/snb02_20120522_1100.jpg", "anh/snb02_20121031_1400.jpg", "anh/snb02_20121031_1500.jpg", "anh/snb02_20121031_1600.jpg", "anh/snb02_20130212_0800.jpg", "anh/snb02_20141115_0800.jpg", "anh/snb02_20141115_0900.jpg", "anh/snb02_20141129_0900.jpg", "anh/snb02_20150614_1300.jpg", "anh/snb02_20210507_1400.jpg", "anh/snb02_20210509_0900.jpg", "anh/snb02_20210512_0900.jpg", "anh/snb02_20210513_0800.jpg", "anh/snb02_20210601_1000.jpg", "anh/snb02_20210618_1000.jpg", "anh/snb02_20210620_1000.jpg", "anh/snb02_20210621_0800.jpg", "anh/snb02_20210622_0800.jpg", "anh/snb02_20210704_1000.jpg", "anh/snb02_20210916_0800.jpg", "anh/snb02_20210916_1000.jpg", "anh/snb02_20211005_0800.jpg", "anh/snb02_20211005_1000.jpg", "anh/snb02_20220524_1600.jpg", "anh/snb02_20220624_1000.jpg", "anh/snb02_20220903_1700.jpg", "anh/snb02_20220929_0800.jpg", "anh/snb02_20230923_1000.jpg", "anh/snb02_20231017_0800.jpg", "anh/snb02_20231019_1000.jpg", "anh/snb02_20231020_1000.jpg", "anh/snb02_20231021_0900.jpg", "anh/snb02_20231023_0800.jpg", "anh/snb02_20231026_0900.jpg", "anh/snb02_20231027_0800.jpg", "anh/snb02_20231029_1000.jpg", "hinh/nam-dau-hieu.png", "hinh/thoat.png", "icon/apple-touch-icon.png", "icon/icon-192.png", "icon/icon-512.png", "icon/icon-maskable-512.png", "mo-hinh/metadata.json", "mo-hinh/model.json", "mo-hinh/weights.bin", "thu-vien/GIAY-PHEP.txt", "thu-vien/teachablemachine-image.min.js", "thu-vien/tf.min.js"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PHIEN_BAN).then((c) => c.addAll(['./'].concat(TEP))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== PHIEN_BAN).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.mode === 'navigate') {
    // trang chính: lấy bản mới khi có mạng, mất mạng thì dùng bản đã lưu
    e.respondWith(fetch(e.request).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
});
