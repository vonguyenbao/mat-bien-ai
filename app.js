/* Mắt Biển AI – phần điều khiển trang web. Chạy hoàn toàn trên máy người dùng. */
(function () {
  'use strict';
  const CH = window.MB_CAU_HINH || {};
  const DL = window.MB_DU_LIEU || { anh: [] };
  const $ = (id) => document.getElementById(id);

  // ───────────────────────── Tiện ích
  function boDau(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  function h(tag, props, ...con) {
    const e = document.createElement(tag);
    if (props) for (const k of Object.keys(props)) {
      if (k === 'class') e.className = props[k];
      else if (k === 'html') e.innerHTML = props[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), props[k]);
      else if (props[k] !== undefined && props[k] !== null && props[k] !== false) e.setAttribute(k, props[k] === true ? '' : props[k]);
    }
    for (const c of con.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e;
  }
  function chuoiAnToan(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function argmax(a) { let k = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[k]) k = i; return k; }
  const cacheAnh = {};
  function anhDL(a) {
    // mở trực tiếp tệp: dùng ảnh nhúng (data URL) để AI đọc được điểm ảnh
    const nhung = location.protocol === 'file:' && window.MB_ANH_NHUNG && window.MB_ANH_NHUNG[a.tep];
    if (!cacheAnh[a.id]) cacheAnh[a.id] = MBC.napAnh(nhung || a.tep);
    return cacheAnh[a.id];
  }
  function dsTheoDe(de) { return (DL.anh || []).filter((a) => a.de === de); }
  function veAnh(cv, im) {
    cv.width = 960;
    cv.height = Math.round((960 * (im.naturalHeight || im.height)) / (im.naturalWidth || im.width));
    cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
  }
  function veDaGiac(ctx, polys, W, H, mau, day, net) {
    ctx.save(); ctx.strokeStyle = mau; ctx.lineWidth = day; ctx.setLineDash(net || []);
    for (const p of polys || []) {
      ctx.beginPath();
      p.forEach(([x, y], k) => (k ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
      ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
  }
  function veNhan(ctx, chu, x, y, nen) {
    ctx.save(); ctx.font = '700 20px system-ui, Arial'; ctx.textBaseline = 'top';
    const w = ctx.measureText(chu).width + 14;
    x = Math.max(0, Math.min(x, ctx.canvas.width - w)); y = Math.max(0, Math.min(y, ctx.canvas.height - 28)); // không để nhãn tràn ra ngoài ảnh
    ctx.fillStyle = nen || 'rgba(15,23,42,.8)'; ctx.fillRect(x, y, w, 28);
    ctx.fillStyle = '#fff'; ctx.fillText(chu, x + 7, y + 4); ctx.restore();
  }

  // ───────────────────────── AI (mô hình Teachable Machine của nhóm)
  const AI = { mo: null, nhan: [], iRip: 0, iSong: 1, iKhong: 2, trangThai: 'dang_nap', thongBao: '', cache: {} };
  function ganNhan() {
    const nh = AI.mo.getClassLabels ? AI.mo.getClassLabels() || [] : [];
    const bd = nh.map(boDau);
    let r = bd.findIndex((s) => s.includes('dong chay') || s.includes('rip'));
    let k = bd.findIndex((s) => s.includes('khong phai') || s.includes('not'));
    if (r < 0) r = 0;
    if (k < 0 || k === r) k = nh.length >= 3 ? [0, 1, 2].find((i) => i !== r && i === 2) ?? -1 : -1;
    const s = [0, 1, 2].find((i) => i !== r && i !== k && i < Math.max(nh.length, 2));
    AI.iRip = r; AI.iKhong = k; AI.iSong = s === undefined ? -1 : s; AI.nhan = nh;
    AI.trangThai = 'san_sang';
    AI.thongBao = 'Mô hình của nhóm đã sẵn sàng (' + nh.length + ' lớp: ' + nh.join(' · ') + ').';
  }
  async function napMoHinh() {
    if (!window.tmImage || !window.tf) { AI.trangThai = 'loi'; AI.thongBao = 'Thiếu thư viện TensorFlow.js – hãy mở trang từ thư mục web đầy đủ.'; return capNhatTrangThaiAI(); }
    try {
      const goc = CH.THU_MUC_MO_HINH || 'mo-hinh/';
      AI.mo = await tmImage.load(goc + 'model.json', goc + 'metadata.json');
      ganNhan();
    } catch (e) {
      // mở trực tiếp tệp: không đọc được thư mục mo-hinh, dùng bản nhúng (web/nhung/mo-hinh.js)
      const N = window.MB_MO_HINH_NHUNG;
      if (N && N.weights) {
        try {
          const b = atob(N.weights), u = new Uint8Array(b.length);
          for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
          AI.mo = await tmImage.loadFromFiles(new File([N.model], 'model.json', { type: 'application/json' }), new File([u], 'weights.bin'), new File([N.metadata], 'metadata.json', { type: 'application/json' }));
          ganNhan();
          return capNhatTrangThaiAI();
        } catch (e2) { /* rơi xuống thông báo bên dưới */ }
      }
      AI.trangThai = 'chua';
      AI.thongBao = location.protocol === 'file:'
        ? 'Chưa nạp được mô hình. Hãy mở trang bằng tệp Mo-Mat-Bien-AI.bat (hoặc bản trên mạng), hoặc nạp 3 tệp mô hình ở mục cuối trang.'
        : 'Chưa có mô hình trong thư mục mo-hinh. Bảo chép 3 tệp Teachable Machine vào đó, hoặc nạp tạm ở mục cuối trang.';
    }
    capNhatTrangThaiAI();
  }
  async function napMoHinhTuTep(files) {
    const ds = Array.from(files || []);
    const tim = (re) => ds.find((f) => re.test(f.name));
    const fm = tim(/^model.*\.json$/i), fw = tim(/\.bin$/i), fd = tim(/^metadata.*\.json$/i);
    if (!fm || !fw || !fd) { AI.thongBao = 'Cần chọn đủ 3 tệp: model.json, weights.bin, metadata.json.'; return capNhatTrangThaiAI(); }
    try { AI.mo = await tmImage.loadFromFiles(fm, fw, fd); AI.cache = {}; ganNhan(); }
    catch (e) { AI.trangThai = 'loi'; AI.thongBao = 'Không nạp được mô hình: ' + e.message; }
    capNhatTrangThaiAI();
    if (KHOI_TAO['soi-anh'] && location.hash === '#soi-anh' && SA.anh) soi(SA.anh, SA.khoa);
  }
  function capNhatTrangThaiAI() {
    const el = $('saMoHinh');
    if (el) { el.textContent = AI.thongBao || ''; el.className = AI.trangThai === 'san_sang' ? 'ghi-chu' : 'ghi-chu'; }
    const tm = $('tmTrangThai');
    if (tm) tm.textContent = AI.trangThai === 'san_sang' ? (CH.KIEU_MO_HINH === 'ca_anh' ? 'AI của nhóm đã sẵn sàng: sau mỗi câu bạn có thể xem AI chấm cả ảnh.' : 'AI của nhóm đã sẵn sàng: sau mỗi câu bạn có thể xem vùng AI tô.') : 'Chưa có mô hình AI – trò chơi vẫn chơi được với đáp án chuyên gia.';
  }
  // chấm một ảnh: chia lưới cot × hang; mỗi ô AI nhìn khung vuông rộng 1,4 lần ô của lưới duyệt 6 × 4 (giống lúc huấn luyện)
  // Phương án dự phòng (cau-hinh.js: KIEU_MO_HINH: 'ca_anh'): AI chấm cả ảnh, thu vào ô vuông có viền đen như lúc xuất ảnh
  async function chamCaAnh(im) {
    const W = im.naturalWidth || im.width, H = im.naturalHeight || im.height, N = 224;
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const c2 = cv.getContext('2d'); c2.fillStyle = '#000'; c2.fillRect(0, 0, N, N);
    const k = N / Math.max(W, H), w = W * k, h = H * k;
    c2.drawImage(im, (N - w) / 2, (N - h) / 2, w, h);
    const t = tf.tidy(() => AI.mo.model.predict(tf.browser.fromPixels(cv).toFloat().div(tf.scalar(127)).sub(tf.scalar(1)).expandDims(0)));
    const p = Array.from(await t.data()); t.dispose();
    const tuChoi = AI.iKhong >= 0 && argmax(p) === AI.iKhong;
    return { caAnh: true, cot: 1, hang: 1, o: [{ c: 0, r: 0, p }], tiLeKhong: tuChoi ? 1 : 0, tuChoi };
  }
  async function chamAnh(im, cot, hang, khiTienDo) {
    if (CH.KIEU_MO_HINH === 'ca_anh') return chamCaAnh(im);
    const W = im.naturalWidth || im.width, H = im.naturalHeight || im.height;
    const cw = W / MBC.LUOI_DUYET.cot, chh = H / MBC.LUOI_DUYET.hang;
    const ds = [];
    for (let r = 0; r < hang; r++) for (let c = 0; c < cot; c++) {
      const cx = ((c + 0.5) * W) / cot, cy = ((r + 0.5) * H) / hang;
      ds.push({ c, r, khung: { x: cx - cw / 2, y: cy - chh / 2, w: cw, h: chh } });
    }
    const N = 224, LO = 16, cvs = [];
    for (let i = 0; i < LO; i++) { const cv = document.createElement('canvas'); cv.width = cv.height = N; cvs.push(cv); }
    const o = [];
    for (let i = 0; i < ds.length; i += LO) {
      const phan = ds.slice(i, i + LO);
      phan.forEach((x, j) => MBC.catO(im, W, H, x.khung, N, MBC.TI_LE_KHUNG, false, cvs[j]));
      const t = tf.tidy(() => {
        const lo = tf.stack(phan.map((x, j) => tf.browser.fromPixels(cvs[j]))).toFloat().div(tf.scalar(127)).sub(tf.scalar(1));
        return AI.mo.model.predict(lo);
      });
      const v = await t.data();
      t.dispose();
      const k = v.length / phan.length;
      phan.forEach((x, j) => o.push({ c: x.c, r: x.r, p: Array.from(v.slice(j * k, j * k + k)) }));
      if (khiTienDo) khiTienDo(o.length / ds.length);
      await new Promise((res) => setTimeout(res, 0));
    }
    const soKhong = AI.iKhong >= 0 ? o.filter((x) => argmax(x.p) === AI.iKhong).length : 0;
    return { cot, hang, o, tiLeKhong: soKhong / o.length, tuChoi: soKhong / o.length >= (CH.NGUONG_TU_CHOI || 0.8) };
  }
  function veLopAI(ctx, W, H, kq, hienSo, hienLuoi) {
    const tDo = CH.NGUONG_DO ?? 0.5, tVang = CH.NGUONG_VANG ?? 0.3;
    const dem = { do: 0, vang: 0 };
    if (kq.caAnh) {
      const pr = kq.o[0].p[AI.iRip] || 0;
      dem.p = pr;
      const mau = kq.tuChoi ? null : (pr >= tDo ? 'rgba(220,38,38,.95)' : (pr >= tVang ? 'rgba(250,204,21,.98)' : null));
      if (mau) { const lw = Math.max(8, Math.round(W / 70)); ctx.strokeStyle = mau; ctx.lineWidth = lw; ctx.strokeRect(lw / 2, lw / 2, W - lw, H - lw); if (pr >= tDo) dem.do = 1; else dem.vang = 1; }
      if (hienSo || mau) veNhan(ctx, 'AI chấm cả ảnh: ' + Math.round(pr * 100) + '%', 12, 12, mau ? (pr >= tDo ? 'rgba(153,27,27,.92)' : 'rgba(161,98,7,.92)') : 'rgba(15,23,42,.8)');
      return dem;
    }
    for (const x of kq.o) {
      const x0 = (x.c * W) / kq.cot, y0 = (x.r * H) / kq.hang, w = W / kq.cot, hh = H / kq.hang;
      const pr = x.p[AI.iRip] || 0;
      if (!kq.tuChoi) {
        if (pr >= tDo) { ctx.fillStyle = 'rgba(220,38,38,.45)'; ctx.fillRect(x0, y0, w, hh); dem.do++; }
        else if (pr >= tVang) { ctx.fillStyle = 'rgba(250,204,21,.42)'; ctx.fillRect(x0, y0, w, hh); dem.vang++; }
      }
      if (hienLuoi) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, hh - 1); }
      if (hienSo) {
        ctx.save(); ctx.font = '600 ' + Math.max(11, Math.min(18, Math.round(w / 5))) + 'px system-ui, Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(15,23,42,.6)'; ctx.fillRect(x0 + w / 2 - 17, y0 + hh / 2 - 11, 34, 22);
        ctx.fillStyle = '#fff'; ctx.fillText(String(Math.round(pr * 100)), x0 + w / 2, y0 + hh / 2 + 1); ctx.restore();
      }
    }
    return dem;
  }
  async function chamCoCache(khoa, im, cot, hang, khiTienDo) {
    const k = khoa + '|' + cot + 'x' + hang;
    if (!AI.cache[k]) AI.cache[k] = chamAnh(im, cot, hang, khiTienDo);
    return AI.cache[k];
  }

  // ───────────────────────── Trò chơi Thử mắt (dùng lại cho thử nghiệm)
  // cheDo: 'luyen' (có đáp án từng câu) · 'kiem_tra' (không đáp án) · 'thu_thach' (10 giây rồi hiện đáp án)
  function TroChoi(khung, tuyChon) {
    const ds = tuyChon.ds || [];
    const cheDo = tuyChon.cheDo || 'luyen';
    const kq = { cau: [], diem: 0, tong: ds.length, batDau: new Date().toISOString() };
    let i = 0, diem = null, batDauCau = 0, henGio = 0, daTraLoi = false, hienAI = true;
    khung.innerHTML = '';
    const thanh = h('div', { class: 'thanh-tren' }, h('span', null, ''), h('span', { class: 'dem-gio an' }, ''), h('span', null, ''));
    const cv = h('canvas', { width: 960, height: 720 });
    const nutChon = h('button', { class: 'nut chinh', disabled: true }, 'Chọn chỗ này');
    const nutKhong = h('button', { class: 'nut' }, 'Không thấy dòng chảy');
    const hangNut = h('div', { class: 'hang-nut' }, nutChon, nutKhong);
    const phanHoi = h('div', { class: 'the an' });
    khung.append(thanh, h('div', { class: 'khung-anh' }, cv), hangNut, phanHoi);
    const ctx = cv.getContext('2d');

    async function veCau(hienDapAn) {
      const a = ds[i];
      const im = await anhDL(a);
      veAnh(cv, im);
      const W = cv.width, H = cv.height;
      if (hienDapAn && hienAI && AI.trangThai === 'san_sang') {
        try { const r = await chamCoCache(a.id, im, CH.LUOI_SOI[0], CH.LUOI_SOI[1]); veLopAI(ctx, W, H, r, false, false); }
        catch (e) { veNhan(ctx, 'AI không đọc được ảnh này (hãy mở bằng Mo-Mat-Bien-AI.bat)', 12, H - 40, 'rgba(153,27,27,.9)'); }
      }
      if (hienDapAn) {
        veDaGiac(ctx, a.rip, W, H, '#fde047', 5);
        if ((a.rip || []).length) {
          const p = a.rip[0];
          const minY = Math.min(...p.map((q) => q[1])), minX = Math.min(...p.map((q) => q[0]));
          veNhan(ctx, 'Chuyên gia', Math.max(4, minX * W), Math.max(4, minY * H - 32), 'rgba(161,98,7,.92)');
        }
      }
      if (diem) {
        ctx.save(); ctx.beginPath(); ctx.arc(diem.x * W, diem.y * H, 14, 0, 2 * Math.PI);
        ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#2563eb'; ctx.stroke();
        ctx.beginPath(); ctx.arc(diem.x * W, diem.y * H, 4, 0, 2 * Math.PI); ctx.fillStyle = '#2563eb'; ctx.fill(); ctx.restore();
      }
    }
    function capNhatThanh() {
      thanh.children[0].textContent = 'Ảnh ' + (i + 1) + '/' + ds.length;
      thanh.children[2].textContent = cheDo === 'kiem_tra' ? '' : 'Đúng: ' + kq.diem;
    }
    function moCau() {
      daTraLoi = false; diem = null; nutChon.disabled = true; nutKhong.disabled = false;
      hangNut.classList.remove('an'); phanHoi.classList.add('an');
      batDauCau = performance.now();
      capNhatThanh();
      veCau(false);
      if (cheDo === 'thu_thach') {
        let con = 10;
        const dh = thanh.children[1]; dh.classList.remove('an'); dh.textContent = con + ' giây';
        clearInterval(henGio);
        henGio = setInterval(() => {
          con--; dh.textContent = con + ' giây';
          if (con <= 0) { clearInterval(henGio); if (!daTraLoi) traLoi(diem); }
        }, 1000);
      }
    }
    function cham(a, d) {
      const coRip = (a.rip || []).length > 0;
      if (!d) return !coRip;
      if (!coRip) return false;
      return a.rip.some((p) => MBC.trongDaGiac(d.x, d.y, MBC.noiDaGiac(p, 0.03)));
    }
    function traLoi(d) {
      if (daTraLoi) return;
      daTraLoi = true; clearInterval(henGio);
      const a = ds[i];
      const dung = cham(a, d);
      if (dung) kq.diem++;
      kq.cau.push({ id: a.id, co_dong_chay: (a.rip || []).length > 0, tra_loi: d ? [Number(d.x.toFixed(3)), Number(d.y.toFixed(3))] : null, dung, ms: Math.round(performance.now() - batDauCau) });
      capNhatThanh();
      if (cheDo === 'kiem_tra') return tiep();
      hangNut.classList.add('an');
      const coRip = (a.rip || []).length > 0;
      const loi = dung
        ? (coRip ? 'Đúng rồi! Bạn đã chỉ vào vùng chuyên gia đánh dấu.' : 'Đúng rồi! Ảnh này chuyên gia không đánh dấu dòng chảy nào.')
        : (coRip ? (d ? 'Chưa đúng: chỗ bạn chọn nằm ngoài vùng chuyên gia đánh dấu (khung vàng).' : 'Ảnh này có dòng chảy xa bờ – chuyên gia đánh dấu ở khung vàng.')
          : 'Ảnh này chuyên gia không đánh dấu dòng chảy nào – chỗ bạn chọn chưa phải.');
      const goiY = a.goi_y || (coRip ? 'Nhìn vào khung vàng: sóng vỡ có ít hơn hai bên không? Nước có sẫm hơn, có bọt hay cát đục trôi ra không? Đó là các dấu hiệu KIM, THỦY, MỘC, THỔ.' : '');
      phanHoi.innerHTML = '';
      const nutAI = h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: hienAI, onchange: (e) => { hienAI = e.target.checked; veCau(true); } }), ' Xem vùng AI tô (đỏ, vàng)');
      phanHoi.append(
        h('p', { class: dung ? 'dung' : 'sai', style: 'margin-top:0' }, loi),
        goiY ? h('p', { class: 'ghi-chu' }, goiY) : '',
        AI.trangThai === 'san_sang' ? nutAI : h('p', { class: 'ghi-chu' }, 'Chưa có mô hình AI nên chỉ hiện đáp án chuyên gia.'),
        h('div', { class: 'hang-nut' }, h('button', { class: 'nut chinh', onclick: tiep }, i + 1 < ds.length ? 'Ảnh tiếp →' : 'Xem kết quả')),
      );
      phanHoi.classList.remove('an');
      veCau(true);
    }
    function tiep() {
      i++;
      if (i < ds.length) moCau();
      else { clearInterval(henGio); khung.innerHTML = ''; kq.ketThuc = new Date().toISOString(); if (tuyChon.khiXong) tuyChon.khiXong(kq); }
    }
    cv.addEventListener('click', (e) => {
      if (daTraLoi) return;
      const r = cv.getBoundingClientRect();
      diem = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      nutChon.disabled = false;
      veCau(false);
    });
    nutChon.addEventListener('click', () => traLoi(diem));
    nutKhong.addEventListener('click', () => traLoi(null));
    if (!ds.length) { khung.append(h('p', { class: 'ghi-chu' }, 'Chưa có ảnh cho phần này – nhóm chưa chép bộ ảnh vào thư mục web/anh.')); return; }
    moCau();
  }

  // ───────────────────────── Trang Thử mắt
  function moThuMat(cheDo) {
    $('tmBatDau').classList.add('an'); $('tmKetThuc').classList.add('an');
    const khung = $('tmChoi'); khung.classList.remove('an');
    let ds;
    if (cheDo === 'thu_thach') {
      const ung = dsTheoDe('thu_thach').concat(dsTheoDe('soi').filter((a) => (a.rip || []).length), dsTheoDe('luyen').filter((a) => (a.rip || []).length));
      ds = ung.length ? [ung[Math.floor(Math.random() * Math.min(ung.length, 4))]] : [];
    } else ds = dsTheoDe('luyen');
    TroChoi(khung, {
      ds, cheDo,
      khiXong: (kq) => {
        khung.classList.add('an');
        const kt = $('tmKetThuc'); kt.classList.remove('an'); kt.innerHTML = '';
        kt.append(
          h('h3', { style: 'margin-top:0' }, cheDo === 'thu_thach' ? (kq.diem ? 'Bạn đã nhận ra trong 10 giây!' : 'Khó phải không? Chính vì vậy mà cần luyện mắt.') : 'Bạn đúng ' + kq.diem + '/' + kq.tong + ' ảnh'),
          h('p', null, 'Ghi nhớ: dòng chảy xa bờ thường ở chỗ trông LẶNG hơn – ít sóng bạc đầu. Ra biển, chỉ tắm trong vùng phao, có cứu hộ.'),
          h('div', { class: 'hang-nut' }, h('button', { class: 'nut chinh', onclick: () => moThuMat('luyen') }, 'Chơi lại'), h('a', { class: 'nut', href: '#nho' }, 'Học 5 dấu hiệu')),
        );
      },
    });
  }

  // ───────────────────────── Trang Soi ảnh
  const SA = { anh: null, khoa: '', kq: null };
  async function soi(im, khoa) {
    SA.anh = im; SA.khoa = khoa; SA.kq = null;
    if (window.MB_NGU_HANH_SOI) window.MB_NGU_HANH_SOI.datLai();
    const cv = $('saCanvas'), ctx = cv.getContext('2d');
    veAnh(cv, im);
    const td = $('saThongDiep');
    if (AI.trangThai !== 'san_sang') {
      td.className = 'the thong-diep-xam';
      td.innerHTML = '<b>Chưa có mô hình AI.</b> ' + chuoiAnToan(AI.thongBao || '');
      return;
    }
    td.className = 'the thong-diep-xam'; td.textContent = 'AI đang chấm từng ô…';
    $('saDangCham').classList.remove('an');
    try {
      SA.kq = await chamCoCache(khoa, im, CH.LUOI_SOI[0], CH.LUOI_SOI[1], (t) => ($('saDangCham').textContent = 'AI đang chấm từng ô… ' + Math.round(t * 100) + '%'));
    } catch (e) {
      $('saDangCham').classList.add('an');
      delete AI.cache[khoa + '|' + CH.LUOI_SOI[0] + 'x' + CH.LUOI_SOI[1]];
      td.className = 'the thong-diep-xam';
      td.innerHTML = /secur|taint|cross/i.test(e.message || '')
        ? '<b>AI chưa đọc được ảnh mẫu</b> vì trang đang mở thẳng từ tệp. Hãy mở bằng tệp <b>Mo-Mat-Bien-AI.bat</b> (hoặc bản trên mạng). Ảnh bạn tự chọn vẫn soi được.'
        : '<b>Lỗi khi chấm ảnh:</b> ' + chuoiAnToan(e.message || e);
      return;
    }
    $('saDangCham').classList.add('an');
    veLaiSoi();
  }
  function veLaiSoi() {
    if (!SA.anh) return;
    const cv = $('saCanvas'), ctx = cv.getContext('2d');
    veAnh(cv, SA.anh);
    if (!SA.kq) return;
    const dem = veLopAI(ctx, cv.width, cv.height, SA.kq, $('saHienSo').checked, $('saHienLuoi').checked);
    const td = $('saThongDiep');
    const nhac = '<br><span class="ghi-chu">Mắt Biển AI là công cụ học tập, không thay thế cứu hộ. Ra biển: chỉ tắm trong vùng phao, vào giờ có cứu hộ.</span>';
    if (SA.kq.caAnh) {
      const pt = Math.round((dem.p || 0) * 100) + '%';
      const ve = ' <span class="ghi-chu">AI của nhóm chấm cả ảnh nên chưa chỉ ra chỗ nào – hãy tự soi 5 dấu hiệu Ngũ Hành ngay bên dưới.</span>';
      if (SA.kq.tuChoi) { td.className = 'the thong-diep-xam'; td.innerHTML = '<b>Ảnh này có vẻ không phải ảnh mặt biển.</b> Hãy chọn ảnh bãi biển, chụp ngang, từ chỗ cao.' + nhac; }
      else if (dem.do) { td.className = 'the thong-diep-do'; td.innerHTML = '<b>AI thấy dấu hiệu dòng chảy xa bờ trong ảnh này (' + pt + ').</b>' + ve + nhac; }
      else if (dem.vang) { td.className = 'the thong-diep-vang'; td.innerHTML = '<b>AI chưa chắc (' + pt + ').</b> Hãy hỏi cứu hộ trước khi xuống nước.' + ve + nhac; }
      else { td.className = 'the thong-diep-xam'; td.innerHTML = '<b>AI chưa thấy dấu hiệu rõ (' + pt + ').</b> Điều này <b>không có nghĩa là an toàn</b>.' + ve + nhac; }
      if (window.MB_NGU_HANH_SOI) window.MB_NGU_HANH_SOI.capNhat(SA.kq.tuChoi ? 'tuchoi' : dem.do ? 'do' : dem.vang ? 'vang' : 'xam', dem.p);
      return;
    }
    if (SA.kq.tuChoi) {
      td.className = 'the thong-diep-xam';
      td.innerHTML = '<b>Ảnh này có vẻ không phải ảnh mặt biển</b> (AI thấy ' + Math.round(SA.kq.tiLeKhong * 100) + '% số ô không phải mặt biển). Hãy chọn ảnh bãi biển, chụp ngang, từ chỗ cao.' + nhac;
    } else if (dem.do) {
      td.className = 'the thong-diep-do';
      td.innerHTML = '<b>Vùng đỏ: có dấu hiệu dòng chảy xa bờ – tránh xa.</b>' + (dem.vang ? ' Vùng vàng: AI chưa chắc, hãy hỏi cứu hộ.' : '') + nhac;
    } else if (dem.vang) {
      td.className = 'the thong-diep-vang';
      td.innerHTML = '<b>Vùng vàng: AI chưa chắc.</b> Hãy hỏi cứu hộ trước khi xuống nước.' + nhac;
    } else {
      td.className = 'the thong-diep-xam';
      td.innerHTML = '<b>AI chưa thấy dấu hiệu rõ.</b> Điều này <b>không có nghĩa là an toàn</b>.' + nhac;
    }
    if (window.MB_NGU_HANH_SOI) window.MB_NGU_HANH_SOI.capNhat(SA.kq.tuChoi ? 'tuchoi' : dem.do ? 'do' : dem.vang ? 'vang' : 'xam', null);
  }

  // ───────────────────────── Trang Nhớ để sống
  function theNghe(src, nhan) {
    const nut = h('button', { class: 'nghe' }, '▶ ' + (nhan || 'Nghe'));
    let au = null;
    nut.addEventListener('click', () => {
      if (!au) {
        au = new Audio(src);
        au.addEventListener('error', () => { nut.textContent = 'Chưa có giọng đọc'; nut.disabled = true; });
      }
      au.currentTime = 0; au.play().catch(() => { nut.textContent = 'Chưa có giọng đọc'; nut.disabled = true; });
    });
    return nut;
  }
  function veNho() {
    const nh = $('nhoNguHanh'); nh.innerHTML = '';
    for (const x of CH.NGU_HANH || []) nh.append(h('div', { class: 'the-hanh' }, h('span', { class: 'hanh' }, x.hanh), h('b', null, x.ten), h('p', null, x.mo_ta), theNghe(x.am_thanh, 'Nghe đọc')));
    const nv = $('nhoNamViec'); nv.innerHTML = '';
    for (const x of CH.NAM_VIEC || []) nv.append(h('li', null, h('b', null, x.ten + ': '), x.mo_ta + ' ', theNghe(x.am_thanh, 'Nghe')));
    const kt = $('nhoKhiThay');
    if (kt) {
      kt.innerHTML = ''; for (const t of CH.KHI_THAY_NGUOI_BI_CUON || []) kt.append(h('li', null, t));
      if (CH.AM_THANH_KHI_THAY && kt.lastChild) kt.lastChild.append(' ', theNghe(CH.AM_THANH_KHI_THAY, 'Nghe'));
    }
  }
  function ngatDong(ctx, chu, rong) {
    const tu = String(chu).split(' '), dong = [];
    let d = '';
    for (const t of tu) { const thu = d ? d + ' ' + t : t; if (ctx.measureText(thu).width > rong && d) { dong.push(d); d = t; } else d = thu; }
    if (d) dong.push(d);
    return dong;
  }
  function veGiaoUoc() {
    const cv = $('gaCanvas'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0e7490'); g.addColorStop(0.5, '#67e8f9'); g.addColorStop(0.51, '#f5e6c8'); g.addColorStop(1, '#ead2a4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const bo = 44;
    ctx.fillStyle = 'rgba(255,255,255,.94)';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bo, bo, W - 2 * bo, H - 2 * bo, 36); else ctx.rect(bo, bo, W - 2 * bo, H - 2 * bo); ctx.fill();
    const trai = 96, rong = W - 2 * trai;
    let y = 128;
    ctx.textAlign = 'center'; ctx.fillStyle = '#155e75'; ctx.font = '800 70px system-ui, Arial'; ctx.fillText('GIAO ƯỚC ĐI BIỂN', W / 2, y); y += 58;
    const ten = ($('gaTen').value || '').trim();
    ctx.font = '600 38px system-ui, Arial'; ctx.fillStyle = '#b45309'; ctx.fillText(ten || 'của gia đình mình', W / 2, y); y += 82;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a'; ctx.font = '800 40px system-ui, Arial'; ctx.fillText('Cả nhà cùng hứa', trai, y); y += 56;
    ctx.font = '400 34px system-ui, Arial';
    for (const l of CH.LOI_HUA || []) {
      ngatDong(ctx, l, rong - 54).forEach((d, k) => {
        if (!k) { ctx.fillStyle = '#15803d'; ctx.font = '800 34px system-ui, Arial'; ctx.fillText('✓', trai, y); ctx.font = '400 34px system-ui, Arial'; }
        ctx.fillStyle = '#0f172a'; ctx.fillText(d, trai + 54, y); y += 46;
      });
      y += 8;
    }
    y += 34;
    const cot2 = trai + rong / 2 + 20, yCot = y;
    ctx.font = '800 38px system-ui, Arial'; ctx.fillStyle = '#0f172a';
    ctx.fillText('5 dấu hiệu', trai, y); ctx.fillText('Nếu bị kéo ra', cot2, y);
    y += 58;
    (CH.NGU_HANH || []).forEach((x, k) => {
      const yy = y + k * 54;
      ctx.fillStyle = '#0e7490'; ctx.font = '800 32px system-ui, Arial'; ctx.fillText(x.hanh, trai, yy);
      ctx.fillStyle = '#0f172a'; ctx.font = '400 32px system-ui, Arial'; ctx.fillText(x.ten, trai + 116, yy);
    });
    (CH.NAM_VIEC || []).forEach((x, k) => {
      const yy = y + k * 54;
      ctx.fillStyle = '#b91c1c'; ctx.font = '800 32px system-ui, Arial'; ctx.fillText(String(k + 1), cot2, yy);
      ctx.fillStyle = '#0f172a'; ctx.font = '400 32px system-ui, Arial'; ctx.fillText(x.ten, cot2 + 36, yy);
    });
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cot2 - 24, yCot - 34); ctx.lineTo(cot2 - 24, y + 4 * 54 + 10); ctx.stroke();
    y += 5 * 54 + 40;
    const khi = CH.KHI_THAY_NGUOI_BI_CUON || [];
    if (khi.length) {
      ctx.fillStyle = '#fef2f2'; ctx.strokeStyle = '#fecaca';
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(trai - 20, y - 46, rong + 40, 72 + khi.length * 46, 20); else ctx.rect(trai - 20, y - 46, rong + 40, 72 + khi.length * 46); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#991b1b'; ctx.font = '800 34px system-ui, Arial'; ctx.fillText('Thấy người khác bị cuốn', trai, y); y += 50;
      ctx.font = '400 32px system-ui, Arial'; ctx.fillStyle = '#0f172a';
      khi.forEach((t) => { ctx.fillText('• ' + t, trai, y); y += 46; });
    }
    ctx.textAlign = 'center';
    ctx.font = '800 44px system-ui, Arial'; ctx.fillStyle = '#b91c1c'; ctx.fillText('“' + (CH.KHAU_HIEU || '') + '”', W / 2, H - 150);
    ctx.font = '400 27px system-ui, Arial'; ctx.fillStyle = '#475569';
    ctx.fillText(CH.TEN_SAN_PHAM + ' · ' + (String(CH.TEN_DOI || '').includes('«') ? 'nhóm học sinh THCS Huỳnh Bá Chánh, Đà Nẵng' : CH.TEN_DOI), W / 2, H - 98);
    $('gaLuu').disabled = false; $('gaChiaSe').disabled = !(navigator.share);
  }
  function blobThe() { return new Promise((res) => $('gaCanvas').toBlob(res, 'image/png')); }

  // ───────────────────────── Trang Về dự án
  function veVeDuAn() {
    const d = $('vdaDoi'); d.innerHTML = '';
    d.append(h('h3', { style: 'margin-top:0' }, 'Nhóm thực hiện'), h('p', null, h('b', null, CH.TEN_DOI || ''), ' · ', CH.TRUONG || ''),
      h('ul', null, (CH.THANH_VIEN || []).map((t) => h('li', null, t))), h('p', { class: 'ghi-chu' }, CH.CUOC_THI || ''));
    const k = $('vdaKetQua'); k.innerHTML = '';
    const r = CH.KET_QUA_MO_HINH || {};
    k.append(h('h3', { style: 'margin-top:0' }, 'AI của nhóm giỏi đến đâu?'));
    if (r.do_nhay === null || r.do_nhay === undefined) k.append(h('p', null, 'Nhóm đang đo trên bộ ảnh kiểm tra đã khóa từ trước khi huấn luyện – kết quả sẽ cập nhật ở đây.'));
    else k.append(h('p', null, 'Trên bộ ảnh kiểm tra đã khóa (camera ' + (r.camera_kiem_tra || 'khác') + ', không dùng để huấn luyện): AI bắt được ', h('b', null, Math.round(r.do_nhay * 100) + '%'), (CH.KIEU_MO_HINH === 'ca_anh' ? ' số ảnh có dòng chảy (' + (r.so_o_dong_chay || '…') + ' ảnh), và báo nhầm ' : ' số ô có dòng chảy (' + (r.so_o_dong_chay || '…') + ' ô), và báo nhầm '), h('b', null, Math.round(r.bao_nham * 100) + '%'), (CH.KIEU_MO_HINH === 'ca_anh' ? ' số ảnh không có dòng chảy (' + (r.so_o_khac || '…') + ' ảnh). Ngưỡng viền đỏ: ' : ' số ô mặt biển không có dòng chảy (' + (r.so_o_khac || '…') + ' ô; không tính ô trời, cát). Ngưỡng tô đỏ: ') + String(CH.NGUONG_DO || 0.5).replace('.', ',') + '.' + (r.ngay_do ? ' Đo ngày ' + r.ngay_do + '.' : '')));
    const n = $('vdaNguon'); n.innerHTML = '';
    n.append(h('h3', { style: 'margin-top:0' }, 'Nguồn dữ liệu và vai trò của AI'), h('p', null, CH.NGUON_DU_LIEU || ''), h('ul', null, (CH.GHI_CONG_AI || []).map((t) => h('li', null, t))));
  }

  // ───────────────────────── Chế độ thử nghiệm
  const KHOA_TN = 'mb-thu-nghiem-v1';
  const TN = { buoc: 'dau' };
  function dsKetQua() { return MBC.docCuc(KHOA_TN, []); }
  function veTN() {
    const phut = CH.THOI_GIAN_HOC_PHUT || 10;
    $('tnPhutDau').textContent = String(phut);
    for (const id of ['tnBatDau', 'tnHoc', 'tnCamNhan', 'tnXong']) $(id).classList.add('an');
    let khung = $('tnKhung');
    if (!khung) { khung = h('div', { id: 'tnKhung' }); $('tnBatDau').after(khung); }
    khung.innerHTML = '';
    if (TN.buoc === 'dau') {
      $('tnBatDau').classList.remove('an');
      const ds = dsKetQua();
      $('tnMa').value = String(ds.length + 1).padStart(2, '0');
      $('tnGhiChu').textContent = 'Máy này đã lưu ' + ds.length + ' bài. Đề A: ' + dsTheoDe('A').length + ' ảnh, Đề B: ' + dsTheoDe('B').length + ' ảnh.';
    } else if (TN.buoc === 'de1' || TN.buoc === 'de2') {
      const de = TN.buoc === 'de1' ? TN.thuTu[0] : TN.thuTu[1];
      khung.append(h('div', { class: 'the' }, h('b', null, (TN.buoc === 'de1' ? 'Đề 1' : 'Đề 2') + ' – mã ' + TN.ma), h('span', { class: 'ghi-chu' }, ' · chạm vào chỗ bạn nghĩ có dòng chảy xa bờ, hoặc chọn “Không thấy”. Bài này chưa hiện đáp án.')));
      const k2 = h('div'); khung.append(k2);
      TroChoi(k2, { ds: MBC.tron(dsTheoDe(de), MBC.bam32(TN.ma + de)), cheDo: 'kiem_tra', khiXong: (kq) => {
        kq.de = de;
        if (TN.buoc === 'de1') { TN.kq1 = kq; TN.buoc = 'hoc'; TN.batDauHoc = Date.now(); }
        else { TN.kq2 = kq; TN.buoc = 'cam_nhan'; }
        veTN();
      } });
    } else if (TN.buoc === 'hoc') {
      $('tnHoc').classList.remove('an');
      $('tnPhut').textContent = String(phut);
      const k3 = h('div'); khung.append(k3);
      clearInterval(TN.dongHo);
      const capNhat = () => {
        const con = Math.max(0, phut * 60 - Math.floor((Date.now() - TN.batDauHoc) / 1000));
        $('tnDongHo').textContent = String(Math.floor(con / 60)).padStart(2, '0') + ':' + String(con % 60).padStart(2, '0');
      };
      capNhat(); TN.dongHo = setInterval(capNhat, 1000);
      $('tnMoLuyen').onclick = () => TroChoi(k3, { ds: dsTheoDe('luyen'), cheDo: 'luyen', khiXong: () => { k3.innerHTML = '<p class="dung">Xong phần luyện tập.</p>'; } });
      $('tnDe2').onclick = () => { clearInterval(TN.dongHo); TN.giayHoc = Math.round((Date.now() - TN.batDauHoc) / 1000); TN.buoc = 'de2'; veTN(); };
    } else if (TN.buoc === 'cam_nhan') {
      const el = $('tnCamNhan'); el.classList.remove('an'); el.innerHTML = '';
      TN.camNhan = TN.camNhan || [];
      el.append(h('h3', { style: 'margin-top:0' }, 'Bạn thấy thế nào? (1 = không chút nào, 5 = rất nhiều)'));
      (CH.CAU_HOI_CAM_NHAN || []).forEach((cau, k) => {
        const hang = h('div', { class: 'thang-diem' });
        for (let v = 1; v <= 5; v++) hang.append(h('button', { class: TN.camNhan[k] === v ? 'chon' : '', onclick: () => { TN.camNhan[k] = v; veTN(); } }, String(v)));
        el.append(h('p', { style: 'margin:8px 0 2px' }, (k + 1) + '. ' + cau), hang);
      });
      const du = (CH.CAU_HOI_CAM_NHAN || []).every((x, k) => TN.camNhan[k]);
      el.append(h('button', { class: 'nut chinh', disabled: !du, onclick: luuTN }, 'Gửi và xem kết quả'));
    } else if (TN.buoc === 'xong') {
      const el = $('tnXong'); el.classList.remove('an'); el.innerHTML = '';
      const dTruoc = TN.kq1.diem, dSau = TN.kq2.diem;
      el.append(h('h3', { style: 'margin-top:0' }, 'Cảm ơn bạn!'), h('p', { style: 'font-size:22px' }, 'Trước khi học: ', h('b', null, dTruoc + '/' + TN.kq1.tong), ' → Sau khi học: ', h('b', null, dSau + '/' + TN.kq2.tong)),
        h('p', null, 'Bây giờ cùng xem đáp án của 20 ảnh với nhóm nhé.'),
        h('div', { class: 'hang-nut' }, h('button', { class: 'nut', onclick: () => { const k4 = h('div'); el.append(k4); TroChoi(k4, { ds: dsTheoDe(TN.thuTu[0]).concat(dsTheoDe(TN.thuTu[1])), cheDo: 'luyen' }); } }, 'Xem đáp án 20 ảnh'),
          h('button', { class: 'nut chinh', onclick: () => { TN.buoc = 'dau'; veTN(); } }, 'Bạn tiếp theo')));
    }
    veBangTN();
  }
  function luuTN() {
    const ds = dsKetQua();
    const ban = {
      ma: TN.ma, thu_tu: TN.thuTu.join(''), diem_de1: TN.kq1.diem, diem_de2: TN.kq2.diem,
      diem_A: TN.thuTu[0] === 'A' ? TN.kq1.diem : TN.kq2.diem, diem_B: TN.thuTu[0] === 'B' ? TN.kq1.diem : TN.kq2.diem,
      so_cau: TN.kq1.tong, giay_hoc: TN.giayHoc || 0, cam_nhan: TN.camNhan.slice(),
      bat_dau: TN.kq1.batDau, ket_thuc: new Date().toISOString(), chi_tiet: [TN.kq1.cau, TN.kq2.cau],
    };
    ds.push(ban);
    if (!MBC.luuCuc(KHOA_TN, ds)) alert('Không lưu được kết quả trên máy này – hãy ghi tay: trước ' + ban.diem_de1 + ', sau ' + ban.diem_de2);
    TN.buoc = 'xong'; veTN();
  }
  function veBangTN() {
    const ds = dsKetQua();
    const el = $('tnBang'); el.innerHTML = '';
    if (!ds.length) { el.append(h('p', { class: 'ghi-chu' }, 'Chưa có kết quả nào trên máy này.')); return; }
    const tb = h('table', { class: 'bang' }, h('tr', null, ['Mã', 'Thứ tự', 'Đề 1', 'Đề 2', 'Học (giây)', 'Cảm nhận'].map((t) => h('th', null, t))));
    for (const b of ds) tb.append(h('tr', null, [b.ma, b.thu_tu, b.diem_de1 + '/' + b.so_cau, b.diem_de2 + '/' + b.so_cau, b.giay_hoc, (b.cam_nhan || []).join(' · ')].map((t) => h('td', null, String(t)))));
    el.append(tb);
  }
  function csvTN() {
    const cot = ['ma', 'thu_tu', 'so_cau', 'diem_de1', 'diem_de2', 'diem_A', 'diem_B', 'truoc', 'sau', 'giay_hoc', 'cam_nhan_1', 'cam_nhan_2', 'cam_nhan_3', 'bat_dau', 'ket_thuc'];
    const dong = [cot.join(',')];
    for (const b of dsKetQua()) {
      const c = b.cam_nhan || [];
      dong.push([b.ma, b.thu_tu, b.so_cau, b.diem_de1, b.diem_de2, b.diem_A, b.diem_B, b.diem_de1, b.diem_de2, b.giay_hoc, c[0] || '', c[1] || '', c[2] || '', b.bat_dau, b.ket_thuc].map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(','));
    }
    return '﻿' + dong.join('\r\n') + '\r\n';
  }

  // ───────────────────────── Định tuyến và khởi tạo
  const KHOI_TAO = {
    'thu-mat': () => { if ($('tmChoi').classList.contains('an')) { $('tmBatDau').classList.remove('an'); } capNhatTrangThaiAI(); },
    'soi-anh': () => { capNhatTrangThaiAI(); veMauSoi(); },
    nho: () => veNho(),
    've-du-an': () => veVeDuAn(),
    'thu-nghiem': () => veTN(),
  };
  let daVeMau = false;
  function veMauSoi() {
    if (daVeMau) return; daVeMau = true;
    const el = $('saMau');
    const ds = dsTheoDe('soi');
    if (!ds.length) { el.append(h('p', { class: 'ghi-chu' }, 'Chưa có ảnh mẫu.')); return; }
    ds.forEach((a, k) => {
      const nut = h('button', { title: 'Ảnh mẫu ' + (k + 1) }, h('img', { src: a.tep, alt: 'Ảnh mẫu ' + (k + 1), loading: 'lazy' }));
      nut.addEventListener('click', async () => { el.querySelectorAll('button').forEach((b) => b.classList.toggle('chon', b === nut)); soi(await anhDL(a), a.id); });
      el.append(nut);
    });
  }
  function diToi() {
    const id = (location.hash || '#trang-chu').slice(1);
    const sec = document.getElementById(id);
    const tim = sec && sec.classList.contains('trang') ? id : 'trang-chu';
    document.querySelectorAll('.trang').forEach((s) => s.classList.toggle('hien', s.id === tim));
    document.querySelectorAll('#dieuHuong a').forEach((a) => a.classList.toggle('dang', a.getAttribute('href') === '#' + tim));
    if (KHOI_TAO[tim]) KHOI_TAO[tim]();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', diToi);

  // nút và sự kiện tĩnh
  $('khauHieu').textContent = CH.KHAU_HIEU || '';
  if (CH.KIEU_MO_HINH === 'ca_anh') {
    const ct = document.getElementById('saCachCham');
    if (ct) ct.innerHTML = '<li>Ảnh mở ngay trong trình duyệt, không gửi đi đâu.</li><li>Bản dự thi: AI của nhóm nhìn <b>cả ảnh</b> và cho ba con số: khả năng ảnh có <b>dòng chảy xa bờ</b>, là <b>biển bình thường</b>, hay <b>không phải mặt biển</b>.</li><li>Khả năng dòng chảy từ ngưỡng đỏ trở lên thì viền đỏ, từ ngưỡng vàng thì viền vàng. AI chưa chỉ ra được chỗ nào trong ảnh.</li>';
    /* va-15-10 ca_anh */
    const theSoi = document.querySelector('a.the-lon[href="#soi-anh"] span');
    if (theSoi) theSoi.textContent = 'AI chấm cả ảnh: có dấu hiệu dòng chảy xa bờ hay không';
    const oLuoi = document.getElementById('saHienLuoi');
    if (oLuoi && oLuoi.closest('label')) oLuoi.closest('label').style.display = 'none';
    const dangCham = document.getElementById('saDangCham');
    if (dangCham) dangCham.textContent = 'AI đang chấm ảnh…';
    const gioiThieuTM = document.querySelector('#tmBatDau p');
    if (gioiThieuTM) gioiThieuTM.innerHTML = gioiThieuTM.innerHTML.replace('vùng AI tô', 'kết quả AI chấm cả ảnh');
  }
  $('chanTrang').textContent = (CH.TEN_SAN_PHAM || '') + ' · ' + (CH.TEN_DOI || '') + ' · ' + (CH.TRUONG || '');
  $('nutThuThach').addEventListener('click', () => { location.hash = '#thu-mat'; setTimeout(() => moThuMat('thu_thach'), 0); });
  $('tmLuyen').addEventListener('click', () => moThuMat('luyen'));
  $('tmThuThach').addEventListener('click', () => moThuMat('thu_thach'));
  $('saTep').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    try { const im = await MBC.napAnh(url); $('saMau').querySelectorAll('button').forEach((b) => b.classList.remove('chon')); soi(im, 'tep-' + f.name + '-' + f.size + '-' + f.lastModified); }
    catch (err) { $('saThongDiep').textContent = 'Không mở được ảnh này.'; }
  });
  $('saHienSo').addEventListener('change', veLaiSoi);
  $('saHienLuoi').addEventListener('change', veLaiSoi);
  $('saTepMoHinh').addEventListener('change', (e) => napMoHinhTuTep(e.target.files));
  $('gaTao').addEventListener('click', veGiaoUoc);
  $('gaLuu').addEventListener('click', async () => MBC.taiXuong(await blobThe(), 'giao-uoc-di-bien.png'));
  $('gaChiaSe').addEventListener('click', async () => {
    const b = await blobThe();
    const f = new File([b], 'giao-uoc-di-bien.png', { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Giao ước đi biển' });
      else MBC.taiXuong(b, 'giao-uoc-di-bien.png');
    } catch (e) { /* người dùng huỷ */ }
  });
  $('tnVao').addEventListener('click', () => {
    const ma = ($('tnMa').value || '').trim();
    if (!ma) { $('tnGhiChu').textContent = 'Hãy nhập mã số.'; return; }
    if (dsKetQua().some((b) => b.ma === ma)) { $('tnGhiChu').textContent = 'Mã ' + ma + ' đã có trên máy này – hãy dùng mã khác.'; return; }
    if (!dsTheoDe('A').length || !dsTheoDe('B').length) { $('tnGhiChu').textContent = 'Chưa có ảnh Đề A, Đề B.'; return; }
    const so = parseInt(ma.replace(/\D/g, ''), 10);
    const le = Number.isFinite(so) ? so % 2 === 1 : MBC.bam32(ma) % 2 === 1;
    Object.assign(TN, { buoc: 'de1', ma, thuTu: le ? ['A', 'B'] : ['B', 'A'], kq1: null, kq2: null, camNhan: [], giayHoc: 0 });
    veTN();
  });
  $('tnTaiCSV').addEventListener('click', () => MBC.taiXuong(new Blob([csvTN()], { type: 'text/csv' }), 'ket-qua-thu-nghiem.csv'));
  $('tnXoa').addEventListener('click', () => $('tnXacNhanXoa').classList.remove('an'));
  $('tnXacNhan').addEventListener('click', () => {
    if (($('tnGoXoa').value || '').trim().toUpperCase() === 'XOA') { MBC.luuCuc(KHOA_TN, []); $('tnXacNhanXoa').classList.add('an'); $('tnGoXoa').value = ''; veBangTN(); }
  });

  diToi();
  napMoHinh();
})();
