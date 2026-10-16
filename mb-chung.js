/* Mắt Biển AI – phần dùng chung cho trang web, công cụ duyệt ô và công cụ kiểm tra.
   Viết bằng JavaScript thuần, không cần mạng. */
(function (g) {
  'use strict';

  // ── Nhãn của từng ô ─────────────────────────────────────────────
  const NHAN = [
    { ma: 0, khoa: 'chua_duyet', ten: 'Chưa duyệt', ngan: '?', mau: '#94a3b8' },
    { ma: 1, khoa: 'dong_chay', ten: 'Dòng chảy xa bờ', ngan: 'Dòng chảy', mau: '#dc2626' },
    { ma: 2, khoa: 'song', ten: 'Sóng bình thường', ngan: 'Sóng', mau: '#0284c7' },
    { ma: 3, khoa: 'khong_phai_bien', ten: 'Không phải mặt biển', ngan: 'Không phải biển', mau: '#b45309' },
    { ma: 4, khoa: 'bo_qua', ten: 'Bỏ qua (khó, không chắc)', ngan: 'Bỏ qua', mau: '#64748b' },
  ];
  // Thư mục xuất cho Teachable Machine – mỗi thư mục là một lớp
  const THU_MUC_LOP = { 1: '1-dong-chay-xa-bo', 2: '2-song-binh-thuong', 3: '3-khong-phai-mat-bien' };
  const LUOI_DUYET = { cot: 6, hang: 4 };   // lưới duyệt nhãn: 6 cột × 4 hàng = 24 ô
  const TI_LE_KHUNG = 1.4;                  // AI nhìn rộng hơn ô 1,4 lần để thấy sóng hai bên

  // ── Hình học ô ─────────────────────────────────────────────────
  function oChuNhat(w, h, cot, hang, c, r) {
    const x0 = Math.round((c * w) / cot), x1 = Math.round(((c + 1) * w) / cot);
    const y0 = Math.round((r * h) / hang), y1 = Math.round(((r + 1) * h) / hang);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  // khung vuông quanh tâm ô, cạnh = tiLe × cạnh dài của ô, đẩy vào trong ảnh nếu chạm mép
  function khungNhin(w, h, o, tiLe) {
    const t = tiLe || TI_LE_KHUNG;
    const s = Math.max(1, Math.min(Math.round(Math.max(o.w, o.h) * t), w, h));
    let x = Math.round(o.x + o.w / 2 - s / 2), y = Math.round(o.y + o.h / 2 - s / 2);
    x = Math.max(0, Math.min(w - s, x));
    y = Math.max(0, Math.min(h - s, y));
    return { x, y, s };
  }
  // vẽ khung nhìn của ô vào canvas vuông (mặc định 224 × 224 – cỡ ảnh Teachable Machine dùng)
  function catO(nguon, w, h, o, kichThuoc, tiLe, latNgang, canvas) {
    const n = kichThuoc || 224;
    const k = khungNhin(w, h, o, tiLe);
    const cv = canvas || document.createElement('canvas');
    cv.width = n; cv.height = n;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    if (latNgang) { ctx.translate(n, 0); ctx.scale(-1, 1); }
    ctx.drawImage(nguon, k.x, k.y, k.s, k.s, 0, 0, n, n);
    ctx.restore();
    return cv;
  }

  // ── Đa giác (toạ độ chuẩn hoá 0..1) ────────────────────────────
  function trongDaGiac(x, y, poly) {
    let trong = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi) trong = !trong;
    }
    return trong;
  }
  function trongVung(x, y, polys) {
    for (const p of polys || []) if (trongDaGiac(x, y, p)) return true;
    return false;
  }
  // tỉ lệ diện tích ô (chuẩn hoá) nằm trong các đa giác – lấy mẫu n × n điểm
  function phanPhu(c, r, cot, hang, polys, n) {
    if (!polys || !polys.length) return 0;
    const m = n || 10;
    let dem = 0;
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
      const x = (c + (i + 0.5) / m) / cot, y = (r + (j + 0.5) / m) / hang;
      if (trongVung(x, y, polys)) dem++;
    }
    return dem / (m * m);
  }
  // nới đa giác ra quanh trọng tâm (dùng khi chấm điểm chạm trong trò chơi)
  function noiDaGiac(poly, them) {
    const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
    const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    return poly.map(([x, y]) => {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
      return [x + (dx / d) * them, y + (dy / d) * them];
    });
  }

  // tỉ lệ diện tích của MỘT đa giác nằm trong ô (lấy mẫu m × m điểm trong khung bao của đa giác)
  function phanCuaVung(c, r, cot, hang, poly, m) {
    const n = m || 20;
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const cx0 = c / cot, cx1 = (c + 1) / cot, cy0 = r / hang, cy1 = (r + 1) / hang;
    let tong = 0, trongO = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = x0 + ((x1 - x0) * (i + 0.5)) / n, y = y0 + ((y1 - y0) * (j + 0.5)) / n;
      if (!trongDaGiac(x, y, poly)) continue;
      tong++;
      if (x >= cx0 && x < cx1 && y >= cy0 && y < cy1) trongO++;
    }
    return tong ? trongO / tong : 0;
  }
  function phanVungLonNhat(c, r, cot, hang, polys) {
    let k = 0;
    for (const p of polys || []) k = Math.max(k, phanCuaVung(c, r, cot, hang, p));
    return k;
  }
  // Gợi ý nhãn từ vùng chuyên gia: { ma, canQuyetDinh }
  // Dòng chảy thường là một dải hẹp: xét cả phần ô bị phủ lẫn phần vùng dòng chảy nằm trong ô
  function goiYNhan(anh, c, r, cot, hang) {
    const fr = phanPhu(c, r, cot, hang, anh.rip), fv = phanVungLonNhat(c, r, cot, hang, anh.rip);
    if (fr >= 0.25 || fv >= 0.5) return { ma: 1, canQuyetDinh: false, phu: fr };
    if (fr >= 0.08 || fv >= 0.2) return { ma: 0, canQuyetDinh: true, phu: fr };
    const fn = phanPhu(c, r, cot, hang, anh.ngo), fnv = phanVungLonNhat(c, r, cot, hang, anh.ngo);
    if (fn >= 0.1 || fnv >= 0.3) return { ma: 4, canQuyetDinh: false, phu: fr };
    return { ma: 2, canQuyetDinh: false, phu: fr };
  }

  // ── Base64 an toàn (dùng cho mã kết quả) ────────────────────────
  function bytesToB64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64ToBytes(b64) {
    let s = String(b64).replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  function bam32(str) { // FNV-1a 32 bit
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }

  // Mã kết quả: "MB1." + base64( [phiên bản, số thứ tự phần, số ảnh (2 byte), băm danh sách ảnh (4 byte), nhãn 3 bit/ô] )
  function maHoaKetQua(phan, dsId, nhanTheoAnh, soO) {
    const n = dsId.length, oMoiAnh = soO || 24;
    const bitCount = n * oMoiAnh * 3;
    const u8 = new Uint8Array(8 + Math.ceil(bitCount / 8));
    u8[0] = 1; u8[1] = phan & 255; u8[2] = (n >> 8) & 255; u8[3] = n & 255;
    const h = bam32(dsId.join('|'));
    u8[4] = (h >>> 24) & 255; u8[5] = (h >>> 16) & 255; u8[6] = (h >>> 8) & 255; u8[7] = h & 255;
    let bit = 0;
    for (let a = 0; a < n; a++) {
      const nh = nhanTheoAnh[dsId[a]] || [];
      for (let o = 0; o < oMoiAnh; o++) {
        const v = (nh[o] || 0) & 7;
        for (let b = 2; b >= 0; b--) {
          if ((v >> b) & 1) u8[8 + (bit >> 3)] |= 1 << (7 - (bit & 7));
          bit++;
        }
      }
    }
    return 'MB1.' + bytesToB64(u8);
  }
  function giaiMaKetQua(ma, dsTheoPhan, soO) {
    const m = String(ma).trim().replace(/^.*?MB1\./s, '').replace(/[^A-Za-z0-9_-].*$/s, '');
    const u8 = b64ToBytes(m);
    if (u8.length < 8 || u8[0] !== 1) throw new Error('Mã không đúng dạng');
    const phan = u8[1], n = (u8[2] << 8) | u8[3];
    const h = ((u8[4] << 24) | (u8[5] << 16) | (u8[6] << 8) | u8[7]) >>> 0;
    const dsId = dsTheoPhan[phan];
    if (!dsId) throw new Error('Mã này thuộc phần số ' + (phan + 1) + ', không phải phần đang mở');
    if (dsId.length !== n || bam32(dsId.join('|')) !== h) throw new Error('Mã không khớp với bộ ảnh hiện có (có thể là mã của bộ ảnh khác)');
    const oMoiAnh = soO || 24;
    const nhan = {};
    let bit = 0;
    for (let a = 0; a < n; a++) {
      const arr = [];
      for (let o = 0; o < oMoiAnh; o++) {
        let v = 0;
        for (let b = 0; b < 3; b++) {
          const byte = u8[8 + (bit >> 3)] || 0;
          v = (v << 1) | ((byte >> (7 - (bit & 7))) & 1);
          bit++;
        }
        arr.push(v);
      }
      nhan[dsId[a]] = arr;
    }
    return { phan, nhan };
  }

  // ── ZIP (không nén) để xuất nhiều ảnh trong một tệp ───────────────
  const CRC_BANG = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    let c = 0xffffffff;
    for (let i = 0; i < u8.length; i++) c = CRC_BANG[(c ^ u8[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function taoZip(tep) { // tep: [{ ten, du_lieu: Uint8Array }]
    const enc = new TextEncoder();
    const phan = [], trungTam = [];
    let viTri = 0;
    const now = new Date();
    const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
    const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
    for (const f of tep) {
      const ten = enc.encode(f.ten), d = f.du_lieu, crc = crc32(d);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, d.length, true); lh.setUint32(22, d.length, true);
      lh.setUint16(26, ten.length, true); lh.setUint16(28, 0, true);
      phan.push(new Uint8Array(lh.buffer), ten, d);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true); ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true);
      ch.setUint16(28, ten.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true);
      ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, viTri, true);
      trungTam.push(new Uint8Array(ch.buffer), ten);
      viTri += 30 + ten.length + d.length;
    }
    const doDaiTT = trungTam.reduce((a, b) => a + b.length, 0);
    const eocd = new DataView(new ArrayBuffer(22));
    eocd.setUint32(0, 0x06054b50, true); eocd.setUint16(8, tep.length, true); eocd.setUint16(10, tep.length, true);
    eocd.setUint32(12, doDaiTT, true); eocd.setUint32(16, viTri, true);
    return new Blob([...phan, ...trungTam, new Uint8Array(eocd.buffer)], { type: 'application/zip' });
  }
  // đọc ZIP (không nén hoặc nén deflate) → [{ ten, du_lieu }]
  async function docZip(blob) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    const dv = new DataView(buf.buffer);
    let e = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('Tệp không phải ZIP');
    const soTep = dv.getUint16(e + 10, true);
    let p = dv.getUint32(e + 16, true);
    const dec = new TextDecoder();
    const kq = [];
    for (let k = 0; k < soTep; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const cachNen = dv.getUint16(p + 10, true), coNen = dv.getUint32(p + 20, true);
      const dTen = dv.getUint16(p + 28, true), dThem = dv.getUint16(p + 30, true), dGhi = dv.getUint16(p + 32, true);
      const viTriLH = dv.getUint32(p + 42, true);
      const ten = dec.decode(buf.subarray(p + 46, p + 46 + dTen));
      const lTen = dv.getUint16(viTriLH + 26, true), lThem = dv.getUint16(viTriLH + 28, true);
      const batDau = viTriLH + 30 + lTen + lThem;
      let d = buf.subarray(batDau, batDau + coNen);
      if (cachNen === 8) {
        const ds = new DecompressionStream('deflate-raw');
        d = new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(ds)).arrayBuffer());
      } else if (cachNen !== 0) throw new Error('Không đọc được cách nén ' + cachNen);
      if (!ten.endsWith('/')) kq.push({ ten, du_lieu: d });
      p += 46 + dTen + dThem + dGhi;
    }
    return kq;
  }

  // ── Tiện ích ───────────────────────────────────────────────────
  function canvasToBytes(cv, kieu, chatLuong) {
    return new Promise((res, rej) => cv.toBlob((b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error('Không tạo được ảnh'))), kieu || 'image/jpeg', chatLuong || 0.92));
  }
  function taiXuong(blob, tenTep) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = tenTep;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function napAnh(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('Không mở được ảnh'));
      im.src = src;
    });
  }
  function tron(mang, hat) { // xáo trộn có hạt giống (để lần nào cũng giống nhau)
    const a = mang.slice();
    let s = hat >>> 0 || 1;
    const rnd = () => ((s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5 >>> 0) / 4294967296);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function luuCuc(khoa, gt) { try { localStorage.setItem(khoa, JSON.stringify(gt)); return true; } catch (e) { return false; } }
  function docCuc(khoa, macDinh) { try { const s = localStorage.getItem(khoa); return s ? JSON.parse(s) : macDinh; } catch (e) { return macDinh; } }

  g.MBC = {
    NHAN, THU_MUC_LOP, LUOI_DUYET, TI_LE_KHUNG,
    oChuNhat, khungNhin, catO, trongDaGiac, trongVung, phanPhu, noiDaGiac, goiYNhan,
    maHoaKetQua, giaiMaKetQua, bam32, crc32, taoZip, docZip,
    canvasToBytes, taiXuong, napAnh, tron, luuCuc, docCuc,
  };
})(typeof window !== 'undefined' ? window : globalThis);
