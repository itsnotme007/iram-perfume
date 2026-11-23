// IRAM Perfume storefront test suite (baseline for main).
// Tests assert DESIRED behaviour: a few fail on the pre-fix baseline by design
// (they document bugs 1.1, 1.2, 1.5, 1.7, 1.8, 1.9, 1.3, 1.4).
const { test, expect } = require('@playwright/test');

const TOTAL = 251;

function watchErrors(page) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
  return errs;
}

async function cartCount(page) {
  return (await page.locator('#cartFloatCount').textContent()).trim();
}

// ---------------------------------------------------------------- catalogue
test('catalogue renders 251 cards + rows with accurate counts', async ({ page }, testInfo) => {
  const errs = watchErrors(page);
  await page.goto('/');
  await expect(page).toHaveTitle(/IRAM Perfume/);
  await expect(page.locator('.frag-cell')).toHaveCount(TOTAL);
  await expect(page.locator('.frag-card')).toHaveCount(TOTAL);
  await expect(page.locator('#filterCount')).toHaveText(/251 fragrances/);
  await expect(page.locator('#filterCountMobile')).toHaveText(/251 fragrances/);
  await expect(page.locator('#filterApply')).toHaveText(/Show all fragrances/);
  // raw (pre-JS) markup must never claim the old count
  const raw = await (await page.request.get('/')).text();
  expect(raw).not.toMatch(/147 fragrances/);
  expect(raw).toMatch(/Show 251 fragrances/);
  expect(errs).toEqual([]);
});

test('head + body encoding and homepage FAQ JSON-LD are clean', async ({ page }) => {
  await page.goto('/');
  const bad = await page.evaluate(() => {
    const hits = [];
    if (document.title.includes('\uFFFD')) hits.push('title');
    document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]')
      .forEach((m) => { if ((m.content || '').includes('\uFFFD') || /\?999/.test(m.content || '')) hits.push(m.getAttribute('property') || m.name); });
    if ((document.body.innerText || '').includes('\uFFFD')) hits.push('body');
    const blocks = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    let parsed = 0;
    for (const s of blocks) {
      const j = JSON.parse(s.textContent); // throws -> test fails
      parsed++;
      if (j['@type'] === 'FAQPage') {
        const text = JSON.stringify(j);
        if (text.includes('\uFFFD') || /\?999/.test(text)) hits.push('faq-jsonld');
      }
    }
    if (blocks.length < 2 || parsed < 2) hits.push('too-few-blocks');
    return hits;
  });
  expect(bad).toEqual([]);
});

// ---------------------------------------------------------------- filtering
test('gender filter narrows results (desktop UI / mobile URL)', async ({ page }, testInfo) => {
  const mob = testInfo.project.name === 'mobile';
  if (mob) {
    await page.goto('/?gender=Men');
    const state = await page.evaluate(() => {
      const visible = Array.from(document.querySelectorAll('.frag-card')).filter((c) => c.style.display !== 'none');
      return {
        total: document.querySelectorAll('.frag-card').length,
        visible: visible.length,
        allMen: visible.every((c) => c.getAttribute('data-gender') === 'Men')
      };
    });
    expect(state.total).toBe(TOTAL);
    expect(state.visible).toBeGreaterThan(0);
    expect(state.visible).toBeLessThan(TOTAL);
    expect(state.allMen).toBe(true);
  } else {
    await page.goto('/');
    await page.click('#filterTrigger');
    await page.click('.filter-btn[data-gender="Men"]');
    await page.click('#filterApply');
    const rows = page.locator('#filterResults tbody tr');
    await expect(rows.first()).toBeVisible();
    await expect(page.locator('#filterCount')).toHaveText(/\d+ fragrances? found/);
    await expect(page.locator('#filterApply')).toHaveText(/^Show \d+ fragrances?$/);
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(TOTAL);
    const expected = await page.locator('.frag-card[data-gender="Men"]').count();
    expect(n).toBe(expected);
    const allMen = await rows.evaluateAll((trs) => trs.every((r) => !!r.querySelector('.tag-men')));
    expect(allMen).toBe(true);
  }
});

