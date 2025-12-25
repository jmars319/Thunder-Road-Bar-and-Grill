import PropTypes from 'prop-types';
import ErrorPageLayout from './ErrorPageLayout';
import {
  serviceName,
  contexts,
  supportEmail,
} from '../../config/errorBranding';

export default function NotFoundPage({ requestId, timestampUTC }) {
  return (
    <ErrorPageLayout
      title="We couldn’t find that page"
      description={contexts.default404}
      primaryAction={{ label: 'Go Home', href: '/' }}
      secondaryAction={{ label: 'Contact Support', href: `mailto:${supportEmail}` }}
      statusCode={404}
      serviceName={serviceName}
      timestampUTC={timestampUTC || new Date().toISOString()}
      requestId={requestId}
      supportEmail={supportEmail}
    />
  );
}

NotFoundPage.propTypes = {
  requestId: PropTypes.string,
  timestampUTC: PropTypes.string,
};
