/* 结婚好日子 · 交互 */
(function () {
  'use strict';

  var E = window.JHRZ.engine;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ── 生日选择器：公历 / 农历，三格下拉 ───────── */

  var Lunar = window.Lunar, Solar = window.Solar;
  var LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  var LUNAR_DAYS = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
  var BIRTH = {};

  function BirthPicker(el) {
    this.el = el;
    this.min = parseInt(el.getAttribute('data-min'), 10) || 1930;
    this.max = parseInt(el.getAttribute('data-max'), 10) || (new Date().getFullYear() - 16);
    this.cal = 'solar';
    this.y = '';
    this.m = '';
    this.d = '';
    this.build();
  }

  BirthPicker.prototype.build = function () {
    var uid = this.el.id;
    this.el.innerHTML =
      '<div class="birth__cal" role="group" aria-label="历法">' +
        '<button type="button" data-cal="solar" class="is-on">公历</button>' +
        '<button type="button" data-cal="lunar">农历</button>' +
      '</div>' +
      '<div class="birth__fields">' +
        '<label class="sr-only" for="' + uid + 'Y">出生年份</label>' +
        '<select id="' + uid + 'Y" data-part="y"></select>' +
        '<label class="sr-only" for="' + uid + 'M">出生月份</label>' +
        '<select id="' + uid + 'M" data-part="m"></select>' +
        '<label class="sr-only" for="' + uid + 'D">出生日</label>' +
        '<select id="' + uid + 'D" data-part="d"></select>' +
      '</div>' +
      '<p class="birth__hint" aria-live="polite"></p>';

    var self = this;
    $$('[data-cal]', this.el).forEach(function (b) {
      b.addEventListener('click', function () { self.switchCal(b.getAttribute('data-cal')); });
    });
    this.selY = $('[data-part=y]', this.el);
    this.selM = $('[data-part=m]', this.el);
    this.selD = $('[data-part=d]', this.el);
    this.hint = $('.birth__hint', this.el);

    this.selY.addEventListener('change', function () { self.y = self.selY.value; self.rebuildMonths(); self.rebuildDays(); self.update(); });
    this.selM.addEventListener('change', function () { self.m = self.selM.value; self.rebuildDays(); self.update(); });
    this.selD.addEventListener('change', function () { self.d = self.selD.value; self.update(); });

    this.rebuildYears();
    this.rebuildMonths();
    this.rebuildDays();
    this.update();
  };

  BirthPicker.prototype.rebuildYears = function () {
    var html = '<option value="">年</option>';
    for (var y = this.max; y >= this.min; y--) {
      html += '<option value="' + y + '">' + y + ' 年</option>';
    }
    this.selY.innerHTML = html;
    this.selY.value = this.y;
  };

  BirthPicker.prototype.monthList = function () {
    if (this.cal === 'solar') {
      var out = [];
      for (var i = 1; i <= 12; i++) out.push({ v: String(i), t: i + ' 月' });
      return out;
    }
    var ly = parseInt(this.y, 10) ? window.LunarYear.fromYear(parseInt(this.y, 10)) : null;
    var lp = ly ? ly.getLeapMonth() : 0;
    var arr = [];
    for (var m = 1; m <= 12; m++) {
      arr.push({ v: String(m), t: LUNAR_MONTHS[m - 1] + '月' });
      if (lp === m) arr.push({ v: String(-m), t: '闰' + LUNAR_MONTHS[m - 1] + '月' });
    }
    return arr;
  };

  BirthPicker.prototype.rebuildMonths = function () {
    var list = this.monthList();
    var html = '<option value="">月</option>';
    list.forEach(function (o) { html += '<option value="' + o.v + '">' + o.t + '</option>'; });
    this.selM.innerHTML = html;
    var stillThere = list.some(function (o) { return o.v === this.m; }, this);
    if (!stillThere) this.m = '';
    this.selM.value = this.m;
  };

  BirthPicker.prototype.dayCount = function () {
    var y = parseInt(this.y, 10), m = parseInt(this.m, 10);
    if (!y || !m) return 31;
    if (this.cal === 'solar') return new Date(y, m, 0).getDate();
    try {
      var ly = window.LunarYear.fromYear(y);
      var lm = ly.getMonth(m);
      return lm ? lm.getDayCount() : 30;
    } catch (e) { return 30; }
  };

  BirthPicker.prototype.rebuildDays = function () {
    var n = this.dayCount();
    var html = '<option value="">日</option>';
    for (var i = 1; i <= n; i++) {
      var label = this.cal === 'solar' ? i + ' 日' : LUNAR_DAYS[i - 1];
      html += '<option value="' + i + '">' + label + '</option>';
    }
    this.selD.innerHTML = html;
    if (parseInt(this.d, 10) > n) this.d = '';
    this.selD.value = this.d;
  };

  BirthPicker.prototype.switchCal = function (cal) {
    if (cal === this.cal) return;
    var current = this.get();
    this.cal = cal;
    $$('[data-cal]', this.el).forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-cal') === cal);
    });
    if (current) {
      // 换历法时保持同一天
      var l = Solar.fromYmd(current.y, current.m, current.d).getLunar();
      if (cal === 'lunar') { this.y = String(l.getYear()); this.m = String(l.getMonth()); this.d = String(l.getDay()); }
      else { this.y = String(current.y); this.m = String(current.m); this.d = String(current.d); }
    }
    this.rebuildYears();
    this.rebuildMonths();
    this.rebuildDays();
    this.update();
  };

  BirthPicker.prototype.value = function () {
    if (!this.y || !this.m || !this.d) return null;
    var y = parseInt(this.y, 10), m = parseInt(this.m, 10), d = parseInt(this.d, 10);
    if (this.cal === 'solar') return { y: y, m: m, d: d, solar: Solar.fromYmd(y, m, d) };
    var lu = Lunar.fromYmd(y, m, d);
    var s = lu.getSolar();
    return { y: s.getYear(), m: s.getMonth(), d: s.getDay(), solar: s };
  };

  BirthPicker.prototype.get = function () {
    var v = this.value();
    if (!v) return null;
    var date = v.solar.getYear() + '-' + pad2(v.solar.getMonth()) + '-' + pad2(v.solar.getDay());
    var lu = v.solar.getLunar();
    return {
      date: date,
      calendar: this.cal,
      solarText: v.solar.getYear() + ' 年 ' + v.solar.getMonth() + ' 月 ' + v.solar.getDay() + ' 日',
      lunarText: lu.getMonthInChinese() + '月' + lu.getDayInChinese(),
      shengxiao: lu.getYearShengXiao()
    };
  };

  BirthPicker.prototype.set = function (dateStr) {
    var mm = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateStr || '');
    if (!mm) return;
    this.cal = 'solar';
    $$('[data-cal]', this.el).forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-cal') === 'solar');
    });
    this.y = String(+mm[1]);
    this.m = String(+mm[2]);
    this.d = String(+mm[3]);
    this.rebuildYears();
    this.rebuildMonths();
    this.rebuildDays();
    this.update();
  };

  BirthPicker.prototype.clear = function () {
    this.cal = 'solar';
    $$('[data-cal]', this.el).forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-cal') === 'solar');
    });
    this.y = this.m = this.d = '';
    this.rebuildMonths();
    this.rebuildDays();
    this.update();
  };

  BirthPicker.prototype.update = function () {
    this.el.classList.toggle('is-error', false);
    var v = this.get();
    if (!v) {
      this.hint.textContent = this.cal === 'solar' ? '选公历年月日，也可以切到农历' : '选农历年月日，自动换算公历';
      return;
    }
    this.hint.innerHTML = this.cal === 'solar'
      ? v.solarText + ' · 属' + v.shengxiao + ' · 农历' + v.lunarText
      : '农历' + v.lunarText + ' · 属' + v.shengxiao + ' · 公历' + v.solarText.replace(/\s/g, '');
  };

  /* ── 初始化控件 ───────────────────────────── */

  function hourOptions(unknownText) {
    var START = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
    var html = '<option value="-1">' + unknownText + '</option>';
    E.SHICHEN.forEach(function (s, i) {
      var range = pad2(START[i]) + '–' + pad2((START[i] + 2) % 24);
      html += '<option value="' + i + '">' + s.label + ' ' + range + '</option>';
    });
    return html;
  }

  function initSelects() {
    var ids = ['groomHour', 'brideHour', 'gpaHour', 'gmaHour', 'bpaHour', 'bmaHour'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = hourOptions('不确定');
      el.value = '-1';
    });

    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth() + 1;
    var startY = $('#startYear'), startM = $('#startMonth');
    var yHtml = '';
    for (var i = 0; i <= 4; i++) yHtml += '<option value="' + (y + i) + '">' + (y + i) + ' 年</option>';
    startY.innerHTML = yHtml;
    var mHtml = '';
    for (var k = 1; k <= 12; k++) mHtml += '<option value="' + k + '">' + k + ' 月</option>';
    startM.innerHTML = mHtml;

    // 默认从下个月起
    startY.value = String(m === 12 ? y + 1 : y);
    startM.value = String(m === 12 ? 1 : m + 1);

    $$('.birth').forEach(function (el) {
      var key = el.getAttribute('data-key');
      BIRTH[key] = new BirthPicker(el);
    });
  }

  /* ── 今日通书 ─────────────────────────────── */

  function renderToday() {
    try {
      var a = E.almanac();
      var parts = a.date.split('-');
      $('#todayDate').textContent = parts[0] + '.' + parts[1] + '.' + parts[2];
      $('#todayLunarDay').textContent = a.lunarText.replace(/^.*月/, '');
      var mm = /([闰]?[正二三四五六七八九十冬腊]月)/.exec(a.lunarText);
      $('#todayLunar').textContent = (mm ? mm[1] : '') + ' · ' + a.yearGZ + '年';
      $('#todayGZ').textContent = a.dayGZ + '日';
      $('#todayShen').textContent = a.zhiXing + '日 · ' + a.tianShen + '·' + a.tianShenType;
      $('#todayYi').textContent = a.yi.slice(0, 4).join('　') || '—';
      $('#todayJi').textContent = a.ji.slice(0, 4).join('　') || '—';
      $('#todayFoot').innerHTML = '<span>' + chongText(a.chongDesc) + '　煞' + a.sha + '</span><span>' + (a.jieqi || '二十八宿 · ' + a.xiu) + '</span>';
    } catch (err) {
      console.error(err);
    }
  }

  /* ── 表单读取 ─────────────────────────────── */

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function hourVal(id) { var v = val(id); return v === '' || v === '-1' ? -1 : parseInt(v, 10); }

  function readForm() {    var spanBtn = $('.segmented button.is-on');
    var months = spanBtn ? parseInt(spanBtn.getAttribute('data-months'), 10) : 12;
    var b = function (key) {
      var p = BIRTH[key];
      return p && p.get() ? p.get().date : '';
    };
    return {
      groom: { name: val('groomName'), date: b('groom'), hour: hourVal('groomHour') },
      bride: { name: val('brideName'), date: b('bride'), hour: hourVal('brideHour') },
      parents: [
        { label: '新郎父亲', date: b('gpa'), hour: hourVal('gpaHour') },
        { label: '新郎母亲', date: b('gma'), hour: hourVal('gmaHour') },
        { label: '新娘父亲', date: b('bpa'), hour: hourVal('bpaHour') },
        { label: '新娘母亲', date: b('bma'), hour: hourVal('bmaHour') }
      ],
      range: { startYear: parseInt(val('startYear'), 10), startMonth: parseInt(val('startMonth'), 10), months: months },
      prefs: {
        weekend: $('#prefWeekend').checked,
        avoidLunar7: $('#prefAvoid7').checked,
        avoidLunar6: $('#prefAvoid6').checked
      }
    };
  }

  /* ── 分享链接：把输入编码进 hash，打开即还原 ── */

  function encodeState(input) {
    var payload = {
      g: [input.groom.date, input.groom.hour, input.groom.name || ''],
      b: [input.bride.date, input.bride.hour, input.bride.name || ''],
      p: (input.parents || []).map(function (x) { return [x.date || '', x.hour]; }),
      r: [input.range.startYear, input.range.startMonth, input.range.months],
      f: [input.prefs.weekend ? 1 : 0, input.prefs.avoidLunar7 ? 1 : 0, input.prefs.avoidLunar6 ? 1 : 0]
    };
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(payload)))); } catch (e) { return ''; }
  }

  function applyState(enc) {
    var d;
    try { d = JSON.parse(decodeURIComponent(escape(atob(enc)))); } catch (e) { return false; }
    if (!d || !d.g || !d.b) return false;
    if (d.g[0] && BIRTH.groom) BIRTH.groom.set(d.g[0]);
    if (d.b[0] && BIRTH.bride) BIRTH.bride.set(d.b[0]);
    if (d.g[2]) $('#groomName').value = d.g[2];
    if (d.b[2]) $('#brideName').value = d.b[2];
    $('#groomHour').value = String(d.g[1] == null ? -1 : d.g[1]);
    $('#brideHour').value = String(d.b[1] == null ? -1 : d.b[1]);
    var keys = ['gpa', 'gma', 'bpa', 'bma'];
    (d.p || []).forEach(function (x, i) {
      if (!x || !x[0] || !BIRTH[keys[i]]) return;
      BIRTH[keys[i]].set(x[0]);
      var sel = document.getElementById(keys[i] + 'Hour');
      if (sel) sel.value = String(x[1] == null ? -1 : x[1]);
      $('#parentsBox').open = true;
    });
    if (d.r) {
      $('#startYear').value = String(d.r[0]);
      $('#startMonth').value = String(d.r[1]);
      $$('#spanGroup button').forEach(function (b) {
        b.classList.toggle('is-on', parseInt(b.getAttribute('data-months'), 10) === d.r[2]);
      });
    }
    if (d.f) {
      $('#prefWeekend').checked = !!d.f[0];
      $('#prefAvoid7').checked = !!d.f[1];
      $('#prefAvoid6').checked = !!d.f[2];
    }
    return true;
  }

  function shareURL() {
    var enc = encodeState(readForm());
    if (!enc) return location.href;
    return location.origin && location.origin !== 'null'
      ? location.origin + location.pathname + '#q=' + enc
      : location.href.split('#')[0] + '#q=' + enc;
  }

  function showError(msg) {
    var box = $('#formError');
    box.textContent = msg;
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearError() {
    $('#formError').hidden = true;
    $$('.is-error').forEach(function (el) { el.classList.remove('is-error'); el.removeAttribute('aria-invalid'); });
  }

  function fieldError(target, msg) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (el) {
      el.classList.add('is-error');
      el.setAttribute('aria-invalid', 'true');
      var focusable = el.matches('select, input') ? el : el.querySelector('select, input');
      if (focusable) focusable.focus({ preventScroll: true });
      var r = el.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + r.top - 180, behavior: 'smooth' });
    }
    showError(msg);
  }

  /* ── 渲染结果 ─────────────────────────────── */

  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var RANK = ['首选', '次选', '备选'];

  function chongText(desc) {
    var m = /\((.*?)\)(.)/.exec(desc || '');
    return m ? '冲' + m[2] + '（' + m[1] + '）' : '冲' + (desc || '');
  }

  function renderExtras(ex, res) {
    var box = $('#extras');
    if (!ex) { box.hidden = true; return; }

    function fmt(o) {
      if (!o) return null;
      var p = o.date.split('-');
      return { m: +p[1], d: +p[2], w: o.weekText.replace('星期', '周'), lunar: o.lunarShort, gz: o.dayGZ };
    }

    var wed = fmt(ex.wedding);
    var eng = fmt(ex.engagement);
    var lic = (ex.license || []).map(fmt);
    var hui = fmt(ex.huiMen);
    var mov = fmt(ex.moveIn);

    var step = function (no, title, main, note, cls) {
      return '<li class="five__item ' + (cls || '') + '">' +
        '<span class="five__no">' + no + '</span>' +
        '<span class="five__title">' + title + '</span>' +
        '<span class="five__date">' + (main || '未找到') + '</span>' +
        '<span class="five__note">' + (note || '') + '</span>' +
        '</li>';
    };

    var licText = lic.length ? lic.map(function (x) {
      return '<span class="five__two"><b>' + x.m + ' 月 ' + x.d + ' 日</b><em>' + x.w + '</em></span>';
    }).join('') : '';

    box.innerHTML =
      '<h3 class="extras__title">婚事五件，一起排<span>都按首选婚礼日 ' + wed.m + ' 月 ' + wed.d + ' 日 倒推或顺延</span></h3>' +
      '<ol class="five">' +
        step('一', '订婚', eng ? eng.m + ' 月 ' + eng.d + ' 日' : '', eng ? eng.w + ' · 宜纳采订盟' : '时间太紧，可省') +
        step('二', '领证', licText, '只排工作日，不冲新人') +
        step('三', '婚礼', wed.m + ' 月 ' + wed.d + ' 日', wed.w + ' · 农历' + wed.lunar, 'is-wed') +
        step('四', '回门', hui.m + ' 月 ' + hui.d + ' 日', hui.w + ' · 婚后第三天') +
        step('五', '入宅', mov ? mov.m + ' 月 ' + mov.d + ' 日' : '', mov ? mov.w + ' · 宜入宅移徙' : '若先住旧房，可省') +
      '</ol>' +
      '<div class="extra extra--full">' +
        '<span class="extra__label">请柬上的日期写法</span>' +
        '<div class="extra__invite" id="inviteText">' + esc(res.inviteText) + '</div>' +
        '<button type="button" class="link-btn" id="copyInvite">复制这句</button>' +
      '</div>' +
      '<div class="invite-setup">' +
        '<span class="extra__label">做一张电子请柬</span>' +
        '<div class="invite-setup__row">' +
          '<input type="text" id="venueName" placeholder="酒店 / 场地名称（选填）" autocomplete="off">' +
          '<input type="text" id="venueAddr" placeholder="地址（选填）" autocomplete="off">' +
          '<button type="button" class="btn btn--primary" id="makeInvite">生成请柬</button>' +
        '</div>' +
      '</div>';

    box.hidden = false;

    var btn = $('#copyInvite');
    if (btn) {
      btn.addEventListener('click', function () {
        var text = res.inviteText;
        var done = function () { flash(btn, '已复制'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
        } else { fallbackCopy(text); done(); }
      });
    }

    $('#makeInvite').addEventListener('click', function () {
      var payload = {
        g: (window.__lastInput.groom.name || '新郎'),
        b: (window.__lastInput.bride.name || '新娘'),
        date: res.inviteText,
        lunar: '农历' + wed.lunar,
        flow: (res.flow || []),
        venue: (val('venueName') || ''),
        addr: (val('venueAddr') || '')
      };
      var hash = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      window.open('invite.html#d=' + hash, '_blank');
    });
  }

  function renderBazi(people) {
    var strip = $('#baziStrip');
    strip.innerHTML = people.map(function (p) {
      var bazi = p.baziText.replace(/\s—\s*$/, '');
      return '<div class="bazi-chip"><b>' + esc(p.label) + '</b><span>' + esc(bazi) + '</span>' +
        '<span class="gray">' + esc(p.shengxiao) + ' · 日主' + esc(p.dayGan) + esc(p.dayGanWuXing) + '</span></div>';
    }).join('');
  }

  /* ── 迎亲流程 ─────────────────────────────── */

  function toMin(range) {
    var m = /(\d{1,2}):(\d{2})/.exec(range || '');
    return m ? (+m[1]) * 60 + (+m[2]) : 8 * 60;
  }

  function fmtTime(min) {
    min = ((min % 1440) + 1440) % 1440;
    return pad2(Math.floor(min / 60)) + ':' + pad2(min % 60);
  }

  function buildSchedule(p) {
    var h = p.hours || [];
    if (h.length < 2) return [];
    var a = toMin(h[0].range), b = toMin(h[1].range);
    return [
      { t: a - 60, title: '化妆、准备', note: '新娘妆造、伴娘到位', ji: false },
      { t: a, title: '迎亲出发', note: '吉时 · ' + h[0].label + ' ' + h[0].range, ji: true },
      { t: a + 40, title: '到女方家 · 堵门', note: '按路程微调' , ji: false },
      { t: a + 75, title: '敬茶、出门', note: '改口、拿嫁妆', ji: false },
      { t: b, title: '仪式开始', note: '吉时 · ' + h[1].label + ' ' + h[1].range, ji: true },
      { t: b + 40, title: '开席', note: '按酒店上菜速度微调', ji: false },
      { t: b + 150, title: '送客、回礼', note: '长辈先走，留人收尾', ji: false }
    ];
  }

  function scheduleHTML(p, forPrint) {
    var items = buildSchedule(p);
    if (!items.length) return '';
    var rows = items.map(function (it) {
      return '<li class="' + (it.ji ? 'is-ji' : '') + '">' +
        '<span class="flow__time">' + fmtTime(it.t) + '</span>' +
        '<span class="flow__dot" aria-hidden="true"></span>' +
        '<span class="flow__body"><b>' + esc(it.title) + '</b><em>' + esc(it.note) + '</em></span>' +
        '</li>';
    }).join('');
    if (forPrint) {
      return '<h3 class="print-flow__title">迎亲流程 · ' + p.m + ' 月 ' + p.d + ' 日（' + p.weekText + '）</h3>' +
        '<ul class="flow flow--print">' + rows + '</ul>' +
        '<p class="print-flow__note">时间按当天吉时排出，可按路程、酒店上菜速度前后微调。' + p.chongDesc + ' 煞' + p.sha + '，迎亲路线尽量避开煞方。</p>';
    }
    return '<h3 class="flow__title">当天怎么走<span>' + p.m + ' 月 ' + p.d + ' 日 · ' + p.hours[0].label + '出发，' + p.hours[1].label + '仪式</span></h3>' +
      '<ul class="flow">' + rows + '</ul>';
  }

  function renderFlow(p) {
    var box = $('#flow');
    var html = scheduleHTML(p, false);
    if (!html) { box.hidden = true; return; }
    box.innerHTML = html;
    box.hidden = false;
  }

  /* ── 给长辈看的一页 ───────────────────────── */

  function openElder(res) {
    var s = res.stats;
    var rows = res.picks.map(function (p) {
      return '<tr><td>' + p.m + ' 月 ' + p.d + ' 日</td><td>' + p.lunarShort + '</td><td>' +
        p.weekText.replace('星期', '周') + '</td><td>' + p.tianShen + ' · ' + (p.tianShenLuck === '吉' ? '黄道' : '黑道') + '</td></tr>';
    }).join('');

    var list = res.picks.map(function (p, i) {
      return (i + 1) + '. ' + p.m + ' 月 ' + p.d + ' 日（' + p.weekText.replace('星期', '周') + '，农历' + p.lunarShort + '）';
    }).join('\n');

    var plain = '爸、妈，日子按老规矩排了三个，都避开了跟咱们家生肖相冲的日子，通书上也写着宜嫁娶。\n' +
      list + '\n' +
      '这一年 ' + s.scanned + ' 天，先划掉 ' + (s.yiJiReject + s.chongReject + s.tabooReject) + ' 天：忌嫁娶的、冲生肖的、四离四绝这类凶日，都没算。\n' +
      '你们看看哪个月方便，酒店那边我去问。';

    $('#elderBody').innerHTML =
      '<h3 class="elder__title">给长辈看的一页</h3>' +
      '<p class="elder__lead">不是算命，是照通书挑日子。三条依据，您一看就明白。</p>' +
      '<div class="elder__block"><b>一、没排八字，也没说谁克谁</b>' +
        '<p>用的是《协纪辨方书》里看日子的规矩：哪些日子通书标着不宜嫁娶，哪些日子冲家里人的生肖。填的只是生日和属相。</p></div>' +
      '<div class="elder__block"><b>二、这一年划掉了 ' + (s.yiJiReject + s.chongReject + s.tabooReject) + ' 天</b>' +
        '<p>通书忌嫁娶 ' + s.yiJiReject + ' 天，冲新人或父母生肖 ' + s.chongReject + ' 天，月破、四离四绝这类凶日 ' + s.tabooReject + ' 天。剩下的才拿来比。</p></div>' +
      '<div class="elder__block"><b>三、留下的三个日子</b>' +
        '<table class="elder__table"><thead><tr><th>日期</th><th>农历</th><th>星期</th><th>值神</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<p>三天都写着宜嫁娶，也都没冲咱们两家的生肖。先定哪个，看酒店档期和亲戚方便。</p></div>' +
      '<p class="elder__sign">—— 孩子们</p>';

    window.__elderText = plain;
    $('#elderModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeElder() {
    $('#elderModal').hidden = true;
    document.body.style.overflow = '';
  }

  /* ── 分享海报 ─────────────────────────────── */

  function drawPoster(res, input) {
    var W = 1080, H = 1440;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var x = c.getContext('2d');
    var CREAM = '#F8EFDC', GOLD = '#E0BE7E';

    var g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#C0301F');
    g.addColorStop(1, '#96190F');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);

    x.globalAlpha = .035;
    x.strokeStyle = '#F8EFDC';
    x.lineWidth = 2;
    for (var i = 0; i < 9; i++) {
      x.beginPath();
      x.arc(140 + (i % 3) * 400, 240 + Math.floor(i / 3) * 430, 170, 0, Math.PI * 2);
      x.stroke();
    }
    x.globalAlpha = 1;

    x.strokeStyle = GOLD;
    x.lineWidth = 4;
    x.strokeRect(46, 46, W - 92, H - 92);
    x.lineWidth = 1.5;
    x.strokeRect(62, 62, W - 124, H - 124);

    x.textAlign = 'center';
    x.fillStyle = CREAM;
    x.font = '120px "KaiTi","STKaiti",serif';
    x.fillText('囍', W / 2, 218);

    x.font = '56px "KaiTi","STKaiti",serif';
    x.fillText('我们挑了三个日子', W / 2, 300);

    var names = [];
    if (input && input.groom && input.groom.name) names.push(input.groom.name);
    if (input && input.bride && input.bride.name) names.push(input.bride.name);
    if (names.length) {
      x.fillStyle = GOLD;
      x.font = '30px "KaiTi","STKaiti",serif';
      x.fillText(names.join('  ·  '), W / 2, 348);
    }

    res.picks.slice(0, 3).forEach(function (p, idx) {
      var y = 400 + idx * 272;
      x.fillStyle = 'rgba(248,239,220,.07)';
      x.fillRect(96, y, W - 192, 232);
      x.strokeStyle = 'rgba(224,190,126,.45)';
      x.lineWidth = 1;
      x.strokeRect(96, y, W - 192, 232);

      x.textAlign = 'left';
      x.fillStyle = CREAM;
      x.font = '86px Georgia,"Times New Roman",serif';
      x.fillText(p.d, 128, y + 132);
      var dayWidth = x.measureText(p.d).width;
      x.font = '34px "KaiTi","STKaiti",serif';
      x.fillText('日', 128 + dayWidth + 10, y + 130);

      x.fillStyle = GOLD;
      x.font = '28px "KaiTi","STKaiti",serif';
      x.fillText(p.m + ' 月 · ' + p.weekText + ' · 农历' + p.lunarShort, 130, y + 190);

      x.textAlign = 'right';
      x.fillStyle = CREAM;
      x.font = '34px "KaiTi","STKaiti",serif';
      x.fillText(['首选', '次选', '备选'][idx], W - 130, y + 96);
      x.fillStyle = GOLD;
      x.font = '26px "KaiTi","STKaiti",serif';
      x.fillText(p.grade.label + ' · ' + p.score, W - 130, y + 140);
    });

    x.textAlign = 'left';
    x.fillStyle = GOLD;
    x.font = '34px "KaiTi","STKaiti",serif';
    x.fillText('结 婚 好 日 子', 100, H - 146);
    x.fillStyle = 'rgba(248,239,220,.62)';
    x.font = '19px "KaiTi","STKaiti",serif';
    x.fillText('依通书择日 · 民俗参考，不作命理预测', 100, H - 108);

    // 右下角二维码：扫码回到这一页，带上你们的生日
    try {
      var qr = window.qrcode(0, 'M');
      qr.addData(location.href);
      qr.make();
      var n = qr.getModuleCount();
      var cell = Math.max(2, Math.floor(120 / n));
      var size = n * cell;
      var qx = W - 92 - size;
      var qy = H - 92 - size;
      x.fillStyle = '#FBF2E0';
      x.fillRect(qx - 12, qy - 12, size + 24, size + 24);
      x.fillStyle = '#7E110C';
      for (var qi = 0; qi < n; qi++) {
        for (var qj = 0; qj < n; qj++) {
          if (qr.isDark(qj, qi)) x.fillRect(qx + qj * cell, qy + qi * cell, cell, cell);
        }
      }
      x.fillStyle = 'rgba(248,239,220,.66)';
      x.font = '17px "KaiTi","STKaiti",serif';
      x.textAlign = 'right';
      x.fillText('扫码，给家里人算一算', qx + size + 12, qy - 22);
    } catch (e) { /* 无二维码也不影响海报 */ }

    return c;
  }

  function openPoster(res, input) {
    var canvas = drawPoster(res, input);
    var url = canvas.toDataURL('image/png');
    var img = $('#posterImg');
    img.src = url;
    var dl = $('#posterDownload');
    dl.href = url;
    dl.setAttribute('download', '结婚好日子-三个日子.png');
    $('#posterModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closePoster() {
    $('#posterModal').hidden = true;
    document.body.style.overflow = '';
  }


  function renderYearmap(res) {
    var cal = res.calendar || [];
    if (!cal.length) return;
    var byMonth = {};
    var order = [];
    cal.forEach(function (c) {
      var k = c.date.slice(0, 7);
      if (!byMonth[k]) { byMonth[k] = {}; order.push(k); }
      byMonth[k][c.d] = c;
    });

    var html = '<div class="yearmap__head">' +
      '<h3>这 ' + cal.length + ' 天，都在这张表上</h3>' +
      '<div class="yearmap__legend">' +
        '<span class="lg"><i class="lg__sw lg__sw--out"></i>已划掉</span>' +
        '<span class="lg"><i class="lg__sw lg__sw--ok"></i>可挑</span>' +
        '<span class="lg"><i class="lg__sw lg__sw--pick"></i>选中的三天</span>' +
      '</div></div><p class="yearmap__hint">左右滑动可以看全年</p><div class="yearmap__scroll"><div class="ym">';

    html += '<span class="ym__corner"></span>';
    for (var d = 1; d <= 31; d++) html += '<span class="ym__col">' + d + '</span>';

    order.forEach(function (k) {
      var parts = k.split('-');
      html += '<span class="ym__month">' + parts[0].slice(2) + '.' + pad2(parseInt(parts[1], 10)) + '</span>';
      for (var day = 1; day <= 31; day++) {
        var c = byMonth[k][day];
        if (!c) { html += '<span class="ym-cell is-blank"></span>'; continue; }
        var cls = c.pick ? 'is-pick' : (c.ok ? 'is-ok' : 'is-out');
        var tip = c.date + ' · ' + c.lunarShort + (c.pick ? ' · ' + RANK[c.pick - 1] + ' · ' + c.score + ' 分' : c.ok ? ' · 可挑 · ' + c.score + ' 分' : ' · ' + (c.why || '不宜'));
        html += '<span class="ym-cell ' + cls + '" data-tip="' + esc(tip) + '" title="' + esc(tip) + '">' + (c.pick ? day : '') + '</span>';
      }
    });
    html += '</div></div><p class="yearmap__cap" id="ymCaption">点一下格子，看这天为什么被划掉，或者为什么留下。</p>';

    var box = $('#yearmap');
    box.innerHTML = html;
    box.hidden = false;

    // 整张图当一张图来读：给读屏一句摘要，格子本身不逐个朗读
    var grid = box.querySelector('.ym');
    var pickText = (res.picks || []).map(function (p) { return p.m + ' 月 ' + p.d + ' 日'; }).join('、');
    grid.setAttribute('role', 'img');
    grid.setAttribute('aria-label', '全年 ' + cal.length + ' 天里选出三个日子：' + pickText + '。灰边为已划掉，浅红为可挑，实红为入选。');
    $$('.ym-cell', grid).forEach(function (c) { c.setAttribute('aria-hidden', 'true'); });
  }

  function renderCard(p, idx) {
    var rankTxt = RANK[idx] || '备选';
    var hours = (p.hours || []).map(function (h) {
      return '<div class="hour"><b>' + h.label + '</b><i>' + h.range + '</i><span class="use">' + esc(h.use) + '</span></div>';
    }).join('');

    var reasons = (p.reasons || []).map(function (rr) {
      return '<li class="' + (rr.plus ? '' : 'is-minus') + '">' + esc(rr.text) + '</li>';
    }).join('');

    var breakdown = (p.breakdown || []).map(function (b) {
      return '<li><span>' + esc(b.text) + '</span><b class="' + (b.w >= 0 ? 'up' : 'down') + '">' +
        (b.w >= 0 ? '+' : '') + b.w + '</b></li>';
    }).join('');

    var yiAll = p.yi.join('、');
    var jiAll = p.ji.join('、');
    var yiMore = p.yi.length > 5 ? '<i class="more" title="' + esc(yiAll) + '">…</i>' : '';
    var jiMore = p.ji.length > 5 ? '<i class="more" title="' + esc(jiAll) + '">…</i>' : '';

    return '' +
      '<article class="card reveal' + (idx === 0 ? ' card--first' : '') + '" aria-label="' + rankTxt + '：' + p.date + '">' +
        '<div class="card__meta"><span class="card__rank">' + rankTxt + '</span><span>' + (p.daysAway > 0 ? '还有 ' + p.daysAway + ' 天' : '') + '</span></div>' +
        '<div class="card__date">' +
          '<span class="card__ym">' + p.y + ' 年 ' + p.m + ' 月</span>' +
          '<span class="card__day">' + p.d + '<small>日</small></span>' +
          '<span class="card__week">' + p.weekText + '</span>' +
        '</div>' +
        '<div class="card__lunar">农历' + p.lunarText.replace(/^二〇[〇一二三四五六七八九]+年/, '') + '</div>' +
        '<div class="card__gz">' + p.yearGZ + '年 · ' + p.monthGZ + '月 · ' + p.dayGZ + '日 · ' + p.zhiXing + '日</div>' +
        '<div class="card__seal" aria-hidden="true"><b>' + p.grade.label + '</b><i>' + p.score + '</i></div>' +
        '<ul class="card__reasons">' + reasons + '</ul>' +
        '<div class="card__yiji">' +
          '<div class="yiji"><span class="yiji__tag yiji__tag--yi">宜</span><span class="yiji__list" title="' + esc(yiAll) + '">' + esc(p.yi.slice(0, 5).join('　')) + yiMore + '</span></div>' +
          '<div class="yiji"><span class="yiji__tag yiji__tag--ji">忌</span><span class="yiji__list" title="' + esc(jiAll) + '">' + esc(p.ji.slice(0, 5).join('　')) + jiMore + '</span></div>' +
        '</div>' +
        '<div class="card__hours"><div class="card__hours-title">当日吉时<span>只列白天的时辰</span></div><div class="hours">' + hours + '</div></div>' +
        '<details class="card__break"><summary>评分明细（满分 99）</summary><ul>' +
          '<li><span>基础分</span><b class="up">62</b></li>' + breakdown +
        '</ul></details>' +
        '<div class="card__foot">值神' + p.tianShen + '（' + (p.tianShenLuck === '吉' ? '黄道' : '黑道') + '）· ' + chongText(p.chongDesc) + ' 煞' + p.sha + ' · ' + p.nayin + '</div>' +
      '</article>';
  }

  function renderAlts(alts) {
    var box = $('#alts');
    box.innerHTML = alts.map(function (a) {
      return '<div class="alt-row"><b>' + a.date.replace(/-/g, '.') + '</b>' +
        '<span class="alt-week">' + a.weekText + '</span>' +
        '<span class="alt-lunar">' + a.lunarShort + '</span>' +
        '<span class="alt-gz">' + a.dayGZ + '日</span>' +
        '<span class="alt-score">' + a.score + '</span></div>';
    }).join('');
  }

  function renderResult(res, ex) {
    var picks = res.picks;
    if (!picks.length) {
      showError('这一年里没排出合适的日子，试着把起始月份往后挪一点，或者少填一两位长辈的生日。');
      return;
    }

    var s = res.stats;
    var r = res.range || {};
    var cn = function (d) {
      var p = d.split('-');
      return (+p[0]) + ' 年 ' + (+p[1]) + ' 月 ' + (+p[2]) + ' 日';
    };
    var lede = '从 ' + cn(r.start) + ' 到 ' + cn(r.end) + '，逐日排过一遍。';
    $('#resultLede').textContent = lede;

    var note = $('#resultNote');
    var notes = [];
    if (r.adjustReason === 'past') {
      notes.push('你选的月份已经过去，已从能办婚礼的最早日期开始排。');
    }
    if (res.relaxLevel > 0) {
      notes.push('这一年好日子偏少，已适度放宽「冲父母生肖」等次要条件，只在理由里标注，不再直接排除。');
    }
    note.hidden = notes.length === 0;
    note.textContent = notes.join('');

    $('#resultTitle').textContent = picks.length >= 3 ? '三个日子' : picks.length + ' 个日子';

    var excluded = s.yiJiReject + s.chongReject + s.tabooReject;
    $('#resultStats').innerHTML =
      '<div class="stat"><b>' + s.scanned + '</b><span>天逐日排过</span></div>' +
      '<div class="stat"><b>' + excluded + '</b><span>天被划掉</span></div>' +
      '<div class="stat"><b>' + res.candidateCount + '</b><span>天可挑</span></div>' +
      '<div class="stat stat--pick"><b>' + picks.length + '</b><span>天入选</span></div>';
    $('#statsFoot').textContent = '划掉的原因：通书忌嫁娶 ' + s.yiJiReject + ' 天 · 冲新人或父母生肖 ' + s.chongReject + ' 天 · 凶日 ' + s.tabooReject + ' 天';

    renderBazi(res.people);

    var cards = $('#cards');
    cards.innerHTML = picks.map(renderCard).join('');

    var mainPick = picks[0];
    res.inviteText = mainPick.y + ' 年 ' + mainPick.m + ' 月 ' + mainPick.d + ' 日（' + mainPick.weekText + '，农历' + mainPick.lunarShort + '）';
    res.flow = buildSchedule(mainPick).map(function (it) { return { t: fmtTime(it.t), title: it.title }; });
    renderExtras(ex, res);
    renderFlow(picks[0]);
    renderYearmap(res);
    renderAlts(res.alternates || []);

    var altCount = (res.alternates || []).length;
    var altBtn = $('#toggleAlts');
    altBtn.dataset.count = altCount;
    altBtn.textContent = altCount ? '看另外 ' + altCount + ' 个备选日子' : '没有更多备选了';
    altBtn.disabled = !altCount;
    altBtn.setAttribute('aria-expanded', 'false');
    $('#alts').hidden = true;

    var box = $('#results');
    box.hidden = false;

    // 结果出现后，它成为「其二」，后面的章节顺延，避免首次访问时编号断档
    var noMethod = $('#noMethod'), noFaq = $('#noFaq');
    if (noMethod) noMethod.textContent = '其三';
    if (noFaq) noFaq.textContent = '其四';

    // 依次浮现
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $$('.card', cards).forEach(function (el, i) {
      if (reduce) { el.classList.add('is-in'); return; }
      setTimeout(function () { el.classList.add('is-in'); }, 60 + i * 110);
    });

    box.scrollIntoView({ behavior: 'smooth', block: 'start' });

    window.__lastResult = res;
    window.__extras = ex;
    window.__lastInput = readForm();

    try { history.replaceState(null, '', shareURL()); } catch (e) { /* file:// 下可能不允许 */ }
    $('#quickActions').hidden = false;

    // 打印版帖头
    var inp = window.__lastInput;
    var now = new Date();
    var stamp = now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日';
    var who = [];
    if (inp.groom.name) who.push('新郎 ' + inp.groom.name);
    if (inp.bride.name) who.push('新娘 ' + inp.bride.name);
    $('#printHead').innerHTML =
      '<div class="print-head__brand"><span class="brand__seal brand__seal--small">合</span><span>结婚好日子</span></div>' +
      '<div class="print-head__title">择日帖</div>' +
      '<div class="print-head__meta">' + (who.length ? who.join(' · ') + '<br>' : '') + '合六人生辰，择三个吉日<br>' + stamp + ' 制</div>';
    $('#printFoot').innerHTML =
      '<span>依《协纪辨方书》通书规则筛选，民俗参考，不作命理预测。</span>' +
      '<span>结婚好日子 · ' + stamp + '</span>';

    // 帖第二页：迎亲流程
    var pf = document.getElementById('printFlow');
    if (pf) pf.innerHTML = scheduleHTML(picks[0], true);

    // 帖上的备婚时间表（只在打印时出现）
    if (window.__extras && window.__extras.license.length) {
      var w0 = window.__lastResult.picks[0].date;
      var wd = new Date(w0 + 'T12:00:00');
      var plan = [
        [180, '订酒店'],
        [120, '拍婚纱'],
        [90, '定司仪'],
        [60, '发请帖'],
        [30, '试妆试菜'],
        [7, '确认桌数']
      ];
      var items = plan.filter(function (x) {
        var d = new Date(wd.getTime() - x[0] * 86400000);
        return d.getTime() > Date.now();
      }).map(function (x) {
        var d = new Date(wd.getTime() - x[0] * 86400000);
        return '<li><b>T-' + x[0] + '</b><span>' + (d.getMonth() + 1) + '.' + d.getDate() + '</span>' + x[1] + '</li>';
      }).join('');
      var lic = window.__extras.license.map(function (d) {
        var p = d.date.split('-');
        return (+p[1]) + ' 月 ' + (+p[2]) + ' 日（' + d.weekText.replace('星期', '周') + '）';
      }).join('、');
      var hp = window.__extras.huiMen;
      var hpd = hp.date.split('-');
      $('#printPlan').innerHTML =
        '<div class="print-plan__row"><h4>顺手要定的</h4><p>领证：' + lic + '　·　回门：' + (+hpd[1]) + ' 月 ' + (+hpd[2]) + ' 日（' + hp.weekText.replace('星期', '周') + '，婚后第三天）</p></div>' +
        (items ? '<div class="print-plan__row"><h4>备婚时间表</h4><ul class="print-plan__list">' + items + '</ul></div>' : '');
    }
  }

  /* ── 提交 ─────────────────────────────────── */

  function onSubmit(e) {
    e.preventDefault();
    clearError();

    var input = readForm();
    if (!input.groom.date) return fieldError(BIRTH.groom.el, '先选新郎的出生日期。');
    if (!input.bride.date) return fieldError(BIRTH.bride.el, '再选新娘的出生日期。');

    var g = input.groom.date, b = input.bride.date;
    var today = (function () { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); })();
    if (g > today || b > today) return fieldError(g > today ? BIRTH.groom.el : BIRTH.bride.el, '出生日期不能晚于今天。');

    var btn = $('#submitBtn');
    btn.disabled = true;
    btn.textContent = '正在排…';

    // 让浏览器先把按钮状态画出来
    setTimeout(function () {
      try {
        var t0 = performance.now();
        var ctx = E.buildContext(input);
        var res = E.findDates(ctx);
        var ex = E.five(ctx, res.picks[0].date);
        renderResult(res, ex);
        $('#formHint').textContent = '从 ' + res.stats.scanned + ' 天里挑出 ' + res.candidateCount + ' 个可用的日子。';
      } catch (err) {
        console.error(err);
        showError('这次没算出来：' + err.message + '。检查一下出生日期是否填全。');
      } finally {
        btn.disabled = false;
        btn.textContent = '合一个日子';
      }
    }, 20);
  }

  /* ── 复制 / 打印 / 示例 ────────────────────── */

  function copyText() {
    var res = window.__lastResult;
    if (!res) return;
    var lines = ['结婚好日子 · 为你们挑的三个日子', ''];
    res.picks.forEach(function (p, i) {
      lines.push((i + 1) + '. ' + p.y + '年' + p.m + '月' + p.d + '日（' + p.weekText + '，' + p.lunarText.replace(/^二〇[〇一二三四五六七八九]+年/, '') + '）');
      lines.push('   ' + p.grade.label + ' ' + p.score + '分 · ' + p.zhiXing + '日 · 值神' + p.tianShen);
      lines.push('   宜：' + p.yi.slice(0, 6).join('、'));
      if (p.hours && p.hours.length) lines.push('   吉时：' + p.hours.map(function (h) { return h.label + ' ' + h.range; }).join('；'));
      lines.push('');
    });
    lines.push('（依通书择日，民俗参考）');

    var text = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        flash($('#copyBtn'), '已复制，去微信粘贴吧');
      }, function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); flash($('#copyBtn'), '已复制'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  function flash(btn, msg) {
    var old = btn.textContent;
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = old; }, 1800);
  }

  function fillExample() {
    $('#groomName').value = '陈默';
    BIRTH.groom.set('1994-03-18');
    $('#groomHour').value = '5';
    $('#brideName').value = '林小满';
    BIRTH.bride.set('1995-09-02');
    $('#brideHour').value = '7';
    BIRTH.gpa.set('1966-07-11');
    $('#gpaHour').value = '2';
    BIRTH.gma.set('1968-11-23');
    $('#gmaHour').value = '-1';
    BIRTH.bpa.set('1967-02-08');
    $('#bpaHour').value = '0';
    BIRTH.bma.set('1970-05-30');
    $('#bmaHour').value = '-1';
    $('#parentsBox').open = true;
    clearError();
    $('#birthForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }

  /* ── 绑定 ─────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    initSelects();
    renderToday();
    requestAnimationFrame(function () { document.body.classList.add('is-ready'); });

    $('#birthForm').addEventListener('submit', onSubmit);
    $('#printBtn').addEventListener('click', function () { window.print(); });
    $('#copyBtn').addEventListener('click', copyText);

    $('#posterBtn').addEventListener('click', function () {
      if (window.__lastResult) openPoster(window.__lastResult, window.__lastInput);
    });
    $('#posterClose').addEventListener('click', closePoster);
    $('#posterModal').addEventListener('click', function (e) { if (e.target === this) closePoster(); });
    $('#elderBtn').addEventListener('click', function () {
      if (window.__lastResult) openElder(window.__lastResult);
    });

    $('#qaPoster').addEventListener('click', function () {
      if (window.__lastResult) openPoster(window.__lastResult, window.__lastInput);
    });
    $('#qaLink').addEventListener('click', function () {
      var btn = this;
      var url = shareURL();
      var done = function () { flash(btn, '链接已复制'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url); done(); });
      } else { fallbackCopy(url); done(); }
    });
    $('#qaInvite').addEventListener('click', function () {
      var v = document.getElementById('venueName');
      if (v) { v.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { v.focus({ preventScroll: true }); }, 500); }
    });
    $('#qaPrint').addEventListener('click', function () { window.print(); });
    $('#elderClose').addEventListener('click', closeElder);
    $('#elderModal').addEventListener('click', function (e) { if (e.target === this) closeElder(); });
    $('#copyElder').addEventListener('click', function () {
      var btn = this;
      var text = window.__elderText || '';
      var done = function () { flash(btn, '已复制，去微信粘贴'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!document.getElementById('posterModal').hidden) closePoster();
      if (!document.getElementById('elderModal').hidden) closeElder();
    });

    $('#toggleAlts').addEventListener('click', function () {
      var alts = $('#alts');
      var open = alts.hidden;
      alts.hidden = !open;
      this.setAttribute('aria-expanded', String(open));
      this.textContent = open ? '收起备选' : '看另外 ' + (this.dataset.count || 0) + ' 个备选日子';
    });

    $('#yearmap').addEventListener('click', function (e) {
      var cell = e.target.closest ? e.target.closest('.ym-cell') : null;
      if (!cell || !cell.dataset.tip) return;
      $$('.ym-cell.is-on').forEach(function (c) { c.classList.remove('is-on'); });
      cell.classList.add('is-on');
      $('#ymCaption').textContent = cell.dataset.tip.replace(/ · /g, ' ｜ ');
    });

    $('#editBtn').addEventListener('click', function () {
      document.getElementById('form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () { var s = document.getElementById('bpGroomY'); if (s) s.focus({ preventScroll: true }); }, 450);
    });

    $$('#spanGroup button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#spanGroup button').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
      });
    });

    var ex = document.getElementById('exampleLink');
    if (ex) ex.addEventListener('click', function (e) { e.preventDefault(); fillExample(); });

    // 带分享链接打开：还原输入并直接出结果
    var m = /^#q=(.+)$/.exec(location.hash || '');
    if (m) {
      var restored = applyState(m[1]);
      if (restored) setTimeout(function () { $('#birthForm').requestSubmit(); }, 120);
      else { try { history.replaceState(null, '', location.pathname); } catch (e2) {} }
    }

    // 供自动化测试与外部调用
    window.JHRZ = window.JHRZ || {};
    window.JHRZ.birth = {
      set: function (key, date) { if (BIRTH[key]) BIRTH[key].set(date); },
      get: function (key) { return BIRTH[key] ? BIRTH[key].get() : null; },
      clear: function (key) { if (BIRTH[key]) BIRTH[key].clear(); }
    };
  });
})();
