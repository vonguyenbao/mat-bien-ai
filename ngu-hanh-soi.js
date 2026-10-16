/* Mắt Biển AI – "Soi tiếp bằng mắt: 5 dấu hiệu Ngũ Hành" (thêm 16/10/2026).
   AI của nhóm chấm cả ảnh, chưa tách được từng dấu hiệu. Phần này để NGƯỜI DÙNG tự nhìn ảnh và đánh dấu
   dấu hiệu mình thấy; trang gộp với kết quả AI thành lời khuyên. Không bao giờ kết luận một vùng biển là an toàn. */
(function () {
  'use strict';
  var CH = window.MB_CAU_HINH || {};
  var NH = CH.NGU_HANH || [];
  var MAU = { 'KIM': '#475569', 'MỘC': '#15803d', 'THỦY': '#1d4ed8', 'HỎA': '#dc2626', 'THỔ': '#a16207' };
  var hop = null, tong = null, muc = null, pAI = null, chon = {};

  var css = document.createElement('style');
  css.textContent =
    '.nh-soi h3{margin:0 0 6px}.nh-dong{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--vien,#d6e1ea)}' +
    '.nh-nhan{flex:none;min-width:52px;text-align:center;color:#fff;font-weight:800;font-size:13px;border-radius:8px;padding:5px 6px}' +
    '.nh-chu{flex:1;min-width:0;line-height:1.35}.nh-chu small{color:var(--phu,#475569)}' +
    '.nh-nut{flex:none;display:flex;gap:6px}.nh-nut button{border:1px solid var(--vien,#cbd5e1);background:#fff;border-radius:9px;padding:7px 10px;font-size:14px;cursor:pointer;color:#0f172a}' +
    '.nh-nut button[aria-pressed="true"][data-v="1"]{background:#dc2626;border-color:#dc2626;color:#fff;font-weight:700}' +
    '.nh-nut button[aria-pressed="true"][data-v="0"]{background:#e2e8f0;border-color:#94a3b8;font-weight:700}' +
    '.nh-tong{margin-top:10px}' +
    '@media (max-width:520px){.nh-dong{flex-wrap:wrap}.nh-nut{width:100%;justify-content:flex-end}}';
  document.head.appendChild(css);

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function tao() {
    if (hop) return;
    var neo = document.getElementById('saThongDiep');
    if (!neo || !NH.length) return;
    hop = el('div', 'the nh-soi an');
    hop.appendChild(el('h3', null, 'Soi tiếp bằng mắt: 5 dấu hiệu Ngũ Hành'));
    hop.appendChild(el('p', 'ghi-chu', 'AI của nhóm chấm <b>cả ảnh</b>, chưa tách được từng dấu hiệu. Bạn hãy nhìn ảnh và chọn dấu hiệu mình thấy – đây là cách luyện mắt.'));
    NH.forEach(function (d, i) {
      var dong = el('div', 'nh-dong');
      var nhan = el('span', 'nh-nhan', d.hanh); nhan.style.background = MAU[d.hanh] || '#0e7490';
      dong.appendChild(nhan);
      dong.appendChild(el('div', 'nh-chu', '<b>' + d.ten + '</b><br><small>' + d.mo_ta + '</small>'));
      var nut = el('div', 'nh-nut');
      [['1', 'Thấy'], ['0', 'Không thấy']].forEach(function (x) {
        var b = el('button', null, x[1]); b.type = 'button'; b.dataset.v = x[0]; b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', x[1] + ' dấu hiệu ' + d.hanh + ' – ' + d.ten);
        b.addEventListener('click', function () {
          chon[i] = chon[i] === x[0] ? undefined : x[0];
          nut.querySelectorAll('button').forEach(function (bb) { bb.setAttribute('aria-pressed', String(chon[i] === bb.dataset.v)); });
          veTong();
        });
        nut.appendChild(b);
      });
      dong.appendChild(nut);
      hop.appendChild(dong);
    });
    tong = el('div', 'the nh-tong');
    hop.appendChild(tong);
    neo.parentNode.insertBefore(hop, neo.nextSibling);
  }

  function veTong() {
    if (!tong) return;
    var thay = [], daChon = 0;
    NH.forEach(function (d, i) { if (chon[i] !== undefined) daChon++; if (chon[i] === '1') thay.push(d.hanh); });
    var pt = pAI == null ? '' : ' (' + Math.round(pAI * 100) + '%)';
    var ai = muc === 'do' ? 'AI thấy dấu hiệu' + pt : muc === 'vang' ? 'AI chưa chắc' + pt : 'AI chưa thấy dấu hiệu rõ' + pt;
    var ban = 'bạn thấy ' + thay.length + '/5 dấu hiệu' + (thay.length ? ' (' + thay.join(', ') + ')' : '');
    var nhac = '<br><span class="ghi-chu">Ra biển: chỉ tắm trong vùng phao, vào giờ có cứu hộ. Thấy người bị cuốn: hô to, gọi cứu hộ, ném vật nổi – không tự lao xuống.</span>';
    if (thay.length || muc === 'do') {
      tong.className = 'the nh-tong thong-diep-do';
      var them = '';
      if (muc === 'do' && !thay.length && daChon === NH.length) them = '<br>AI thấy dấu hiệu nhưng bạn chưa thấy: hãy nhìn lại <b>dải nước ít sóng bạc đầu giữa hai vùng sóng vỡ</b> (KIM) và <b>vệt nước sẫm</b> (THỦY).';
      if (thay.length && muc !== 'do') them = '<br>Mắt bạn thấy dấu hiệu dù AI chưa thấy rõ – <b>AI có thể bỏ sót</b>, hãy tin vào dấu hiệu và hỏi cứu hộ.';
      tong.innerHTML = '<b>Có dấu hiệu dòng chảy xa bờ: không xuống tắm ở vùng này.</b> ' + ai + '; ' + ban + '.' + them + nhac;
    } else if (muc === 'vang') {
      tong.className = 'the nh-tong thong-diep-vang';
      tong.innerHTML = '<b>' + ai + '</b>; ' + ban + '. Hãy <b>hỏi cứu hộ</b> trước khi xuống nước.' + nhac;
    } else if (daChon < NH.length) {
      tong.className = 'the nh-tong thong-diep-xam';
      tong.innerHTML = ai + '. Hãy xem đủ 5 dấu hiệu (đã xem ' + daChon + '/5).';
    } else {
      tong.className = 'the nh-tong thong-diep-xam';
      tong.innerHTML = '<b>Bạn và AI đều chưa thấy dấu hiệu rõ – điều này không có nghĩa là an toàn.</b> Sóng to, trời tối, ảnh chụp thấp thì rất khó nhìn.' + nhac;
    }
  }

  window.MB_NGU_HANH_SOI = {
    // gọi mỗi khi có kết quả AI: muc = 'do' | 'vang' | 'xam' | 'tuchoi'
    capNhat: function (m, p) {
      tao();
      if (!hop) return;
      muc = m; pAI = (typeof p === 'number') ? p : null;
      if (m === 'tuchoi') { hop.classList.add('an'); return; }
      hop.classList.remove('an');
      veTong();
    },
    // ảnh mới: xoá lựa chọn cũ
    datLai: function () {
      chon = {};
      if (hop) {
        hop.classList.add('an');
        hop.querySelectorAll('.nh-nut button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      }
    },
  };
})();