test('taxonomy filter options return matches (gym + new moods)', async ({ page }) => {
  const cases = [
    ['occasion', 'gym'],
    ['mood', 'confident'],
    ['mood', 'energetic'],
    ['mood', 'mysterious'],
    ['mood', 'romantic'],
    ['mood', 'rich']
  ];
  for (const [k, v] of cases) {
    await page.goto('/?' + k + '=' + v);
    await page.waitForLoadState('load');
    await page.waitForTimeout(250);
    const r = await page.evaluate(([k, v]) => {
      const cards = Array.from(document.querySelectorAll('.frag-card'));
      const shown = cards.filter((c) => c.style.display !== 'none');
      return {
        total: cards.length,
        shown: shown.length,
        rows: document.querySelectorAll('#filterResults tbody tr').length,
        allMatch: shown.every((c) => (c.getAttribute('data-' + k) || '').split(',').includes(v))
      };
    }, [k, v]);
    expect(r.total).toBe(TOTAL);
    expect(r.shown).toBeGreaterThan(0);
    expect(r.rows).toBeGreaterThan(0);
    expect(r.allMatch).toBe(true);
  }
});

test('add to cart works from filtered desktop results', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop table filter flow');
  await page.goto('/');
  await page.click('#filterTrigger');
  await page.click('.filter-btn[data-gender="Men"]');
  await page.click('#filterApply');
  await page.locator('#filterResults .cart-btn:not([disabled])').first().click();
  await expect(page.locator('#sizeSelector')).toHaveClass(/open/);
  await page.locator('#sizeSelector input[name="ssSize"]').first().check();
  await expect(page.locator('#cartFloatCount')).toHaveText('1');
});

// ------------------------------------------------------- view mode vs filters
test('filtering never switches the catalogue view mode', async ({ page }) => {
  // Regression: applyFilter used to write an inline display onto .frag-table,
  // which overrode the body.catalogue-table CSS, so applying or clearing a
  // filter silently yanked the user between table and card view.
  await page.goto('/');
  await page.waitForTimeout(300);

  const state = () => page.evaluate(() => ({
    table: document.body.classList.contains('catalogue-table'),
    rows: [...document.querySelectorAll('.table-wrap>.frag-table tbody tr')]
      .filter((r) => r.style.display !== 'none' && r.querySelector('.frag-cell')).length,
    cards: [...document.querySelectorAll('.frag-card')].filter((c) => c.style.display !== 'none').length
  }));

  const total = (await state()).cards;
  expect(total).toBeGreaterThan(100);

  const clickView = (v) => page.evaluate((view) => {
    const btn = document.querySelector(`[data-catalogue-view="${view}"]`);
    if (btn) btn.click();
  }, v);
  const clearFilters = () => page.evaluate(() => {
    document.querySelectorAll('.filter-group .filter-btn[data-filter="all"]').forEach((b) => b.click());
  });

  // 1. in table view, filtering must keep table view
  await clickView('table');
  await page.waitForTimeout(250);
  expect((await state()).table).toBe(true);

  await page.evaluate(() => document.querySelector('.filter-btn[data-gender="Women"]').click());
  await page.waitForTimeout(400);
  let s = await state();
  expect(s.table).toBe(true);                    // view unchanged
  expect(s.rows).toBeLessThan(total);            // rows actually filtered
  expect(s.rows).toBe(s.cards);                  // table and cards agree

  // 2. clearing must also keep table view, and restore every row
  await clearFilters();
  await page.waitForTimeout(400);
  s = await state();
  expect(s.table).toBe(true);
  expect(s.rows).toBe(total);
  expect(s.cards).toBe(total);

  // 3. and the same holds starting from card view
  await clickView('grid');
  await page.waitForTimeout(250);
  expect((await state()).table).toBe(false);
  await page.evaluate(() => document.querySelector('.filter-btn[data-gender="Women"]').click());
  await page.waitForTimeout(400);
  s = await state();
  expect(s.table).toBe(false);
  expect(s.cards).toBeLessThan(total);
  expect(s.rows).toBe(s.cards);
});

