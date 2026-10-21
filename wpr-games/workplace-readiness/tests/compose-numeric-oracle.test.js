'use strict';
/* Independent oracle for every Mathematics numeric config.
 * For each config, the answer is recomputed here in plain JavaScript from the RAW input numbers only
 * (never from the engine's derived values or expression strings). The test then checks that:
 *   - the keyed option is the one the oracle says is correct,
 *   - the keyed option shows the oracle's value (formatted as students see it),
 *   - no distractor shows the oracle's value,
 *   - every raw input the oracle used appears in the scenario text, so the student can compute it.
 * Find-the-problem configs: the line flagged as the error must be arithmetically wrong and every
 * other line with a calculation must be right. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadHybrid } = require('../tools/compose-load.js');
const SEL = require('../js/compose/selector.js');
const T = require('../js/core/text.js');

const h = loadHybrid();
const DRAWS = +(process.env.ORACLE_DRAWS || 200);
const c2 = x => Math.round(x * 100 + 1e-9) / 100;
const money = x => '$' + Number(x).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const money0 = x => '$' + Number(x).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const int = x => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const pct = x => { const r = Math.round(x * 10) / 10; return (Number.isInteger(r) ? String(r) : r.toFixed(1)) + '%'; };
const esc = v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const shows = (text, v) => new RegExp('(^|\\s)' + esc(v) + '(?=[.,\\s]|$)').test(text);
const dec1 = x => Number(x).toFixed(1);

/* oracle(n) -> { show: displayed correct value, inputs: [displayed inputs] }  (numeric answers)
 *            or { best: optionKey, inputs }                                   (decisions)      */
