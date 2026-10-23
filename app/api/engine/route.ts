import { NextResponse } from "next/server";

// Maestros Espirituales
const PERSONAS: Record<string, { nombres: string[]; quien: string; imagen: string; sitios: Array<[string, string]> }> = {
  sathya_sai_baba: {
    nombres: ["sathya sai baba", "sathya sai", "sai baba"],
    quien: 'Sri Sathya Sai Baba (1926–2011): Avatar moderno y encarnación del amor divino. Su enseñanza: "Ama a todos, sirve a todos".',
    imagen: "/avatar.jpg",
    sitios: [["SSSIO", "https://www.sathyasai.org/"]],
  },
  yogananda: {
    nombres: ["yogananda", "paramahansa yogananda"],
    quien: 'Paramahansa Yogananda (1893–1952): Autor de "Autobiografía de un yogui" y maestro de Kriya Yoga.',
    imagen: "/avatar.jpg",
    sitios: [["SRF", "https://yogananda.org/"]],
  },
  sadhguru: {
    nombres: ["sadhguru", "jaggi vasudev"],
    quien: "Sadhguru (Jaggi Vasudev): Yogui, místico y fundador de la Fundación Isha.",
    imagen: "/avatar.jpg",
    sitios: [["Isha Foundation", "https://isha.sadhguru.org/"]],
  },
};

// Álbumes y Recursos de Música Vimana
const ALBUMES: Record<string, { titulo: string; estilo: string; url: string }> = {
  ananda: {
    titulo: "Sat Chit Ananda (Álbum ANANDA)",
    estilo: "Música de Vimana: cantos y temas espirituales propios.",
    url: "https://vimana.rf.gd/SatChitAnanda.html",
  },
  soham: {
    titulo: "SO HAM",
    estilo: "Música moderna devocional hindu-latina.",
    url: "https://vimana.rf.gd/SOHAM.html",
  },
};

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ reply: "Consulta vacía." }, { status: 400 });
    }

    const qNorm = query.toLowerCase().trim();

    // 1. Prioridad Local: Búsqueda de Maestros
    for (const key in PERSONAS) {
      const p = PERSONAS[key];
      if (p.nombres.some((n) => qNorm.includes(n))) {
        return NextResponse.json({
          reply: p.quien,
          image: p.imagen,
          links: p.sitios,
        });
      }
    }

    // 2. Prioridad Local: Búsqueda de Música / Álbumes
    for (const key in ALBUMES) {
      const alb = ALBUMES[key];
      if (qNorm.includes(key) || qNorm.includes("musica") || qNorm.includes("album")) {
        return NextResponse.json({
          reply: `${alb.titulo} — ${alb.estilo}`,
          image: "/logo.png",
          links: [[alb.titulo, alb.url]],
        });
      }
    }

    // 3. Búsqueda Externa Transparente (SearXNG Fallback sin chocar con lo local)
    try {
      const searxUrl = process.env.SEARXNG_URL || "http://127.0.0.1:8888";
      const resEx = await fetch(`${searxUrl}/search?q=${encodeURIComponent(query)}&format=json`);
      if (resEx.ok) {
        const dataEx = await resEx.json();
        if (dataEx.results && dataEx.results.length > 0) {
          const topResult = dataEx.results[0];
          return NextResponse.json({
            reply: `${topResult.title}: ${topResult.content}`,
            image: "/logo.png",
            links: [[topResult.title, topResult.url]],
          });
        }
      }
    } catch {
      // SearXNG ndoikóirõ, me'ẽ mba'e porã
    }

    // Respuesta por defecto de Apsara
    return NextResponse.json({
      reply: "Información procesada desde el sistema Apsara Vimana.",
      image: "/logo.png",
      links: [],
    });
  } catch (err) {
    return NextResponse.json({ reply: "Error interno al procesar la consulta." }, { status: 500 });
  }
}