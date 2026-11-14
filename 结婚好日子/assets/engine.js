/*!
 * 结婚好日子 · 择日引擎
 * 底层历法：lunar-javascript (MIT, 6tail)
 * 规则依据：《协纪辨方书》《玉匣记》通书择日法 + 民间婚嫁禁忌
 * 说明：本引擎做的是「民俗择日筛选」，不做命理预测、不排大运流年。
 */
(function (root) {
  'use strict';

  var Solar = root.Solar;
  if (!Solar && typeof require === 'function') {
    Solar = require('./vendor/lunar.js').Solar;
  }

  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  var WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  var WUXING = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  var WUXING_ZHI = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];

  // 时辰：索引 0=子 … 11=亥
  var SHICHEN = [
    { zhi: '子', label: '子时', range: '23:00–00:59' },
    { zhi: '丑', label: '丑时', range: '01:00–02:59' },
    { zhi: '寅', label: '寅时', range: '03:00–04:59' },
    { zhi: '卯', label: '卯时', range: '05:00–06:59' },
    { zhi: '辰', label: '辰时', range: '07:00–08:59' },
    { zhi: '巳', label: '巳时', range: '09:00–10:59' },
    { zhi: '午', label: '午时', range: '11:00–12:59' },
    { zhi: '未', label: '未时', range: '13:00–14:59' },
    { zhi: '申', label: '申时', range: '15:00–16:59' },
    { zhi: '酉', label: '酉时', range: '17:00–18:59' },
    { zhi: '戌', label: '戌时', range: '19:00–20:59' },
    { zhi: '亥', label: '亥时', range: '21:00–22:59' }
  ];
  // 取该时辰代表时辰（子时取早子 00:30，避免跨日）
  var SHICHEN_HOUR = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

  // 建除十二神吉凶权重
  var ZHIXING_W = { 成: 9, 开: 8, 定: 6, 危: 4, 除: 4, 执: 3, 满: 1, 平: -6, 收: -8, 闭: -10, 建: -5, 破: -30 };

  // 天德（按月支）：寅月丁、卯月申、辰月壬、巳月辛、午月亥、未月甲、申月癸、酉月寅、戌月丙、亥月乙、子月巳、丑月庚
  var TIANDE = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' };
  // 月德：寅午戌月丙、申子辰月壬、亥卯未月甲、巳酉丑月庚
  var YUEDE = { 寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚' };
  // 天赦：春戊寅、夏甲午、秋戊申、冬甲子
  var TIANSHIE = { 春: ['戊', '寅'], 夏: ['甲', '午'], 秋: ['戊', '申'], 冬: ['甲', '子'] };

  // 杨公忌日（农历月、日）
  var YANGGONG = [[1, 13], [2, 11], [3, 9], [4, 7], [5, 5], [6, 3], [7, 1], [7, 29], [8, 27], [9, 25], [10, 23], [11, 21], [12, 19]];
  // 三娘煞（农历日）
  var SANNIANGSHA = [3, 7, 13, 18, 22, 27];
  // 月忌（农历初五、十四、廿三）
  var YUEJI = [5, 14, 23];
  // 四离四绝：节气前一日
  var JUE_DAY = ['立春', '立夏', '立秋', '立冬'];
  var LI_DAY = ['春分', '夏至', '秋分', '冬至'];

  var SANHE_GROUP = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]]; // 申子辰 寅午戌 巳酉丑 亥卯未
  var SANHE_NAME = ['水局', '火局', '金局', '木局'];

  function chong(i) { return (i + 6) % 12; }
  function liuhe(i) { return (13 - i) % 12; } // 子丑、寅亥、卯戌、辰酉、巳申、午未
  function sanheGroup(i) { for (var k = 0; k < 4; k++) if (SANHE_GROUP[k].indexOf(i) >= 0) return k; return -1; }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(s) { return s.getYear() + '-' + pad2(s.getMonth()) + '-' + pad2(s.getDay()); }
  function parseDate(str) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(str || '');
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return { y: y, m: mo, d: d };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- 个人八字 ----------
  function analyzePerson(p) {
    if (!p || !p.date) return null;
    var d = parseDate(p.date);
    if (!d) return null;
    var hourIdx = (typeof p.hour === 'number' && p.hour >= 0 && p.hour <= 11) ? p.hour : -1;
    var solar = Solar.fromYmdHms(d.y, d.m, d.d, hourIdx >= 0 ? SHICHEN_HOUR[hourIdx] : 12, 30, 0);
    var lunar = solar.getLunar();
    var ec = lunar.getEightChar();
    ec.setSect(2);
    var yearGZ = ec.getYear(), monthGZ = ec.getMonth(), dayGZ = ec.getDay(), timeGZ = hourIdx >= 0 ? ec.getTime() : '—';
    var dayGan = ec.getDayGan(), dayZhi = ec.getDayZhi();
    var yz = ZHI.indexOf(ec.getYearZhi()), dz = ZHI.indexOf(dayZhi);
    return {
      key: p.key,
      label: p.label,
      name: (p.name || '').trim(),
      role: p.role || 'couple',
      date: p.date,
      hour: hourIdx,
      shichen: hourIdx >= 0 ? SHICHEN[hourIdx].label + ' ' + SHICHEN[hourIdx].range : '时辰未知',
      bazi: { year: yearGZ, month: monthGZ, day: dayGZ, time: timeGZ },
      baziText: [yearGZ, monthGZ, dayGZ, timeGZ].join(' '),
      yearZhi: yz,
      dayZhi: dz,
      shengxiao: SHENGXIAO[yz],
      dayGan: dayGan,
      dayGanWuXing: WUXING[GAN.indexOf(dayGan)],
      dayNayin: lunar.getDayNaYin(),
      yueLing: lunar.getMonthZhiExact(),
      solar: solar
    };
  }

  // ---------- 单日评估 ----------
  function dayInfo(solar) {
    var lunar = solar.getLunar();
    var dayGan = lunar.getDayGan();
    var dayZhi = lunar.getDayZhi();
    var dz = ZHI.indexOf(dayZhi);
    var monthZhi = lunar.getMonthZhiExact();
    var yearZhi = lunar.getYearZhiExact();
    var lunarMonth = lunar.getMonth();
    var lunarDay = lunar.getDay();
    var jieQiTomorrow = solar.next(1).getLunar().getJieQi();

    var info = {
      solar: solar,
      date: ymd(solar),
      y: solar.getYear(), m: solar.getMonth(), d: solar.getDay(),
      week: solar.getWeek(),
      weekText: WEEK[solar.getWeek()],
      lunar: lunar,
      lunarMonthAbs: Math.abs(lunarMonth),
      lunarDay: lunarDay,
      lunarText: lunar.getYearInChinese() + '年' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese(),
      lunarShort: lunar.getMonthInChinese() + '月' + lunar.getDayInChinese(),
      ganzhiYear: yearZhi + '年',
      yearGZ: lunar.getYearInGanZhiExact(),
      monthGZ: lunar.getMonthInGanZhiExact(),
      dayGZ: lunar.getDayInGanZhi(),
      dayGan: dayGan,
      dayZhi: dayZhi,
      dayZhiIdx: dz,
      monthZhiIdx: ZHI.indexOf(monthZhi),
      jieqi: lunar.getJieQi() || '',
      tomorrowJieQi: jieQiTomorrow || '',
      zhiXing: lunar.getZhiXing(),
      tianShen: lunar.getDayTianShen(),
      tianShenType: lunar.getDayTianShenType(),
      tianShenLuck: lunar.getDayTianShenLuck(),
      xiu: lunar.getXiu(),
      xiuLuck: lunar.getXiuLuck(),
      chongDesc: lunar.getDayChongDesc(),
      sha: lunar.getDaySha(),
      yi: lunar.getDayYi(),
      ji: lunar.getDayJi(),
      jiShen: lunar.getDayJiShen(),
      xiongSha: lunar.getDayXiongSha(),
      nayin: lunar.getDayNaYin(),
      gzNames: lunar.getDayGan() + lunar.getDayZhi()
    };
    return info;
  }

  // ---------- 主流程 ----------
  function buildContext(input) {
    var groom = analyzePerson(Object.assign({ key: 'groom', label: '新郎', role: 'couple' }, input.groom || {}));
    var bride = analyzePerson(Object.assign({ key: 'bride', label: '新娘', role: 'couple' }, input.bride || {}));
    if (!groom || !bride) throw new Error('请填写新郎与新娘的出生日期');

    var parents = [];
    (input.parents || []).forEach(function (p, i) {
      if (!p || !p.date) return;
      var a = analyzePerson(Object.assign({ key: 'p' + i, label: p.label || '长辈', role: 'parent' }, p));
      if (a) parents.push(a);
    });

    var range = input.range || {};
    var now = new Date();
    var startY = parseInt(range.startYear, 10);
    var startM = parseInt(range.startMonth, 10);
    if (!isFinite(startY) || startY < 1900 || startY > 2100) startY = now.getFullYear();
    if (!isFinite(startM) || startM < 1 || startM > 12) startM = now.getMonth() + 1;
    var months = parseInt(range.months, 10);
    if (!isFinite(months) || months < 1) months = 12;
    var start = Solar.fromYmd(startY, startM, 1);
    var days = Math.round(months * 30.44);

    // 婚礼要订酒店、发请帖：最早的一天也不早于一个月后；选了过去的月份就顺延
    var today = Solar.fromDate(new Date());
    var earliest = today.next(30);
    var adjusted = false, adjustReason = '';
    if (start.toYmd() < earliest.toYmd()) {
      adjusted = true;
      adjustReason = start.toYmd() <= today.toYmd() ? 'past' : 'lead';
      start = earliest;
    }
    var end = start.next(days - 1);

    return {
      people: [groom, bride].concat(parents),
      groom: groom,
      bride: bride,
      parents: parents,
      start: start,
      end: end,
      adjusted: adjusted,
      adjustReason: adjustReason,
      months: months,
      startText: start.toYmd(),
      endText: end.toYmd(),
      days: days,
      prefs: Object.assign({ weekend: true, avoidLunar7: false, avoidLunar6: false }, input.prefs || {})
    };
  }

  function evaluate(info, ctx, relax) {
    var score = 62;
    var plus = [], minus = [];
    var hard = [];

    function add(w, text, bucket) {
      score += w;
      (w >= 0 ? plus : minus).push({ w: w, text: text });
    }

    // —— 一、通书宜忌（最基础的一条）——
    var yiHas = info.yi.indexOf('嫁娶') >= 0 || info.yi.indexOf('纳采') >= 0 || info.yi.indexOf('订盟') >= 0;
    var jiHas = info.ji.indexOf('嫁娶') >= 0;
    if (jiHas) {
      if (relax.noYiji) add(-14, '通书忌嫁娶', minus);
      else hard.push('通书忌嫁娶');
    } else if (yiHas) {
      add(info.yi.indexOf('嫁娶') >= 0 ? 7 : 4, info.yi.indexOf('嫁娶') >= 0 ? '通书宜嫁娶' : '通书宜纳采订盟', plus);
    } else {
      if (relax.noYiji) add(-10, '通书未列嫁娶', minus);
      else hard.push('通书未列嫁娶');
    }

    // —— 二、神煞层面 ——
    if (info.tianShenLuck === '吉') add(7, '值神' + info.tianShen + '·黄道', plus);
    else add(-11, '值神' + info.tianShen + '·黑道', minus);

    var zw = ZHIXING_W[info.zhiXing] || 0;
    if (zw !== 0) add(zw, '建除' + info.zhiXing + '日', zw > 0 ? plus : minus);
    if (info.zhiXing === '破') hard.push('月破日');

    if (info.xiuLuck === '吉') add(4, '二十八宿' + info.xiu + '宿（吉）', plus);
    else add(-4, '二十八宿' + info.xiu + '宿（凶）', minus);

    var monthZhi = ZHI[info.monthZhiIdx];
    var dayGan = info.dayGan, dayZhi = info.dayZhi;

    if (TIANDE[monthZhi] === dayGan) add(6, '天德贵人日', plus);
    if (TIANDE[monthZhi] === dayZhi) add(5, '天德日', plus);
    if (YUEDE[monthZhi] === dayGan) add(5, '月德贵人日', plus);

    var season = ['寅', '卯', '辰'].indexOf(monthZhi) >= 0 ? '春' : ['巳', '午', '未'].indexOf(monthZhi) >= 0 ? '夏' : ['申', '酉', '戌'].indexOf(monthZhi) >= 0 ? '秋' : '冬';
    if (TIANSHIE[season][0] === dayGan && TIANSHIE[season][1] === dayZhi) add(5, '天赦日', plus);

    // —— 三、与新人命局的冲合 ——
    var g = ctx.groom, b = ctx.bride;
    var dz = info.dayZhiIdx;

    [g, b].forEach(function (p) {
      var who = p.label;
      if (chong(p.dayZhi) === dz) {
        if (relax.ignoreDayChong) add(-25, '冲' + who + '日支' + ZHI[p.dayZhi], minus);
        else hard.push('冲' + who + '日支');
      }
      if (chong(p.yearZhi) === dz) {
        if (relax.ignoreYearChong) add(-12, '冲' + who + '生肖' + SHENGXIAO[p.yearZhi], minus);
        else hard.push('冲' + who + '生肖（' + SHENGXIAO[p.yearZhi] + '）');
      }
      if (liuhe(p.dayZhi) === dz) add(6, '与' + who + '日支六合', plus);
      else if (sanheGroup(p.dayZhi) === sanheGroup(dz)) add(4, '与' + who + '日支三合' + SANHE_NAME[sanheGroup(dz)], plus);
    });

    // 天喜 / 红鸾（以新娘年支为准，传统取女命）
    var hongluan = (3 - b.yearZhi + 12) % 12;
    var tianxi = chong(hongluan);
    if (dz === tianxi) add(4, '天喜星临日', plus);
    if (dz === hongluan) add(4, '红鸾星临日', plus);

    // —— 四、双方父母 ——
    ctx.parents.forEach(function (p) {
      if (chong(p.yearZhi) === dz) {
        if (relax.ignoreParentChong) add(-13, '冲' + p.label + '生肖' + SHENGXIAO[p.yearZhi], minus);
        else hard.push('冲' + p.label + '生肖（' + SHENGXIAO[p.yearZhi] + '）');
      } else if (liuhe(p.yearZhi) === dz) {
        add(2, '与' + p.label + '生肖六合', plus);
      }
    });

    // —— 五、建除与民俗禁忌中的凶日 ——
    if (info.tomorrowJieQi && JUE_DAY.indexOf(info.tomorrowJieQi) >= 0) hard.push('四绝日（' + info.tomorrowJieQi + '前一日）');
    if (info.tomorrowJieQi && LI_DAY.indexOf(info.tomorrowJieQi) >= 0) hard.push('四离日（' + info.tomorrowJieQi + '前一日）');

    var isYangGong = YANGGONG.some(function (x) { return x[0] === info.lunarMonthAbs && x[1] === info.lunarDay; });
    if (isYangGong) {
      if (relax.ignoreTaboo) add(-12, '杨公忌日', minus);
      else hard.push('杨公忌日');
    }
    if (SANNIANGSHA.indexOf(info.lunarDay) >= 0) {
      if (relax.ignoreTaboo) add(-8, '三娘煞', minus);
      else hard.push('三娘煞');
    }
    if (YUEJI.indexOf(info.lunarDay) >= 0) add(-3, '月忌日', minus);

    if (chong(info.monthZhiIdx) === dz) hard.push('月破日');
    if (chong(ZHI.indexOf(info.lunar.getYearZhiExact())) === dz) hard.push('岁破日');

    // —— 六、偏好 ——
    var isWeekend = info.week === 0 || info.week === 6;
    if (ctx.prefs.weekend && isWeekend) add(5, '恰逢' + info.weekText, plus);
    if (info.week === 0) add(1, '周日，便于宾客返程', plus);
    if (ctx.prefs.avoidLunar7 && info.lunarMonthAbs === 7) hard.push('避开农历七月');
    if (ctx.prefs.avoidLunar6 && info.lunarMonthAbs === 6) hard.push('避开农历六月');

    return {
      ok: hard.length === 0,
      hard: hard,
      score: clamp(Math.round(score), 40, 99),
      plus: plus,
      minus: minus,
      info: info
    };
  }

  function selectPicks(chosen, n) {
    var plans = [{ gap: 28, distinctMonth: true }, { gap: 21, distinctMonth: true }, { gap: 14, distinctMonth: false }, { gap: 7, distinctMonth: false }, { gap: 1, distinctMonth: false }];
    var best = [];
    for (var pi = 0; pi < plans.length; pi++) {
      var plan = plans[pi], cur = [], used = {};
      for (var k = 0; k < chosen.length && cur.length < n; k++) {
        var ev = chosen[k];
        if (used[ev.info.date]) continue;
        var tooNear = false, sameMonth = false;
        for (var q = 0; q < cur.length; q++) {
          if (Math.abs(cur[q].info.solar.subtract(ev.info.solar)) < plan.gap) tooNear = true;
          if (cur[q].info.lunarMonthAbs === ev.info.lunarMonthAbs) sameMonth = true;
        }
        if (tooNear) continue;
        if (sameMonth && plan.distinctMonth) continue;
        used[ev.info.date] = 1;
        cur.push(ev);
      }
      if (cur.length > best.length) best = cur;
      if (best.length >= n) break;
    }
    if (!best.length && chosen.length) best = chosen.slice(0, n);
    return best;
  }

  function grade(score) {
    if (score >= 95) return { label: '上上吉', key: 'top' };
    if (score >= 90) return { label: '上吉', key: 'high' };
    if (score >= 84) return { label: '吉', key: 'good' };
    if (score >= 76) return { label: '中吉', key: 'mid' };
    return { label: '平', key: 'flat' };
  }

  // 逐个时辰打分（白天 7 个），再按婚礼流程挑：上午一个、午间一个
  function scoreHours(info, ctx) {
    var USE = { 卯: '化妆、准备', 辰: '迎亲、出门', 巳: '迎亲、仪式', 午: '仪式、开席', 未: '开席、敬酒', 申: '晚宴、送客', 酉: '晚宴、送客' };
    var out = [];
    for (var i = 3; i <= 9; i++) {
      var s = Solar.fromYmdHms(info.y, info.m, info.d, SHICHEN_HOUR[i], 30, 0);
      var l = s.getLunar();
      var luck = l.getTimeTianShenLuck();
      var tyi = l.getTimeYi(), tji = l.getTimeJi();
      var sc = 50;
      var notes = [];
      if (luck === '吉') sc += 14; else sc -= 12;
      if (tyi.indexOf('嫁娶') >= 0) { sc += 12; notes.push('时宜嫁娶'); }
      else if (tyi.indexOf('纳采') >= 0 || tyi.indexOf('订盟') >= 0) { sc += 7; notes.push('时宜纳采'); }
      else if (tyi.indexOf('会亲友') >= 0 || tyi.indexOf('宴请') >= 0) { sc += 5; notes.push('时宜会亲友'); }
      if (tji.indexOf('嫁娶') >= 0) { sc -= 16; notes.push('时忌嫁娶'); }
      if (chong(ctx.groom.dayZhi) === i) { sc -= 16; notes.push('冲新郎日支'); }
      if (chong(ctx.bride.dayZhi) === i) { sc -= 18; notes.push('冲新娘日支'); }
      if (chong(ctx.groom.yearZhi) === i || chong(ctx.bride.yearZhi) === i) { sc -= 10; notes.push('冲新人生肖'); }
      if (liuhe(ctx.groom.dayZhi) === i || liuhe(ctx.bride.dayZhi) === i) { sc += 6; notes.push('与新人六合'); }
      else if (sanheGroup(ctx.groom.dayZhi) === sanheGroup(i) || sanheGroup(ctx.bride.dayZhi) === sanheGroup(i)) { sc += 4; notes.push('与新人三合'); }
      if (i === 6) sc -= 2;
      sc += ({ 卯: 0, 辰: 7, 巳: 5, 午: 3, 未: 2, 申: 0, 酉: -3 })[ZHI[i]] || 0; // 按「上午迎亲、午间开席」的常规流程加权
      out.push({
        zhi: ZHI[i],
        label: SHICHEN[i].label,
        range: SHICHEN[i].range,
        ganZhi: l.getTimeGan() + l.getTimeZhi(),
        tianShen: l.getTimeTianShen(),
        luck: luck,
        score: clamp(sc, 30, 99),
        use: USE[ZHI[i]],
        notes: notes,
        yi: tyi.slice(0, 4)
      });
    }
    return out;
  }

  function pickHours(info, ctx, count) {
    var all = scoreHours(info, ctx);
    function best(set) {
      var arr = all.filter(function (h) { return set.indexOf(h.zhi) >= 0; });
      arr.sort(function (a, b) { return b.score - a.score; });
      return arr[0];
    }
    var res = [best(['辰', '巳']), best(['午', '未'])].filter(Boolean);
    res.sort(function (a, b) { return ZHI.indexOf(a.zhi) - ZHI.indexOf(b.zhi); });
    return res.slice(0, count || 2);
  }

  function reasons(ev) {
    var arr = ev.plus.slice().sort(function (a, b) { return b.w - a.w; })
      .concat(ev.minus.slice().sort(function (a, b) { return a.w - b.w; }));
    var seen = {};
    var out = [];
    for (var i = 0; i < arr.length && out.length < 4; i++) {
      var t = arr[i].text;
      if (seen[t]) continue;
      seen[t] = 1;
      out.push({ text: t, plus: arr[i].w >= 0 });
    }
    return out;
  }

  function findDates(ctx) {
    var relaxLevels = [
      {},
      { ignoreTaboo: true },
      { ignoreTaboo: true, ignoreParentChong: true },
      { ignoreTaboo: true, ignoreParentChong: true, ignoreYearChong: true },
      { ignoreTaboo: true, ignoreParentChong: true, ignoreYearChong: true, noYiji: true }
    ];

    var stats = { scanned: ctx.days, yiJiReject: 0, chongReject: 0, tabooReject: 0, passed: 0 };
    var all = [];
    for (var i = 0; i < ctx.days; i++) {
      var s = ctx.start.next(i);
      var info = dayInfo(s);
      all.push(info);
    }

    var chosen = null, level = 0, passed = [];
    for (var lv = 0; lv < relaxLevels.length; lv++) {
      var relax = relaxLevels[lv];
      var pool = all.map(function (info) { return evaluate(info, ctx, relax); })
        .filter(function (ev) { return ev.ok; });
      if (pool.length >= 3) { chosen = pool; level = lv; break; }
      if (!chosen) { chosen = pool; level = lv; }
    }
    chosen.sort(function (a, b) { return b.score - a.score || (a.info.date < b.info.date ? -1 : 1); });

    // 统计（在严格口径下）
    var strict = all.map(function (info) { return evaluate(info, ctx, relaxLevels[0]); });
    strict.forEach(function (ev) {
      if (ev.ok) { stats.passed++; return; }
      var r = ev.hard.join('|');
      if (/通书/.test(r)) stats.yiJiReject++;
      else if (/冲/.test(r)) stats.chongReject++;
      else stats.tabooReject++;
    });

    // 选三个：分数优先；彼此间隔够开、农历月尽量不同
    var picks = selectPicks(chosen, 3);

    picks.sort(function (a, b) { return b.score - a.score || (a.info.date < b.info.date ? -1 : 1); });

    var today = Solar.fromDate(new Date());
    var result = picks.map(function (ev, idx) {
      var gr = grade(ev.score);
      return {
        rank: idx + 1,
        score: ev.score,
        grade: gr,
        date: ev.info.date,
        y: ev.info.y, m: ev.info.m, d: ev.info.d,
        week: ev.info.week,
        weekText: ev.info.weekText,
        lunarText: ev.info.lunarText,
        lunarShort: ev.info.lunarShort,
        dayGZ: ev.info.dayGZ,
        yearGZ: ev.info.yearGZ,
        monthGZ: ev.info.monthGZ,
        zhiXing: ev.info.zhiXing,
        tianShen: ev.info.tianShen,
        tianShenLuck: ev.info.tianShenLuck,
        xiu: ev.info.xiu,
        chongDesc: ev.info.chongDesc,
        sha: ev.info.sha,
        nayin: ev.info.nayin,
        yi: ev.info.yi,
        ji: ev.info.ji,
        jiShen: ev.info.jiShen,
        xiongSha: ev.info.xiongSha,
        reasons: reasons(ev),
        breakdown: ev.plus.concat(ev.minus).sort(function (a, b) { return b.w - a.w; }),
        hours: pickHours(ev.info, ctx, 2),
        daysAway: Math.round(ev.info.solar.subtract(today)),
        raw: ev
      };
    });

    var alternates = chosen.filter(function (ev) {
      return !picks.some(function (p) { return p.info.date === ev.info.date; });
    }).slice(0, 9).map(function (ev) {
      return {
        date: ev.info.date, weekText: ev.info.weekText, lunarShort: ev.info.lunarShort,
        score: ev.score, grade: grade(ev.score), dayGZ: ev.info.dayGZ, tianShen: ev.info.tianShen
      };
    });

    return {
      picks: result,
      alternates: alternates,
      alternateCount: alternates.length,
      stats: stats,
      relaxLevel: level,
      candidateCount: chosen.length,
      range: {
        start: ctx.startText,
        end: ctx.endText,
        months: ctx.months,
        days: ctx.days,
        adjusted: ctx.adjusted,
        adjustReason: ctx.adjustReason
      },
      calendar: all.map(function (info) {
        var ev = evaluate(info, ctx, relaxLevels[level]);
        var pick = result.filter(function (p) { return p.date === info.date; })[0];
        return {
          date: info.date, d: info.d, m: info.m, lunarShort: info.lunarShort,
          ok: ev.ok, score: ev.ok ? ev.score : 0,
          pick: pick ? pick.rank : 0,
          why: ev.ok ? '' : ev.hard[0],
          week: info.week
        };
      }),
      people: ctx.people.map(function (p) {
        return {
          key: p.key, label: p.label, name: p.name, role: p.role,
          baziText: p.baziText, shengxiao: p.shengxiao, dayGan: p.dayGan,
          dayGanWuXing: p.dayGanWuXing, nayin: p.dayNayin, shichen: p.shichen, date: p.date
        };
      })
    };
  }

  // 婚礼之外的顺手事：领证日、回门日
  // 在某个窗口里挑「宜某事」的日子，避开冲新人
  function bestInWindow(ctx, fromSolar, toSolar, kinds, limit) {
    var today = Solar.fromDate(new Date());
    var pool = [];
    var days = toSolar.subtract(fromSolar);
    for (var i = 0; i <= days; i++) {
      var s = fromSolar.next(i);
      if (s.subtract(today) < 3) continue;
      var info = dayInfo(s);
      if (info.ji.indexOf('嫁娶') >= 0) continue;
      var dz = info.dayZhiIdx;
      if (chong(ctx.groom.dayZhi) === dz || chong(ctx.bride.dayZhi) === dz) continue;
      if (chong(ctx.groom.yearZhi) === dz || chong(ctx.bride.yearZhi) === dz) continue;
      var hit = kinds.some(function (k) { return info.yi.indexOf(k) >= 0; });
      if (!hit) continue;
      var sc = (info.tianShenLuck === '吉' ? 3 : 0) +
        (['成', '开', '定'].indexOf(info.zhiXing) >= 0 ? 2 : 0) +
        (info.yi.indexOf(kinds[0]) >= 0 ? 1 : 0);
      pool.push({ date: info.date, weekText: info.weekText, lunarShort: info.lunarShort, dayGZ: info.dayGZ, score: sc, kinds: kinds });
    }
    pool.sort(function (a, b) { return b.score - a.score || (a.date < b.date ? -1 : 1); });
    return pool.slice(0, limit || 1).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }

  // 婚事五件：订婚、领证、婚礼、回门、入宅
  function five(ctx, weddingYmd) {
    var w = parseDate(weddingYmd);
    var wedding = Solar.fromYmd(w.y, w.m, w.d);
    var ex = extras(ctx, weddingYmd);

    var engage = bestInWindow(ctx, wedding.next(-210), wedding.next(-45), ['纳采', '订盟'], 1);
    var moveIn = bestInWindow(ctx, wedding.next(7), wedding.next(95), ['入宅', '移徙'], 1);

    return {
      engagement: engage[0] || null,
      license: ex.license,
      wedding: {
        date: weddingYmd, weekText: WEEK[wedding.getWeek()],
        lunarShort: dayInfo(wedding).lunarShort
      },
      huiMen: ex.huiMen,
      moveIn: moveIn[0] || null
    };
  }

  function extras(ctx, weddingYmd) {
    var w = parseDate(weddingYmd);
    var wedding = Solar.fromYmd(w.y, w.m, w.d);

    // 领证：只算工作日，婚礼前 90 天到前 7 天
    var pool = [];
    for (var i = -90; i <= -7; i++) {
      var s = wedding.next(i);
      var wk = s.getWeek();
      if (wk === 0 || wk === 6) continue;
      var info = dayInfo(s);
      if (info.ji.indexOf('嫁娶') >= 0) continue;
      var dz = info.dayZhiIdx;
      if (chong(ctx.groom.dayZhi) === dz || chong(ctx.bride.dayZhi) === dz) continue;
      if (chong(ctx.groom.yearZhi) === dz || chong(ctx.bride.yearZhi) === dz) continue;
      var yiHit = info.yi.indexOf('嫁娶') >= 0;
      var dingHit = info.yi.indexOf('订盟') >= 0 || info.yi.indexOf('纳采') >= 0;
      var sc = (info.tianShenLuck === '吉' ? 3 : 0) + (yiHit ? 3 : dingHit ? 1 : 0) +
        (['成', '开', '定'].indexOf(info.zhiXing) >= 0 ? 2 : 0);
      pool.push({
        date: info.date, weekText: info.weekText, lunarShort: info.lunarShort,
        dayGZ: info.dayGZ, tianShen: info.tianShen, yi: yiHit, score: sc
      });
    }
    pool.sort(function (a, b) { return b.score - a.score || (a.date < b.date ? 1 : -1); });
    var license = pool.slice(0, 2).sort(function (a, b) { return a.date < b.date ? -1 : 1; });

    // 回门：婚后第三天
    var hui = wedding.next(3);
    var hi = dayInfo(hui);

    return {
      license: license,
      huiMen: {
        date: hi.date, weekText: hi.weekText, lunarShort: hi.lunarShort,
        dayGZ: hi.dayGZ, chongDesc: hi.chongDesc, sha: hi.sha,
        zhiXing: hi.zhiXing
      }
    };
  }

  // 今日/指定日通书
  function almanac(dateStr) {
    var s = dateStr ? (function () { var d = parseDate(dateStr); return Solar.fromYmd(d.y, d.m, d.d); })() : Solar.fromDate(new Date());
    var info = dayInfo(s);
    return {
      date: info.date, weekText: info.weekText, lunarText: info.lunarText,
      dayGZ: info.dayGZ, yearGZ: info.yearGZ, monthGZ: info.monthGZ,
      zhiXing: info.zhiXing, tianShen: info.tianShen, tianShenType: info.tianShenType,
      tianShenLuck: info.tianShenLuck, xiu: info.xiu, xiuLuck: info.xiuLuck,
      chongDesc: info.chongDesc, sha: info.sha, yi: info.yi, ji: info.ji,
      jieqi: info.jieqi, jiShen: info.jiShen
    };
  }

  root.JHRZ = root.JHRZ || {};
  root.JHRZ.engine = {
    analyzePerson: analyzePerson,
    buildContext: buildContext,
    findDates: findDates,
    extras: extras,
    five: five,
    evaluate: evaluate,
    dayInfo: dayInfo,
    almanac: almanac,
    grade: grade,
    SHICHEN: SHICHEN,
    ZHI: ZHI,
    SHENGXIAO: SHENGXIAO,
    GAN: GAN
  };
})(typeof window !== 'undefined' ? window : globalThis);