// ---------------------------------------------------------------- sorting
test('price sort is global across brand blocks (desktop)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'table sort is desktop-only');
  await page.goto('/');
  await page.selectOption('#filterSort', 'low');
  // each catalogue table (Designer / Middle Eastern) must be sorted globally
  // across its brand blocks — brand-separator rows move with their products
  const runs = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.table-wrap>.frag-table').forEach((tbl) => {
      const costs = [];
      tbl.querySelectorAll('tbody tr').forEach((tr) => {
        if (tr.querySelector('.frag-cell') && typeof tr._pcCost === 'number') costs.push(tr._pcCost);
      });
      if (costs.length) out.push(costs);
    });
    return out;
  });
  // one table per catalogue section (Designer / Middle Eastern / Indian)
  expect(runs.length).toBeGreaterThanOrEqual(2);
  let total = 0;
  for (const costs of runs) {
    expect(costs.length).toBeGreaterThan(0);
    total += costs.length;
    let sorted = true;
    for (let i = 1; i < costs.length; i++) {
      if (costs[i] < costs[i - 1]) { sorted = false; break; }
    }
    expect(sorted).toBe(true);
  }
  expect(total).toBeGreaterThan(100); // every priced product row took part
});

// ---------------------------------------------------------------- desktop cart
test('table add-to-cart, drawer, clear (desktop)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'drawer flow uses the desktop FAB');
  const errs = watchErrors(page);
  await page.goto('/');
  await page.click('.desktop-view-toggle [data-catalogue-view="table"]');
  await page.locator('.table-wrap .cart-btn:not([disabled])').first().click();
  await expect(page.locator('#sizeSelector')).toHaveClass(/open/);
  await page.locator('#sizeSelector input[name="ssSize"]').first().check();
  await expect(page.locator('#cartFloatCount')).toHaveText('1');
  await page.click('#cartFloat');
  await expect(page.locator('#cartDrawer')).toBeVisible();
  await expect(page.locator('#cartDrawerBody .cart-item')).toHaveCount(1);
  await page.click('#cartClearBtn');
  await expect(page.locator('#cartFloatCount')).toHaveText('0');
  expect(errs).toEqual([]);
});

test('shipping cost follows subtotal + qty constants', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'shipping totals asserted on desktop');
  const cases = [
    // Cedrat Boise was used here until it was marked sold out; reconcileCart drops
    // items whose size is unavailable, so these cases use in-stock products.
    { name: 'qty 1 over 999 is NOT free', items: [{ brand: 'Mancera', frag: 'Gold Intensive Aoud', size: '30ml', price: 1899, qty: 1, key: 'Mancera|Gold Intensive Aoud|30ml' }], free: false },
    { name: 'qty 2 under 999 is NOT free', items: [{ brand: 'Davidoff', frag: 'Cool Water EDT', size: '3ml', price: 99, qty: 1, key: 'Davidoff|Cool Water EDT|3ml' }, { brand: 'Jaguar', frag: 'Classic Black', size: '3ml', price: 95, qty: 1, key: 'Jaguar|Classic Black|3ml' }], free: false },
    { name: 'qty 2 over 999 IS free', items: [{ brand: 'Mancera', frag: 'Gold Intensive Aoud', size: '30ml', price: 1899, qty: 1, key: 'Mancera|Gold Intensive Aoud|30ml' }, { brand: 'Davidoff', frag: 'Cool Water EDT', size: '3ml', price: 99, qty: 1, key: 'Davidoff|Cool Water EDT|3ml' }], free: true }
  ];
  for (const c of cases) {
    await test.step(c.name, async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.addInitScript((items) => {
        try { localStorage.setItem('iram_cart', JSON.stringify(items)); } catch (e) {}
      }, c.items);
      await page.goto('/');
      await expect(page.locator('#cartDrawerBody .cart-item')).toHaveCount(c.items.length);
      const ship = (await page.locator('#cartShipping').textContent()).trim();
      const progress = (await page.locator('#shipProgress').textContent()) || '';
      if (c.free) {
        expect(ship).toBe('FREE');
        expect(progress).toContain('Congratulations');
      } else {
        expect(ship).not.toContain('FREE');
        expect(ship).toMatch(/100/);
        expect(progress).not.toContain('Congratulations');
      }
      await ctx.close();
    });
  }
});

