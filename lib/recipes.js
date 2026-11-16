/**
 * Recetas / productos vegetarianos
 * - Open Food Facts: gratis, sin key
 * - Edamam Recipe Search: opcional (EDAMAM_APP_ID + EDAMAM_APP_KEY)
 */
function norm(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isRecipeQuery(n) {
  const x = norm(n);
  return /\b(receta|recetas|cocinar|comida vegetariana|plato vegetariano|menu vegetariano|menú vegetariano|vegan|vegano|vegetariano|vegetarian)\b/.test(
    x
  );
}

async function searchOpenFoodFacts(q) {
  const url =
    'https://world.openfoodfacts.org/cgi/search.pl?search_terms=' +
    encodeURIComponent(q) +
    '&search_simple=1&action=process&json=1&page_size=6&fields=product_name,brands,url,image_front_small_url,nutriscore_grade,labels_tags,ingredients_text';
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'ApsaraVimana/1.0 (community)' },
    });
    clearTimeout(to);
    if (!res.ok) return [];
    const data = await res.json();
    const products = Array.isArray(data.products) ? data.products : [];
    return products
      .filter((p) => p && p.product_name)
      .slice(0, 5)
      .map((p) => ({
        name: p.product_name,
        brand: p.brands || '',
        url: p.url || 'https://world.openfoodfacts.org',
        labels: (p.labels_tags || []).slice(0, 4).join(', '),
      }));
  } catch (_) {
    clearTimeout(to);
    return [];
  }
}

async function searchEdamam(q) {
  const id = (process.env.EDAMAM_APP_ID || '').trim();
  const key = (process.env.EDAMAM_APP_KEY || '').trim();
  if (!id || !key) return null;
  const url =
    'https://api.edamam.com/api/recipes/v2?type=public&q=' +
    encodeURIComponent(q) +
    '&app_id=' +
    encodeURIComponent(id) +
    '&app_key=' +
    encodeURIComponent(key) +
    '&health=vegetarian&lang=es';
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'Edamam-Account-User': id } });
    if (!res.ok) return [];
    const data = await res.json();
    const hits = Array.isArray(data.hits) ? data.hits : [];
    return hits.slice(0, 5).map((h) => {
      const r = h.recipe || {};
      return {
        name: r.label || 'Receta',
        url: r.url || r.shareAs || '',
        source: r.source || '',
      };
    });
  } catch (_) {
    return [];
  }
}

async function tryRecipes(pregunta) {
  const n = norm(pregunta);
  if (!isRecipeQuery(n)) return null;

  let q = n
    .replace(/\b(receta|recetas|de|del|la|el|una|quiero|busco|recomendame|recomienda|vegetariana|vegetariano|vegana|vegano)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'vegetariano';

  const edamam = await searchEdamam(q);
  if (edamam && edamam.length) {
    const lines = edamam.map((r, i) => (i + 1) + '. ' + r.name + (r.source ? ' (' + r.source + ')' : ''));
    return {
      reply:
        'Recetas vegetarianas (Edamam)\n\n' +
        lines.join('\n') +
        '\n\nAbre los enlaces para ver la preparación completa. Uso educativo; adapta a tu salud.',
      links: edamam.filter((r) => r.url).map((r) => ({ t: r.name, u: r.url })),
      options: ['receta vegetariana lentejas', 'receta vegana', 'ayuda'],
    };
  }

  const products = await searchOpenFoodFacts(q + ' vegetarian');
  if (products.length) {
    const lines = products.map((p, i) => {
      return (
        i +
        1 +
        '. ' +
        p.name +
        (p.brand ? ' — ' + p.brand : '') +
        (p.labels ? '\n   Etiquetas: ' + p.labels : '')
      );
    });
    return {
      reply:
        'Productos / referencias vegetarianas (Open Food Facts)\n\n' +
        lines.join('\n\n') +
        '\n\nBase abierta de productos. Para recetas paso a paso puedes pedir: receta vegetariana de lentejas.\n' +
        '(Edamam opcional: EDAMAM_APP_ID y EDAMAM_APP_KEY en Render.)',
      links: products.map((p) => ({ t: p.name, u: p.url })),
      options: ['receta vegetariana', 'producto vegano', 'ayuda'],
    };
  }

  return {
    reply:
      'No encontré resultados ahora. Prueba: receta vegetariana lentejas, hummus vegano, o configura Edamam en Render para más recetas en español.',
    links: [
      { t: 'Open Food Facts (ES)', u: 'https://es.openfoodfacts.org' },
      { t: 'Edamam desarrolladores', u: 'https://developer.edamam.com' },
    ],
    options: ['ayuda'],
  };
}

module.exports = { tryRecipes, isRecipeQuery };