const O = {
  'unit-price': n => ({ show: money(c2(n.p / n.n)), inputs: [int(n.n), money(n.p)] }),
  'total-cost': n => ({ show: money(c2(n.q * n.e)), inputs: [int(n.q), money(n.e)] }),
  'change-due': n => ({ show: money(c2(n.bill - n.tc / 100)), inputs: [money(n.tc / 100), money0(n.bill)] }),
  'boxes-needed': n => ({ show: int(Math.ceil(n.m / n.k)) + ' boxes', inputs: [int(n.m), int(n.k)] }),
  'percent-off': n => ({ show: money(c2(n.pr - n.pr * n.d / 100)), inputs: [money0(n.pr), int(n.d)] }),
  'sales-tax': n => ({ show: money(c2(n.s + n.s * n.t / 100)), inputs: [money0(n.s), int(n.t)] }),
  'inches-feet': n => ({ show: Math.floor(n.L / 12) + ' feet ' + (n.L % 12) + ' inches', inputs: [int(n.L)] }),
  'floor-area': n => ({ show: int(n.w * n.l) + ' square feet', inputs: [int(n.w), int(n.l)] }),
  'daily-average': n => ({ show: int((n.a + n.b + n.c + n.d) / 4) + ' orders', inputs: [int(n.a), int(n.b), int(n.c), int(n.d)] }),
  'percent-of-target': n => ({ show: pct(n.k / n.T * 100), inputs: [int(n.T), int(n.k)] }),
  'budget-left': n => ({ show: money0(n.B - n.s1 - n.s2), inputs: [money0(n.B), money0(n.s1), money0(n.s2)] }),
  'scale-batch': n => ({ show: int(n.q * n.n) + ' scoops', inputs: [int(n.q), int(n.n)] }),
  'paid-hours': n => { let hrs = (n.eh + 12 + 0.5) - n.sh; hrs -= 0.5; return { show: dec1(hrs) + ' hours', inputs: [n.sh + ':00', n.eh + ':30'] }; },
  'split-bill': n => ({ show: money(n.T / n.n), inputs: [money0(n.T), int(n.n)] }),
  'units-per-hour': n => ({ show: int(n.m / n.h) + ' per hour', inputs: [int(n.m), int(n.h)] }),
  'gross-pay': n => ({ show: money(c2(n.h * n.r)), inputs: [int(n.h), money(n.r)] }),
  'compare-unit-price': n => ({ best: n.pb / n.nb < n.pa / n.na ? 'b' : 'a', inputs: [int(n.na), money0(n.pa), int(n.nb), money0(n.pb)] }),
  'overtime-pay': n => { const reg = Math.min(n.h, 40) * n.r, ot = Math.max(0, n.h - 40) * n.r * 1.5; return { show: money(c2(reg + ot)), inputs: [int(n.h), money0(n.r)] }; },
  'net-pay': n => ({ show: money(c2(n.g - n.g * n.t / 100 - n.f)), inputs: [money0(n.g), int(n.t), money0(n.f)] }),
  'boxes-with-waste': n => { let need = n.m + n.m / 10; let b = 0; while (b * n.k < need - 1e-9) b++; return { show: int(b) + ' boxes', inputs: [int(n.m), int(n.k)] }; },
  'discount-then-tax': n => { const sale = n.pr * (100 - n.d) / 100; return { show: money(c2(sale + sale * n.t / 100)), inputs: [money0(n.pr), int(n.d), int(n.t)] }; },
  'percent-change': n => ({ show: pct((n.N - n.L) / n.L * 100), inputs: [int(n.L), int(n.N)] }),
  'hours-to-finish': n => ({ show: int(n.R / n.k) + ' hours', inputs: [int(n.R), int(n.k)] }),
  'dilution': n => ({ show: int(n.T / (1 + n.w)) + ' cups', inputs: [int(n.w), int(n.T)] }),
  'area-minus-cutout': n => ({ show: int(n.w * n.l - n.a * n.b) + ' square feet', inputs: [int(n.w), int(n.l), int(n.a), int(n.b)] }),
  'minutes-cost': n => ({ show: money(c2(n.r * n.m / 60)), inputs: [int(n.m), money0(n.r)] }),
  'budget-percent-left': n => ({ show: pct((n.B - n.S) / n.B * 100), inputs: [money0(n.B), money0(n.S)] }),
  'bulk-threshold-cheaper': n => ({ best: 50 * n.e2 < n.q * n.e ? 'b' : 'a', inputs: [int(n.q), money(n.e), money(n.e2)] }),
  'bulk-threshold-not-worth': n => ({ best: 50 * n.e2 < n.q * n.e ? 'b' : 'a', inputs: [int(n.q), money(n.e), money(n.e2)] }),
  'tip-share-by-hours': n => ({ show: money(c2(n.T * n.h1 / (n.h1 + n.h2 + n.h3))), inputs: [money0(n.T), int(n.h1), int(n.h2), int(n.h3)] }),
  'staff-needed': n => ({ show: int(Math.ceil(n.cph / n.k)) + ' workers', inputs: [int(n.cph), int(n.k)] }),
  'supplier-over-budget': n => { const ca = Math.ceil(n.q / n.na) * n.pa, cb = Math.ceil(n.q / n.nb) * n.pb;
    return { best: ca <= n.bud && ca < cb ? 'a' : (cb <= n.bud ? 'b' : null), inputs: [int(n.q), money0(n.bud), int(n.na), money0(n.pa), int(n.nb), money0(n.pb)] }; },
  'supplier-within-budget': n => { const ca = Math.ceil(n.q / n.na) * n.pa, cb = Math.ceil(n.q / n.nb) * n.pb;
    return { best: ca <= n.bud && ca < cb ? 'a' : (cb <= n.bud ? 'b' : null), inputs: [int(n.q), money0(n.bud), int(n.na), money0(n.pa), int(n.nb), money0(n.pb)] }; },
  'overtime-vs-temp': n => ({ best: n.H * n.r * 1.5 < n.H * n.ta + n.F ? 'a' : 'b', inputs: [int(n.H), money0(n.r), money0(n.ta), money0(n.F)] }),
  'extra-staff-for-deadline': n => { let ppl = 0; while (ppl * n.k * n.t < n.R) ppl++; return { show: int(ppl - n.p) + ' more people', inputs: [int(n.R), int(n.t), int(n.k), int(n.p)] }; },
  'tile-cost-with-waste': n => { let b = 0; while (b * n.c < n.a * 1.1 - 1e-9) b++; return { show: money0(b * n.pr), inputs: [int(n.a), int(n.c), money0(n.pr)] }; },
  'coupon-percent-better': n => ({ best: n.P * n.d / 100 > n.F ? 'a' : 'b', inputs: [money0(n.P), int(n.d), money0(n.F)] }),
  'coupon-fixed-better': n => ({ best: n.P * n.d / 100 > n.F ? 'a' : 'b', inputs: [money0(n.P), int(n.d), money0(n.F)] }),
  'job-offer-annual': n => ({ best: n.r * 40 * 52 > n.S ? 'a' : 'b', inputs: [money(n.r), money0(n.S)] }),
  'payment-plan-extra': n => ({ show: money0(n.m * n.q - n.P), inputs: [money0(n.P), int(n.m), money0(n.q)] }),
  'savings-months': n => { let mo = 0; while (n.have + mo * n.s < n.G) mo++; return { show: int(mo) + ' months', inputs: [money0(n.G), money0(n.have), money0(n.s)] }; },
  'shipping-threshold': n => ({ best: 'a', check: n.T + n.x >= n.F && n.T < n.F, inputs: [money0(n.T), money0(n.f), money0(n.F), money0(n.x)] }),
  'markup-then-sale': n => { const marked = n.C + n.C * n.m / 100; return { show: money(c2(marked - marked * n.d / 100)), inputs: [money0(n.C), int(n.m), int(n.d)] }; },
  'tolerance-check': n => { const ms = [n.d1, n.d2, n.d3, n.d4].map(d => n.S + d); const out = ms.map(m => Math.abs(m - n.S) > n.tol + 1e-9);
    return { best: 'abcd'[out.indexOf(true)], check: out.filter(Boolean).length === 1, inputs: [int(n.S), dec1(n.tol)].concat(ms.map(dec1)) }; },
  'reorder-point': n => ({ show: int(n.u * n.L + n.s) + ' items', inputs: [int(n.u), int(n.L), int(n.s)] }),
  'commute-net-hourly': n => ({ show: money(c2((n.r * n.h - n.c * n.d) / n.h)), inputs: [money0(n.r), int(n.h), money0(n.c), int(n.d)] }),
  'break-even': n => { let u = 0; while (u * (n.p - n.v) < n.F) u++; return { show: int(u) + ' items', inputs: [money0(n.F), money0(n.p), money0(n.v)] }; }
};