test('stale cart price is re-priced from current data', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'drawer body asserted on desktop');
  await page.addInitScript((items) => {
    try { localStorage.setItem('iram_cart', JSON.stringify(items)); } catch (e) {}
  }, [{ brand: 'Afnan', frag: 'Turathi Brown', size: '30ml', price: 111, qty: 1, key: 'Afnan|Turathi Brown|30ml' }]);
  await page.goto('/');
  await expect(page.locator('#cartDrawerBody .cart-item')).toHaveCount(1);
  const text = (await page.locator('#cartDrawerBody').textContent()) || '';
  expect(text).toContain('919');   // current 30ml price
  expect(text).not.toContain('111');
});

test('duplicate decant asks for confirmation before adding', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto('/');
  await page.waitForTimeout(300);

  const cart = () => page.evaluate(() => JSON.parse(localStorage.getItem('iram_cart') || '[]'));
  const asking = () => page.evaluate(() => {
    const s = document.getElementById('pcDupSheet');
    return !!(s && s.classList.contains('open'));
  });

  // first add: goes straight in, no prompt
  await page.evaluate(() => window.__iramAddToCart('Afnan', 'Turathi Blue', '5ml', 185, 1));
  expect(await asking()).toBe(false);
  expect((await cart()).length).toBe(1);

  // same size again: prompt, and nothing is written until confirmed
  await page.evaluate(() => window.__iramAddToCart('Afnan', 'Turathi Blue', '5ml', 185, 1));
  expect(await asking()).toBe(true);
  expect((await cart())[0].qty).toBe(1);
  await page.click('#pcDupCancel');
  expect(await asking()).toBe(false);
  expect((await cart())[0].qty).toBe(1);          // declined -> unchanged

  await page.evaluate(() => window.__iramAddToCart('Afnan', 'Turathi Blue', '5ml', 185, 1));
  await page.click('#pcDupConfirm');
  expect((await cart())[0].qty).toBe(2);          // confirmed -> qty 2

  // different size of the same perfume: prompt, then a second cart line
  await page.evaluate(() => window.__iramAddToCart('Afnan', 'Turathi Blue', '10ml', 349, 1));
  expect(await asking()).toBe(true);
  expect((await cart()).length).toBe(1);
  await page.click('#pcDupConfirm');
  const after = await cart();
  expect(after.length).toBe(2);
  expect(after.map((x) => x.size).sort()).toEqual(['10ml', '5ml']);

  // a different perfume is not a duplicate
  await page.evaluate(() => window.__iramAddToCart('Afnan', 'Turathi Brown', '5ml', 185, 1));
  expect(await asking()).toBe(false);
  expect((await cart()).length).toBe(3);
});

test('renamed product resolves by stable id, not display name', async ({ page }) => {
  // Regression: a rename changed `name` but not `key`, so a saved cart item whose
  // `frag` is the old name used to be marked Unavailable. Cart must key on the
  // stable product id, never the display name.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('iram_cart', JSON.stringify([
        { key: 'Arabiyat Prestige|Marwa Extrait|30ml', brand: 'Arabiyat Prestige', frag: 'Marwa Extrait', size: '30ml', price: 1799, qty: 1 }
      ]));
    } catch (e) {}
  });
  await page.goto('/');
  await page.waitForTimeout(300);

  const item = await page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem('iram_cart') || '[]');
    return c[0] || {};
  });
  // still present, not flagged unavailable, and its pid was normalised
  expect(item.unavailable).toBeFalsy();
  expect(item.pid).toBe('Arabiyat Prestige|Marwa Extrait');

  // fresh add also stores the stable pid
  await page.evaluate(() => {
    const prod = window._products['Arabiyat Prestige|Marwa Extrait'];
    if (prod) window.__iramAddToCart(prod.brand, prod.frag, '30ml', 1799, 1, prod.id);
  });
  const fresh = await page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem('iram_cart') || '[]');
    return c[0] || {};
  });
  expect(fresh.pid).toBe('Arabiyat Prestige|Marwa Extrait');
  expect(fresh.unavailable).toBeFalsy();
});

