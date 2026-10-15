import { useEffect, useState } from 'react';
import { I18N } from '../i18n.js';

/* A photo from a web address or an upload. Sent without a Referer, because many sites refuse to show their
   pictures to pages on other addresses ("hotlink protection"). Shows a placeholder when it cannot be loaded. */
export default function Photo({ src, alt = '', className, lazy = true, onState }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); if (onState) onState('loading'); }, [src]); // eslint-disable-line react-hooks/exhaustive-deps
  if (failed) {
    return <div className={(className || '') + ' photo-fail'} role="img" aria-label={alt || I18N.t('photo.failed')}><span>{I18N.t('photo.failed')}</span></div>;
  }
  return (
    <img className={className} src={src} alt={alt} referrerPolicy="no-referrer" loading={lazy ? 'lazy' : undefined}
      onLoad={() => onState && onState('ok')} onError={() => { setFailed(true); if (onState) onState('failed'); }} />
  );
}