/* find configs: [expected correct value for the flagged line, displayed wrong value] and line checks */
const F = {
  'invoice-line': (n, segs) => { const bad = segs.l1, ok = segs.l2;
    return { badWrong: !bad.includes(money0(n.q1 * n.e1)), fineRight: ok.endsWith(money0(n.q2 * n.e2)) }; },
  'timesheet': (n, segs) => ({ badWrong: !segs.tot.includes(' ' + (n.a + n.b + n.c) + ' hours'), fineRight: true }),
  'change-log': (n, segs) => ({ badWrong: !segs.r2.endsWith(money0(50 - n.t2)), fineRight: segs.r1.endsWith(money0(20 - n.t1)) }),
  'overtime-doc': (n, segs) => ({ badWrong: !segs.ot.endsWith(money0((n.h - 40) * n.r * 1.5)) && !segs.ot.endsWith(money((n.h - 40) * n.r * 1.5)), fineRight: segs.reg.endsWith(money0(40 * n.r)) }),
  'sale-tax-doc': (n, segs) => { const sale = n.pr * (100 - n.d) / 100; return { badWrong: !segs.tax.endsWith(money(c2(sale * n.t / 100))), fineRight: segs.disc.endsWith(money(sale)) }; },
  'waste-doc': (n, segs) => { let b = 0; while (b * n.c < n.a * 1.1 - 1e-9) b++; return { badWrong: !segs.boxes.endsWith(': ' + b), fineRight: segs.waste.includes(dec1(n.a * 1.1)) }; },
  'net-pay-doc': (n, segs) => ({ badWrong: !segs.tax.endsWith(money0(n.g * n.t / 100)) && !segs.tax.endsWith(money(n.g * n.t / 100)), fineRight: true }),
  'reorder-doc': (n, segs) => ({ badWrong: !segs.rp.endsWith(': ' + (n.u * n.L + n.s)), fineRight: true }),
  'budget-summary': (n, segs) => ({ badWrong: !segs.pct.endsWith(pct(n.S / n.B * 100)), fineRight: segs.left.endsWith(money0(n.B - n.S)) })
};

const units = h.catalog.units.filter(u => u.engine === 'numeric');

test('oracle exists for every numeric config', () => {
  units.forEach(u => assert.ok(O[u.spec.config] || F[u.spec.config], 'no oracle for ' + u.spec.config));
});

for (const u of units) {
  test('numeric oracle: ' + u.spec.config + ' (' + u.difficulty + ', ' + DRAWS + ' draws)', () => {
    for (let i = 0; i < DRAWS; i++) {
      const c = SEL.renderUnit(h, u, { seed: 'oracle-' + i });
      assert.equal(SEL.validate(h, c), null, 'instance validates');
      const n = c.cx.numbers;
      if (c.mode === 'find') {
        const segs = {}; c.doc.segments.forEach(s => { segs[s.id] = s.text; });
        const r = F[u.spec.config](n, segs);
        assert.ok(r.badWrong, u.spec.config + ': flagged line is actually correct: ' + segs[c.key.problemId]);
        assert.ok(r.fineRight, u.spec.config + ': a non-flagged calculation line is wrong');
        continue;
      }
      const r = O[u.spec.config](n);
      const scen = c.scenario;
      r.inputs.forEach(v => assert.ok(shows(scen, v) || scen.includes(v), u.spec.config + ': input ' + v + ' not shown in "' + scen + '"'));
      const bestText = c.options.find(o => o.id === c.key.bestId).text;
      if (r.show !== undefined) {
        assert.ok(shows(bestText, r.show), u.spec.config + ': key "' + bestText + '" does not show ' + r.show);
        c.options.filter(o => o.id !== c.key.bestId).forEach(o => assert.ok(!shows(o.text, r.show), u.spec.config + ': distractor shows the correct value: ' + o.text));
      } else {
        if (r.check !== undefined) assert.ok(r.check, u.spec.config + ': scenario conditions do not hold');
        assert.equal(c.key.options[c.key.bestId].source, r.best, u.spec.config + ': oracle expects option ' + r.best);
      }
    }
  });
}
