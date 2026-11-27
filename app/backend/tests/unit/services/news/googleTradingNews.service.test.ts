import { afterEach, describe, expect, it, vi } from "vitest";
import { conditionNewsQuery, fetchTradingNews } from "../../../../src/services/news/googleTradingNews.service";

const XML = `<rss><channel>
  <item>
    <title><![CDATA[Bitcoin supera máximos & sube]]></title>
    <link>https://news.google.com/rss/articles/abc?oc=5</link>
    <guid isPermaLink="false">guid-abc</guid>
    <pubDate>Tue, 24 Nov 2026 16:47:22 GMT</pubDate>
    <description>&lt;a href="https://news.google.com/rss/articles/abc"&gt;Bitcoin supera máximos &amp; sube&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;CoinDesk&lt;/font&gt;</description>
    <source url="https://www.coindesk.com">CoinDesk</source>
  </item>
</channel></rss>`;

const fetchMock = vi.fn();

const respond = (body: string, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => body });

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("Portal de noticias de trading", () => {
  it("condiciona toda búsqueda del usuario al contexto financiero", () => {
    expect(conditionNewsQuery("Dólar")).toBe("(Dólar) AND (trading OR mercado OR bolsa OR cripto OR forex OR economia OR inversion)");
    expect(conditionNewsQuery("   ", "forex")).toBe("divisas forex OR dolar OR reserva federal");
    expect(conditionNewsQuery(undefined, "stocks")).toBe("bolsa de valores OR wall street OR sp500");
  });

  it("consulta el feed en español y devuelve noticias con enlace, medio, fecha y snippet limpio", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(respond(XML));

    const feed = await fetchTradingNews("bitcoin-noticia-unica", "crypto");
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("https://news.google.com/rss/search?q=");
    expect(url).toContain(encodeURIComponent("(bitcoin-noticia-unica) AND (trading OR mercado OR bolsa OR cripto OR forex OR economia OR inversion)"));
    expect(url).toContain("hl=es-419&gl=CO&ceid=CO:es-419");
    expect(feed.source).toBe("Google News RSS");
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]).toMatchObject({
      title: "Bitcoin supera máximos & sube",
      link: "https://news.google.com/rss/articles/abc?oc=5",
      source: "CoinDesk",
      pubDate: "2026-11-24T16:47:22.000Z",
    });
    expect(feed.items[0].snippet).toContain("CoinDesk");
    expect(feed.items[0].snippet).not.toContain("<");
    expect(feed.items[0].image).toContain("google.com/s2/favicons?domain=www.coindesk.com");
    expect(feed.items[0].id).toMatch(/^[a-f0-9]{8}$/);
  });

  it("responde desde caché en búsquedas repetidas", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(respond(XML));
    const query = "ethereum-cache-unica";
    expect((await fetchTradingNews(query)).cached).toBe(false);
    expect((await fetchTradingNews(query)).cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("devuelve una lista vacía si el feed está malformado", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(respond("<rss><channel><item><title>Sin link</title></item></channel></rss>"));
    const feed = await fetchTradingNews("mercado-malformado-unico");
    expect(feed.items).toEqual([]);
  });
});
