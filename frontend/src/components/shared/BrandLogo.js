import React from 'react';

import logoPng1x from '../../assets/logo/logo.png';
import logoPng2x from '../../assets/logo/logo@2x.png';
import logoPng3x from '../../assets/logo/logo@3x.png';
import logoWebp1x from '../../assets/logo/logo.webp';
import logoWebp2x from '../../assets/logo/logo@2x.webp';
import logoWebp3x from '../../assets/logo/logo@3x.webp';

const WEBP_SRCSET = `${logoWebp1x} 1x, ${logoWebp2x} 2x, ${logoWebp3x} 3x`;
const PNG_SRCSET = `${logoPng1x} 1x, ${logoPng2x} 2x, ${logoPng3x} 3x`;

export default function BrandLogo({
  className,
  alt = 'Thunder Road Bar and Grill',
  sizes,
  width = 133,
  height = 80,
  loading = 'lazy',
  decoding = 'async'
}) {
  const imgClass = className || 'h-full w-auto object-contain';

  return (
    <picture>
      <source type="image/webp" srcSet={WEBP_SRCSET} sizes={sizes} />
      <img
        src={logoPng1x}
        srcSet={PNG_SRCSET}
        sizes={sizes}
        alt={alt}
        className={imgClass}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
      />
    </picture>
  );
}
