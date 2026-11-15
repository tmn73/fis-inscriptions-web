"use client";

import React, {useState} from "react";

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

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      width={60}
      height={60}
      onError={() => {
        if (current !== DEFAULT_ORGANIZATION_LOGO) setFailedSrc(configured);
      }}
    />
  );
};
