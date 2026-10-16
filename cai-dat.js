/* Mắt Biển AI – phần "app" của bản trên mạng (tạo bởi python/tao_ban_tren_mang.py):
   1) chạy không cần mạng sau lần mở đầu (service worker), 2) lời nhắc an toàn khi mở lần đầu,
   3) nút "Cài lên màn hình chính" (Android: hộp cài của Chrome; iPhone: hướng dẫn Safari), 4) gợi ý khi mở trong Zalo. */
(function () {
  'use strict';
  var KHOA_LUU_Y = 'mb-luu-y-ban-thu-v1';
  var KHOA_AN_NUT = 'mb-an-nut-cai-den';
  function doc(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function luu(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* trình duyệt chặn lưu: bỏ qua */ } }

  // 1. Chạy không cần mạng: chỉ bật khi mở qua https (bản trên mạng)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || /[?&]sw=1/.test(location.search))) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  var ua = navigator.userAgent || '';
  var trongZalo = /zalo/i.test(ua);
  var laIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var daCai = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  var css = document.createElement('style');
  css.textContent =
    '.mb-phu{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.mb-hop{background:#fff;color:#0f172a;max-width:520px;width:100%;max-height:90vh;overflow:auto;border-radius:16px;padding:20px 20px 16px;box-shadow:0 12px 40px rgba(0,0,0,.3);font-size:16px;line-height:1.5}' +
    '.mb-hop h2{margin:0 0 10px;color:#155e75;font-size:21px}.mb-hop ul{margin:0 0 14px;padding-left:20px}.mb-hop li{margin:0 0 7px}' +
    '.mb-hop .mb-nut{display:block;width:100%;border:0;border-radius:10px;background:#155e75;color:#fff;font-weight:700;font-size:17px;padding:12px;cursor:pointer}' +
    '.mb-thanh{position:fixed;left:12px;right:12px;bottom:12px;z-index:900;background:#155e75;color:#fff;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;align-items:center;gap:10px;padding:10px 12px;font-size:15px;line-height:1.35}' +
    '.mb-thanh img{width:36px;height:36px;border-radius:8px;flex:none}.mb-thanh span{flex:1}' +
    '.mb-thanh button{border:0;border-radius:9px;font-weight:700;font-size:15px;padding:8px 12px;cursor:pointer}' +
    '.mb-thanh .mb-cai{background:#fde68a;color:#0f172a}.mb-thanh .mb-dong{background:transparent;color:#fff;font-size:20px;padding:4px 8px}' +
    '.mb-hd{background:#fff;color:#0f172a;border-radius:10px;padding:10px 12px;margin-top:8px;font-size:15px}';
  document.head.appendChild(css);

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // 2. Lời nhắc an toàn – mở lần đầu
  function hienLuuY(xong) {
    var phu = el('div', 'mb-phu');
    var hop = el('div', 'mb-hop',
      '<h2>Trước khi dùng Mắt Biển AI</h2><ul>' +
      '<li>Đây là <b>bản thử nghiệm</b> của nhóm học sinh NBK_03, làm cho cuộc thi Sáng tạo cùng AI 2026.</li>' +
      '<li>Mắt Biển AI là <b>công cụ học tập</b> giúp bạn luyện mắt nhận ra dòng chảy xa bờ. <b>Không dùng để chọn chỗ tắm.</b></li>' +
      '<li>AI của nhóm học từ ảnh camera đặt cao ở Tây Ban Nha. Ảnh chụp từ bãi cát, ảnh tối, ảnh mờ thì AI <b>có thể chấm sai, kể cả bỏ sót</b> dòng chảy. AI không thấy dấu hiệu <b>không có nghĩa là an toàn</b>.</li>' +
      '<li>Chụp từ chỗ cao (kè, đồi, tầng cao), ngang ảnh, thấy rõ vùng sóng vỡ thì AI chấm sát hơn.</li>' +
      '<li>Ảnh bạn chọn chỉ xử lý trên máy của bạn, <b>không gửi đi đâu</b>.</li>' +
      '<li>Ra biển: chỉ tắm trong vùng phao, vào giờ có cứu hộ.</li></ul>');
    var nut = el('button', 'mb-nut', 'Tôi đã hiểu');
    nut.type = 'button';
    nut.addEventListener('click', function () { luu(KHOA_LUU_Y, '1'); phu.remove(); if (xong) xong(); });
    hop.appendChild(nut); phu.appendChild(hop); document.body.appendChild(phu);
    nut.focus();
  }

  // 3–4. Thanh "Cài lên màn hình chính"
  var hoiCai = null;
  var thanh = null;
  function anNut() {
    var den = Number(doc(KHOA_AN_NUT) || 0);
    return daCai || Date.now() < den;
  }
  function hienThanh() {
    if (thanh || anNut()) return;
    var chu = trongZalo ? 'Mở bằng trình duyệt để cài Mắt Biển AI như một app'
      : 'Cài Mắt Biển AI lên màn hình chính – lần sau mở không cần mạng';
    thanh = el('div', 'mb-thanh');
    thanh.appendChild(el('img', null)).src = 'icon/icon-192.png';
    thanh.appendChild(el('span', null, chu));
    var cai = el('button', 'mb-cai', trongZalo ? 'Cách mở' : 'Cài');
    cai.type = 'button';
    var dong = el('button', 'mb-dong', '×');
    dong.type = 'button'; dong.setAttribute('aria-label', 'Ẩn');
    thanh.appendChild(cai); thanh.appendChild(dong);
    document.body.appendChild(thanh);
    document.body.style.paddingBottom = '84px';
    dong.addEventListener('click', function () { luu(KHOA_AN_NUT, String(Date.now() + 3 * 24 * 3600 * 1000)); thanh.remove(); document.body.style.paddingBottom = ''; });
    cai.addEventListener('click', function () {
      if (hoiCai && !trongZalo) {
        hoiCai.prompt();
        hoiCai.userChoice.then(function () { hoiCai = null; thanh.remove(); document.body.style.paddingBottom = ''; });
        return;
      }
      var hd = thanh.querySelector('.mb-hd');
      if (hd) { hd.remove(); return; }
      var loi = trongZalo
        ? 'Bấm nút <b>⋯</b> (hoặc <b>⋮</b>) ở góc trên bên phải → <b>Mở bằng trình duyệt</b>. Rồi bấm <b>Cài</b> ở thanh này.'
        : laIOS
          ? 'Trong <b>Safari</b>: bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên lên) → kéo xuống, chọn <b>Thêm vào MH chính</b> → <b>Thêm</b>.'
          : 'Trong <b>Chrome</b>: bấm nút <b>⋮</b> ở góc trên → <b>Thêm vào màn hình chính</b> (hoặc <b>Cài đặt ứng dụng</b>).';
      var khung = el('div', 'mb-hd', loi);
      thanh.querySelector('span').appendChild(khung);
    });
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); hoiCai = e; hienThanh(); });
  window.addEventListener('appinstalled', function () { daCai = true; if (thanh) thanh.remove(); });

  function batDau() {
    var sau = function () {
      if (laIOS || trongZalo) hienThanh();
      else if (/android/i.test(ua)) setTimeout(function () { if (!hoiCai) hienThanh(); }, 4000);  // trình duyệt không có hộp cài: hiện hướng dẫn tay
    };
    if (!doc(KHOA_LUU_Y)) hienLuuY(sau); else sau();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', batDau); else batDau();
})();
