"use client";
import { useState } from "react";
import { aliasInitials } from "@/lib/auth-rules";
export type AvatarSize = 28 | 40 | 48;
/**
 * Foto de la cuenta en un círculo (SPEC 15), con las iniciales del alias como
 * respaldo si no hay foto o si la imagen no carga. Es decorativa: el alias va
 * siempre al lado o en el `aria-label` del botón que la contiene.
 */
export function UserAvatar({
  name,
  avatarUrl,
  size,
}: {
  /** Alias, para las iniciales. */
  name: string;
  avatarUrl: string | null;
  size: AvatarSize;
}) {
  // URL que falló: si la foto cambia, se vuelve a intentar con la nueva.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = avatarUrl !== null && avatarUrl !== failedUrl;
  return (
    <span className="user-avatar" data-size={size} aria-hidden>
      {showPhoto ? (
        // `<img>` y no `next/image`: fotos externas pequeñas, sin tocar next.config.ts (SPEC 15).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        <span className="user-avatar-initials">{aliasInitials(name)}</span>
      )}
    </span>
  );
}