test('cart survives corrupted localStorage', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('iram_cart', '{oops'); } catch (e) {} });
  await page.goto('/');
  const result = await page.evaluate(() => {
    if (typeof window.__iramAddToCart !== 'function') return 'missing';
    try { window.__iramAddToCart('Lattafa', 'Corrupt Test', '3ml', 115, 1); } catch (e) { return 'threw:' + e.message; }
    let c;
    try { c = JSON.parse(localStorage.getItem('iram_cart') || '[]'); } catch (e) { return 'still-corrupt'; }
    return Array.isArray(c) && c.length === 1 ? 'ok' : 'bad-length';
  });
  expect(result).toBe('ok');
});

test('cart works with cleared storage', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    if (typeof window.__iramAddToCart !== 'function') return 'missing';
    window.__iramAddToCart('Lattafa', 'Fresh Test', '3ml', 115, 1);
    const c = JSON.parse(localStorage.getItem('iram_cart') || '[]');
    return Array.isArray(c) && c.length === 1 ? 'ok' : 'bad';
  });
  expect(result).toBe('ok');
});

// ---------------------------------------------------------------- dark mode
test('dark-mode unavailable price contrast is >= 3:1', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'table price contrast checked on desktop');
  await page.goto('/');
  await page.click('.desktop-theme');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.click('.desktop-view-toggle [data-catalogue-view="table"]');
  await page.waitForTimeout(700); // let the 0.3s background transition settle
  const ratio = await page.evaluate(() => {
    const el = document.querySelector('.table-wrap .u-price') || document.querySelector('.table-wrap .size-cell s');
    if (!el || !el.offsetParent) return { missing: true };
    const parse = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => {
      const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };
    const fg = parse(getComputedStyle(el).color);
    let node = el, bg = null;
    while (node && !bg) {
      const c = getComputedStyle(node).backgroundColor;
      const p = parse(c);
      if (c !== 'rgba(0, 0, 0, 0)' && p.length === 3) bg = p;
      node = node.parentElement;
    }
    if (!bg) bg = parse(getComputedStyle(document.documentElement).backgroundColor);
    if (!bg || bg.length !== 3) bg = [22, 27, 34];
    const l1 = lum(fg), l2 = lum(bg);
    return { ratio: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) };
  });
  expect(ratio.missing).toBeFalsy();
  expect(ratio.ratio).toBeGreaterThanOrEqual(3);
});

// ---------------------------------------------------------------- search
test('search returns matching results', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop header search');
  await page.goto('/');
  await page.fill('#searchInput', 'hawas');
  await expect(page.locator('#searchResults')).toHaveClass(/open/);
  const items = page.locator('#searchResults .search-result-item');
  expect(await items.count()).toBeGreaterThan(0);
  const first = (await items.first().textContent()) || '';
  expect(first.toLowerCase()).toContain('hawas');
});

