/**
 * Distintivo de marca guardada con sesión iniciada (SPEC 14): rombo cian en
 * pixel-art junto al nombre. Es un SVG y no el carácter «◆» porque la fuente
 * pixel no tiene todos los glifos. El texto accesible lo da el `sr-only`.
 */
export function AccountBadge() {
  return (
    <span className="account-badge" title="Jugador con cuenta">
      <svg viewBox="0 0 8 8" aria-hidden shapeRendering="crispEdges">
        <path
          fill="currentColor"
          d="M3 0h2v1h1v1h1v1h1v2H7v1H6v1H5v1H3V7H2V6H1V5H0V3h1V2h1V1h1z"
        />
      </svg>
      <span className="sr-only">jugador con cuenta</span>
    </span>
  );
}
