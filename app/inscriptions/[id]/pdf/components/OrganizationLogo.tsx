"use client";

import React, {useEffect, useRef, useState} from "react";

export const DEFAULT_ORGANIZATION_LOGO = "/pdf/ffs-logo.png";

type OrganizationLogoProps = {
  src?: string | null;
  alt: string;
};

// Plain <img> on purpose: the logo is captured into the PDF by html2canvas, and next/image would route a
// configured logo URL through /_next/image, which shows a broken image when the remote file cannot be fetched.
// If the configured logo does not load, fall back to the bundled logo instead of showing the alt text.
export const OrganizationLogo = ({src, alt}: OrganizationLogoProps) => {
  const configured = src || DEFAULT_ORGANIZATION_LOGO;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const current = failedSrc === configured ? DEFAULT_ORGANIZATION_LOGO : configured;
  const imageRef = useRef<HTMLImageElement>(null);

  // The image is part of the server-rendered page: if it fails to load before React takes over, onError never
  // fires. Check once on mount whether it has already failed.
  useEffect(() => {
    const image = imageRef.current;
    if (!image || !image.complete || image.naturalWidth !== 0 || current === DEFAULT_ORGANIZATION_LOGO) return;
    let cancelled = false;
    // Deferred on purpose: no state change synchronously inside the effect.
    queueMicrotask(() => {
      if (!cancelled) setFailedSrc(configured);
    });
    return () => {
      cancelled = true;
    };
  }, [configured, current]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imageRef}
      src={current}
      alt={alt}
      width={60}
      style={{width: 60, height: "auto"}}
      onError={() => {
        if (current !== DEFAULT_ORGANIZATION_LOGO) setFailedSrc(configured);
      }}
    />
  );
};