// ------------------------------------------------- search result navigation
// A picked search result must scroll to its own card, keyed on the stable
// product id rather than a brand|name string, and survive:
//  - products at either end of a 243-row catalogue,
//  - filters that would otherwise hide the card,
//  - rapid successive picks,
//  - content-visibility:auto, whose estimated heights reflow the page mid-scroll.
const searchHelpers = (page, mobile) => {
  const input = mobile ? '#mobileSearchInput' : '#searchInput';
  const results = mobile ? '#mobileSearchResults' : '#searchResults';
  const openSearch = async () => {
    if (mobile) await page.locator('[data-mobile-search]').first().click();
  };
  const pick = async (product) => {
    await openSearch();
    // install the highlight probe BEFORE clicking, so the mutation that adds the
    // class cannot be missed (it is removed again 1.8s later)
    const target = page.locator(`.frag-card[data-product-id="${product.id}"]`).first();
    await target.evaluate((el) => {
      if (el._hlProbe) el._hlProbe.disconnect();
      el._hlSeen = el.classList.contains('search-target-highlight');
      const mo = new MutationObserver(() => {
        if (el.classList.contains('search-target-highlight')) el._hlSeen = true;
      });
      mo.observe(el, { attributes: true, attributeFilter: ['class'] });
      el._hlProbe = mo;
    });
    await page.fill(input, '');
    await page.fill(input, product.name);
    const item = page.locator(`${results} .search-result-item[data-product-id="${product.id}"]`);
    await expect(item).toBeVisible();
    await item.click();
  };
  // Geometric check: content-visibility:auto cards confuse Playwright's
  // IntersectionObserver-based toBeInViewport, so assert the outcome directly.
  // Record the highlight via a MutationObserver installed by pick() before the
  // click: the class is removed 1.8s after it appears, and a slow poll can
  // easily sample either side of it and never see in-view and highlighted at
  // the same instant.
  const landsHighlighted = async (id) => {
    const target = page.locator(`.frag-card[data-product-id="${id}"]`).first();
    // the card must end up on screen
    await expect.poll(async () => target.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0 && r.height > 0;
    }), { timeout: 15000 }).toBe(true);
    // and it must have been highlighted at some point during navigation
    await expect.poll(async () => target.evaluate((el) => el._hlSeen === true), { timeout: 15000 }).toBe(true);
  };
  return { pick, landsHighlighted };
};

test('search result navigates by product ID from both ends of the catalogue', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile';
  const { pick, landsHighlighted } = searchHelpers(page, mobile);
  await page.goto('/');
  const ids = await page.locator('.frag-card').evaluateAll((cards) => {
    const at = [0, Math.floor((cards.length - 1) / 2), cards.length - 1];
    return at.map((i) => ({
      id: cards[i].getAttribute('data-pid'),
      name: cards[i].querySelector('.card-frag-name').textContent.trim()
    }));
  });
  for (const product of [ids[0], ids[1], ids[2], ids[1], ids[0]]) {
    await pick(product);
    await landsHighlighted(product.id);
  }
});

test('search clears only conflicting filters and navigates after sort', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile';
  const { pick, landsHighlighted } = searchHelpers(page, mobile);
  await page.goto('/');
  const product = await page.locator('.frag-card').evaluateAll((cards) => {
    const card = cards.find((c) => c.dataset.brand !== 'Afnan' && c.dataset.gender !== 'Women' &&
      Number(c.dataset.price) > 55 && c.querySelector('.pc-add:not([disabled])'));
    return card && { id: card.getAttribute('data-pid'), name: card.querySelector('.card-frag-name').textContent.trim() };
  });
  expect(product).toBeTruthy();
  await page.locator('.filter-btn[data-brand="Afnan"]').evaluate((el) => el.click());
  await page.locator('.filter-btn[data-gender="Women"]').evaluate((el) => el.click());
  await page.locator('.filter-btn[data-stock="instock"]').evaluate((el) => el.click());
  await page.evaluate(() => { window.__setPriceRange('50-55'); window.__applyFilter(); window.__applySort('low'); });
  await pick(product);
  await landsHighlighted(product.id);
  const state = await page.evaluate(() => window.__filterState);
  expect(state.brand).toBe('all');
  expect(state.gender).toBe('all');
  expect(state.price).toBe('all');
  expect(state.stock).toBe('instock');
});

test('rapid search picks finish at the most recently selected product', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile';
  const { pick, landsHighlighted } = searchHelpers(page, mobile);
  await page.goto('/');
  const products = await page.locator('.frag-card').evaluateAll((cards) => [
    cards[0], cards[cards.length - 1]
  ].map((card) => ({
    id: card.getAttribute('data-pid'),
    name: card.querySelector('.card-frag-name').textContent.trim()
  })));
  await pick(products[0]);
  await landsHighlighted(products[0].id);   // let the first navigation settle
  await pick(products[1]);
  await landsHighlighted(products[1].id);
});

