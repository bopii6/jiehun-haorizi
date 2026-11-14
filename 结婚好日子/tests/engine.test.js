/* 引擎回归测试：不变量 + 边界场景 */
globalThis.Solar = require('../assets/vendor/lunar.js').Solar;
require('../assets/engine.js');
const E = globalThis.JHRZ.engine;
const ZHI = E.ZHI;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('  FAIL: ' + msg); } }

const base = {
  groom: { name: '陈', date: '1994-03-18', hour: 5 },
  bride: { name: '林', date: '1995-09-02', hour: 7 },
  parents: [
    { label: '新郎父亲', date: '1966-07-11', hour: 2 },
    { label: '新郎母亲', date: '1968-11-23', hour: -1 },
    { label: '新娘父亲', date: '1967-02-08', hour: 0 },
    { label: '新娘母亲', date: '1970-05-30', hour: -1 }
  ],
  range: { startYear: 2027, startMonth: 1, months: 12 },
  prefs: { weekend: true }
};

function chong(i) { return (i + 6) % 12; }

function checkScenario(name, input, expectPicks) {
  console.log('\n== ' + name);
  const ctx = E.buildContext(input);
  const res = E.findDates(ctx);
  ok(res.picks.length === expectPicks, '应返回 ' + expectPicks + ' 个日子，实际 ' + res.picks.length);
  if (!res.picks.length) return res;

  const g = ctx.groom, b = ctx.bride;
  res.picks.forEach(p => {
    const info = E.dayInfo(Solar.fromYmd(p.y, p.m, p.d));
    const dz = ZHI.indexOf(info.dayZhi);
    ok(chong(g.dayZhi) !== dz, p.date + ' 不应冲新郎日支');
    ok(chong(b.dayZhi) !== dz, p.date + ' 不应冲新娘日支');
    ok(info.zhiXing !== '破', p.date + ' 不应是破日');
    ok(!(info.ji.includes('嫁娶')), p.date + ' 通书不应忌嫁娶');
    ok(info.yi.includes('嫁娶') || info.yi.includes('纳采') || info.yi.includes('订盟'), p.date + ' 通书应宜嫁娶/纳采');
    ok(p.hours.length === 2, p.date + ' 应有 2 个吉时');
    p.hours.forEach(h => {
      const hi = ZHI.indexOf(h.zhi);
      ok(chong(g.dayZhi) !== hi && chong(b.dayZhi) !== hi, p.date + ' ' + h.label + ' 不应冲新人日支');
    });
    ok(p.reasons.length >= 2, p.date + ' 至少两条理由');
  });

  if (res.relaxLevel === 0 && res.picks.length === 3) {
    const dates = res.picks.map(p => new Date(p.date).getTime()).sort((a, b) => a - b);
    const gap1 = (dates[1] - dates[0]) / 86400000, gap2 = (dates[2] - dates[1]) / 86400000;
    ok(Math.min(gap1, gap2) >= 21, '严格口径下三个日子应相隔 ≥21 天，实际 ' + gap1 + '/' + gap2);
  }
  console.log('  picks:', res.picks.map(p => p.date + '(' + p.score + ')').join(' '), '| 候选', res.candidateCount, '| relax', res.relaxLevel);
  return res;
}

checkScenario('标准六人', base, 3);

checkScenario('只有新人', { ...base, parents: [] }, 3);

checkScenario('半年范围', { ...base, range: { startYear: 2028, startMonth: 3, months: 6 } }, 3);

checkScenario('一年半范围 + 避开七月', { ...base, range: { startYear: 2027, startMonth: 6, months: 18 }, prefs: { weekend: true, avoidLunar7: true } }, 3);

checkScenario('闰月附近（2028 闰五月）', {
  groom: { date: '2020-06-01', hour: 4 }, bride: { date: '1993-11-11', hour: 8 },
  parents: [], range: { startYear: 2028, startMonth: 4, months: 6 }, prefs: {}
}, 3);

// 避开农历七月是否生效
{
  const r = E.findDates(E.buildContext({ ...base, prefs: { avoidLunar7: true } }));
  r.picks.forEach(p => ok(!/七月/.test(p.lunarText), p.date + ' 应避开农历七月，实际 ' + p.lunarText));
}

// 通书对照：抽一个吉日，检查各要素字段完整
{
  const a = E.almanac('2027-05-15');
  ok(a.dayGZ === '甲午', '2027-05-15 应为甲午日，实际 ' + a.dayGZ);
  ok(a.zhiXing === '除', '2027-05-15 应为除日，实际 ' + a.zhiXing);
}

// 已知日期对照：2024 立春 16:27、2025 春节 1/29
{
  const s = Solar.fromYmd(2024, 2, 4).getLunar();
  ok(/^2024-02-04 16:2/.test(s.getJieQiTable()['立春'].toYmdHms()), '2024 立春时刻异常：' + s.getJieQiTable()['立春'].toYmdHms());
  ok(Solar.fromYmd(2025, 1, 29).getLunar().getDayInChinese() === '初一', '2025 春节应为初一');
}

// 父母冲煞：用一位已知生肖的长辈验证会被排除
{
  const parent = { label: '新娘父亲', date: '1952-06-01' }; // 壬辰年，属龙
  const ctx = E.buildContext({
    groom: { date: '1994-03-18' }, bride: { date: '1995-09-02' },
    parents: [parent],
    range: { startYear: 2027, startMonth: 1, months: 6 }, prefs: {}
  });
  ok(ctx.parents[0].shengxiao === '龙', '1952-06-01 应属龙，实际 ' + ctx.parents[0].shengxiao);
  const res = E.findDates(ctx);
  res.picks.forEach(p => {
    const info = E.dayInfo(Solar.fromYmd(p.y, p.m, p.d));
    ok(ZHI.indexOf(info.dayZhi) !== chong(ctx.parents[0].yearZhi), p.date + ' 不应冲属龙长辈');
  });
  ok(res.picks.length === 3, '单长辈场景仍应给出三个日子');
}

console.log('\nPASS ' + pass + ' / FAIL ' + fail);
process.exit(fail ? 1 : 0);
