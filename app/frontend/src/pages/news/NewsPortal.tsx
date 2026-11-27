/* Contenido completo de la pestaña "Noticias": portal web + estimaciones orientativas. */
import TradingNews from "./TradingNews";
import Prediction from "../trading/Prediction";

export default function NewsPortal() {
  return (
    <div className="nen-news-page">
      <TradingNews />
      <section className="nen-news-page__forecast" aria-label="Estimaciones orientativas">
        <Prediction embedded />
      </section>
    </div>
  );
}