test('search navigation lands on the card despite content-visibility estimates', async ({ page }, testInfo) => {
  // Off-screen cards have only ESTIMATED heights under content-visibility:auto,
  // and those estimates resolve as the smooth scroll proceeds. The page grew
  // ~7,000px mid-animation, so the scroll landed short and the highlight fired
  // after the card had already slid past. Mid/end-of-catalogue picks reproduce it.
  const mobile = testInfo.project.name === 'mobile';
  const { pick, landsHighlighted } = searchHelpers(page, mobile);
  await page.goto('/');
  const picks = await page.locator('.frag-card').evaluateAll((cards) => {
    const at = [Math.floor(cards.length * 0.35), Math.floor(cards.length * 0.6), cards.length - 1];
    return at.map((i) => ({
      id: cards[i].getAttribute('data-pid'),
      name: cards[i].querySelector('.card-frag-name').textContent.trim()
    }));
  });
  for (const product of picks) {
    await pick(product);
    await landsHighlighted(product.id);
  }
});

// ---------------------------------------------------------------- mobile UX
test('bestsellers rail and 3ml price list render', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#bestsellers .best-card')).toHaveCount(12);
  await expect(page.locator('#bestsellers .best-card[data-pid]')).toHaveCount(12);
  // 3ml list stays hidden until the hero banner CTA reveals it.
  await expect(page.locator('#threeMl')).toBeHidden();
  await expect(page.locator('#threeMlList .three-ml-row')).toHaveCount(251);
  await page.evaluate(() => document.querySelector('.mobile-hero a[href="#threeMl"]').click());
  await expect(page.locator('#threeMl')).toBeVisible();
  await expect(page.locator('#threeMlList')).toHaveClass(/three-ml-open/);
  await expect(page.locator('#threeMlMore')).toHaveAttribute('aria-expanded', 'true');
  await page.click('#threeMlMore');
  await expect(page.locator('#threeMlList')).not.toHaveClass(/three-ml-open/);
  await expect(page.locator('#threeMlMore')).toHaveAttribute('aria-expanded', 'false');
});

test('mobile: bottom nav, product sheet, qty stepper, add to cart', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only flows');
  const errs = watchErrors(page);
  await page.goto('/');
  for (const id of ['#navHome', '#navBrands', '#navCompare', '#navWishlist']) {
    await expect(page.locator(id)).toBeVisible();
  }
  await page.locator('.frag-card:not(.pc-sold) .pc-name').first().click();
  await expect(page.locator('#pcProductSheet')).toBeVisible();
  await expect(page.locator('#pcProductSheet .pc-trust')).toBeVisible();
  if (await page.locator('#pcProductSheet .pc-refs').count()) {
    await expect(page.locator('#pcProductSheet .pc-refs')).toBeVisible();
  }
  await page.click('#pcQtyPlus');
  await expect(page.locator('#pcQtyVal')).toHaveText('2');
  await page.click('#pcAddBtn');
  await expect(page.locator('#cartFloatCount')).toHaveText('2');
  await expect(page.locator('#mobileCartBar')).toBeVisible();
  expect(errs).toEqual([]);
});

test('mobile: compare and wishlist sheets work', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only flows');
  await page.goto('/');
  await page.locator('.pc-cmp').nth(0).click();
  await page.locator('.pc-cmp').nth(1).click();
  let ls = await page.evaluate(() => JSON.parse(localStorage.getItem('iram_compare') || '[]'));
  expect(ls.length).toBe(2);
  await page.click('#navCompare');
  await expect(page.locator('#pcCmpSheet')).toBeVisible();
  await page.click('#pcCmpClose');
  await page.locator('.pc-wish').first().click();
  ls = await page.evaluate(() => JSON.parse(localStorage.getItem('iram_wishlist') || '[]'));
  expect(ls.length).toBe(1);
  await page.click('#navWishlist');
  await expect(page.locator('#pcWishSheet')).toBeVisible();
});

