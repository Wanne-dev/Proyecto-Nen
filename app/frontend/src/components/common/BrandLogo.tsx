/* Marca BANCA NEN: archivo oficial del usuario, sin iconos de relleno. */
import fullLogo from "../../assets/brand/banca-nen-white.png?inline";
import markLogo from "../../assets/brand/banca-nen-mark.png?inline";

const SOURCES = { full: fullLogo, mark: markLogo } as const;
const SIZES = { full: [409, 113], mark: [144, 113] } as const;

interface Props {
  variant?: keyof typeof SOURCES;
  className?: string;
  alt?: string;
}

/** Logo oficial en modo claro sobre fondos oscuros; se usa en portal, acceso y portada. */
export default function BrandLogo({ variant = "full", className, alt = "BANCA NEN" }: Props) {
  const [width, height] = SIZES[variant];
  return <img src={SOURCES[variant]} alt={alt} width={width} height={height} className={className} draggable={false} />;
}
