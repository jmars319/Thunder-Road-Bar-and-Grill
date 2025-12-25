import PropTypes from 'prop-types';

/**
 * Shared layout for branded error pages.
 *
 * Keeps presentation consistent across 404 and 5xx states while allowing the
 * caller to swap copy/actions.
 */
export default function ErrorPageLayout({
  title,
  description,
  primaryAction,
  secondaryAction,
  statusCode,
  serviceName,
  timestampUTC,
  requestId,
  supportEmail,
}) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl bg-surface-raised rounded-2xl shadow-lg border border-border/40 p-8 space-y-8">
        <div>
          <p className="uppercase tracking-widest text-xs font-semibold text-primary mb-2">
            {serviceName}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
            {title}
          </h1>
          <p className="text-text-secondary text-lg">{description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {primaryAction && (
            <a
              href={primaryAction.href}
              className="px-5 py-3 rounded-full bg-primary text-text-inverse font-semibold shadow-md hover:bg-primary-light transition"
            >
              {primaryAction.label}
            </a>
          )}
          {secondaryAction && (
            <a
              href={secondaryAction.href}
              className="px-5 py-3 rounded-full border border-border text-text-primary font-semibold hover:bg-surface hover:border-primary transition"
            >
              {secondaryAction.label}
            </a>
          )}
        </div>

        <div className="bg-surface p-5 rounded-xl border border-border/30">
          <p className="text-sm font-semibold text-text-primary mb-3">Error details</p>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-text-secondary">
            <div>
              <dt className="uppercase text-xs tracking-wide text-text-muted">Status Code</dt>
              <dd className="text-text-primary font-mono text-base">{statusCode}</dd>
            </div>
            <div>
              <dt className="uppercase text-xs tracking-wide text-text-muted">Timestamp (UTC)</dt>
              <dd className="text-text-primary font-mono">{timestampUTC}</dd>
            </div>
            <div>
              <dt className="uppercase text-xs tracking-wide text-text-muted">Request ID</dt>
              <dd className="text-text-primary font-mono break-all">
                {requestId || 'Not available'}
              </dd>
            </div>
            <div>
              <dt className="uppercase text-xs tracking-wide text-text-muted">Service</dt>
              <dd className="text-text-primary font-mono">{serviceName}</dd>
            </div>
          </dl>
        </div>

        {supportEmail && (
          <p className="text-sm text-text-secondary">
            Need help? Email{' '}
            <a className="text-primary underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}

ErrorPageLayout.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  primaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    href: PropTypes.string.isRequired,
  }),
  secondaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    href: PropTypes.string.isRequired,
  }),
  statusCode: PropTypes.number.isRequired,
  serviceName: PropTypes.string.isRequired,
  timestampUTC: PropTypes.string.isRequired,
  requestId: PropTypes.string,
  supportEmail: PropTypes.string,
};