test('mobile: search overlay finds products', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only flow');
  await page.goto('/');
  await page.locator('[data-mobile-search]').first().click();
  await page.fill('#mobileSearchInput', 'khamrah');
  await expect(page.locator('#mobileSearchResults')).toHaveClass(/open/);
  expect(await page.locator('#mobileSearchResults .search-result-item').count()).toBeGreaterThan(0);
});

// ---------------------------------------------------------------- detail pages
test('fragrance detail page renders with schema, prices and FAQ', async ({ page }) => {
  const errs = watchErrors(page);
  await page.goto('/fragrance/afnan-turathi-brown.html');
  await expect(page.locator('h1')).toContainText('Turathi');
  await expect(page.locator('td:has-text("30ml")').first()).toBeVisible();
  expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThanOrEqual(3);
  expect(await page.locator('details.qa').count()).toBeGreaterThan(0);
  const ok = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (const s of blocks) JSON.parse(s.textContent);
    return blocks.length;
  });
  expect(ok).toBeGreaterThanOrEqual(3);
  expect(errs).toEqual([]);
});

// ---------------------------------------------------------------- bottles page
test('bottle options page: stats render, chips switch, add to cart survives home', async ({ page }) => {
  const errs = watchErrors(page);
  await page.goto('/bottles.html');
  await expect(page).toHaveTitle(/Bottle Options/);
  await expect(page.locator('#statTotal')).toHaveText(String(TOTAL));
  await expect(page.locator('#statBrands')).toHaveText('40');
  await expect(page.locator('.bottle-card')).toHaveCount(5);
  const out = page.locator('.bottle-card[data-bottle="group"] [data-price-out]');
  await expect(out).toHaveText('\u20B915');
  await page.locator('.bottle-card[data-bottle="group"] .bottle-opt[data-frag="Metal Gold Atomizer Bottle"]').click();
  await expect(out).toHaveText('\u20B925');
  await page.locator('.bottle-card[data-bottle="group"] .bottle-add').click();
  await expect(page.locator('#toastRoot .toast')).toBeVisible();
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('iram_cart') || '[]'));
  expect(cart).toHaveLength(1);
  expect(cart[0]).toMatchObject({ key: 'Bottles|Metal Gold Atomizer Bottle|3ml', brand: 'Bottles', frag: 'Metal Gold Atomizer Bottle', size: '3ml', price: 25, qty: 1 });
  await page.goto('/');
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('iram_cart') || '[]'));
  expect(after).toHaveLength(1);
  expect(after[0].frag).toBe('Metal Gold Atomizer Bottle');
  expect(await cartCount(page)).not.toBe('0');
  expect(errs).toEqual([]);
});

// ---------------------------------------------------------------- brand pages
test('brand landing page: products, FAQ, schema and working breadcrumb', async ({ page }) => {
  const errs = watchErrors(page);
  await page.goto('/brands/lattafa.html');
  await expect(page).toHaveTitle(/Lattafa Perfume Decants/);
  await expect(page.locator('h1')).toContainText('Lattafa');
  const canon = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canon).toBe('https://iramperfume.in/brands/lattafa.html');
  const links = page.locator('.grid a.rel[href*="../fragrance/"]');
  expect(await links.count()).toBeGreaterThan(0);
  await expect(page.locator('details.qa').first()).toBeVisible();
  const types = await page.evaluate(() => Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .map((s) => { try { return JSON.parse(s.textContent)['@type']; } catch (e) { return 'invalid'; } }));
  expect(types).toEqual(expect.arrayContaining(['CollectionPage', 'BreadcrumbList', 'FAQPage']));
  const href = await links.first().getAttribute('href');
  const url = href.replace('../', '/');
  const res = await page.request.get(url);
  expect(res.status()).toBe(200);
  expect(errs).toEqual([]);
});

test('product breadcrumb links to its brand landing page', async ({ page }) => {
  await page.goto('/fragrance/lattafa-khamrah.html');
  const brandLink = page.locator('nav.crumbs a[href*="../brands/"]');
  await expect(brandLink).toHaveAttribute('href', '../brands/lattafa.html');
  const res = await page.request.get('/brands/lattafa.html');
  expect(res.status()).toBe(200);
});
