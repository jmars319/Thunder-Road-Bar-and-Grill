import PropTypes from 'prop-types';
import ErrorPageLayout from './ErrorPageLayout';
import {
  serviceName,
  contexts,
  supportEmail,
} from '../../config/errorBranding';

export default function TemporaryIssuePage({
  requestId,
  timestampUTC,
  statusCode = 500,
}) {
  return (
    <ErrorPageLayout
      title="We’re working on this"
      description={contexts.default5xx}
      primaryAction={{ label: 'Try again later', href: '/' }}
      secondaryAction={{ label: 'Contact Support', href: '/#contact' }}
      statusCode={statusCode}
      serviceName={serviceName}
      timestampUTC={timestampUTC || new Date().toISOString()}
      requestId={requestId}
      supportEmail={supportEmail}
    />
  );
}

TemporaryIssuePage.propTypes = {
  requestId: PropTypes.string,
  timestampUTC: PropTypes.string,
  statusCode: PropTypes.number,
};
