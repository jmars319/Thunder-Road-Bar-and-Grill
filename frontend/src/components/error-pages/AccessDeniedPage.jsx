import PropTypes from 'prop-types';
import ErrorPageLayout from './ErrorPageLayout';
import { serviceName, supportEmail } from '../../config/errorBranding';

export default function AccessDeniedPage({ requestId, timestampUTC }) {
  return (
    <ErrorPageLayout
      title="This area is not available publicly"
      description="The page may require a valid admin session or may be restricted to the Thunder Road team."
      primaryAction={{ label: 'Go Home', href: '/' }}
      secondaryAction={{ label: 'Contact Support', href: '/#contact' }}
      statusCode={403}
      serviceName={serviceName}
      timestampUTC={timestampUTC || new Date().toISOString()}
      requestId={requestId}
      supportEmail={supportEmail}
    />
  );
}

AccessDeniedPage.propTypes = {
  requestId: PropTypes.string,
  timestampUTC: PropTypes.string,
};
