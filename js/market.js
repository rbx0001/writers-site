/**
 * WRITERS — $WRTRS
 * Live market signal (DexScreener). Read-only, factual, no advice.
 */
(function () {
  'use strict';

  var MINT = 'HWagQerEDV7L4877mPc3PxeS3aJ7aAx51s5t2txGpump';
  var ENDPOINT = 'https://api.dexscreener.com/tokens/v1/solana/' + MINT;
  var REFRESH_MS = 10000;

  function $(id) { return document.getElementById(id); }

  function set(id, text) { var el = $(id); if (el) el.textContent = text; }

  function fmtPrice(v) {
    if (!isFinite(v) || v <= 0) return '—';
    var digits = v >= 1 ? 2 : v >= 0.01 ? 4 : 8;
    return '$' + v.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
  }

  function fmtMoney(v) {
    if (!isFinite(v) || v < 0) return '—';
    if (v >= 1000000) return '$' + (v / 1000000).toFixed(2) + 'M';
    if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'K';
    return '$' + v.toFixed(2);
  }

  function bestPair(pairs) {
    if (!Array.isArray(pairs) || !pairs.length) return null;
    return pairs.slice().sort(function (a, b) {
      return ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0);
    })[0];
  }

  var failures = 0;

  function refresh() {
    var status = $('mkStatus');
    fetch(ENDPOINT, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (pairs) {
        var p = bestPair(pairs);
        if (!p) throw new Error('no pairs');
        set('mkPrice', fmtPrice(Number(p.priceUsd)));
        set('mkVolume', fmtMoney(Number(p.volume && p.volume.h24)));
        set('mkLiquidity', fmtMoney(Number(p.liquidity && p.liquidity.usd)));
        set('mkCap', fmtMoney(Number(p.marketCap || p.fdv)));
        failures = 0;
        if (status) {
          status.textContent = 'Live DEX Screener data • Updated ' +
            new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) +
            ' • Auto-refreshes every 10s • Verify independently before transacting.';
        }
      })
      .catch(function () {
        failures++;
        if (status) {
          status.textContent = failures < 3
            ? 'Refreshing live market data…'
            : 'Live market data is unavailable right now — check DexScreener directly before transacting.';
        }
      });
  }

  function start() {
    if (!$('mkPrice')) return;
    refresh();
    setInterval(function () { if (!document.hidden) refresh(); }, REFRESH_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
