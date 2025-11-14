<?php
/**
 * Validation Utility
 * 
 * Provides validation functions for request data
 */

class Validator {
    private $errors = [];

    /**
     * Validate required field
     * 
     * @param mixed $value Value to validate
     * @param string $field Field name
     * @return self
     */
    public function required($value, $field) {
        if (empty($value) && $value !== '0' && $value !== 0) {
            $this->errors[$field] = "$field is required";
        }
        return $this;
    }

    /**
     * Validate email
     * 
     * @param string $value Email to validate
     * @param string $field Field name
     * @return self
     */
    public function email($value, $field) {
        if (!empty($value) && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = "$field must be a valid email address";
        }
        return $this;
    }

    /**
     * Validate minimum length
     * 
     * @param string $value Value to validate
     * @param int $min Minimum length
     * @param string $field Field name
     * @return self
     */
    public function minLength($value, $min, $field) {
        if (!empty($value) && strlen($value) < $min) {
            $this->errors[$field] = "$field must be at least $min characters";
        }
        return $this;
    }

    /**
     * Validate maximum length
     * 
     * @param string $value Value to validate
     * @param int $max Maximum length
     * @param string $field Field name
     * @return self
     */
    public function maxLength($value, $max, $field) {
        if (!empty($value) && strlen($value) > $max) {
            $this->errors[$field] = "$field must be at most $max characters";
        }
        return $this;
    }

    /**
     * Validate numeric value
     * 
     * @param mixed $value Value to validate
     * @param string $field Field name
     * @return self
     */
    public function numeric($value, $field) {
        if (!empty($value) && !is_numeric($value)) {
            $this->errors[$field] = "$field must be a number";
        }
        return $this;
    }

    /**
     * Validate integer value
     * 
     * @param mixed $value Value to validate
     * @param string $field Field name
     * @return self
     */
    public function integer($value, $field) {
        if (!empty($value) && !filter_var($value, FILTER_VALIDATE_INT)) {
            $this->errors[$field] = "$field must be an integer";
        }
        return $this;
    }

    /**
     * Validate minimum value
     * 
     * @param mixed $value Value to validate
     * @param float $min Minimum value
     * @param string $field Field name
     * @return self
     */
    public function min($value, $min, $field) {
        if (!empty($value) && is_numeric($value) && $value < $min) {
            $this->errors[$field] = "$field must be at least $min";
        }
        return $this;
    }

    /**
     * Validate maximum value
     * 
     * @param mixed $value Value to validate
     * @param float $max Maximum value
     * @param string $field Field name
     * @return self
     */
    public function max($value, $max, $field) {
        if (!empty($value) && is_numeric($value) && $value > $max) {
            $this->errors[$field] = "$field must be at most $max";
        }
        return $this;
    }

    /**
     * Validate URL
     * 
     * @param string $value URL to validate
     * @param string $field Field name
     * @return self
     */
    public function url($value, $field) {
        if (!empty($value) && !filter_var($value, FILTER_VALIDATE_URL)) {
            $this->errors[$field] = "$field must be a valid URL";
        }
        return $this;
    }

    /**
     * Validate value is in array
     * 
     * @param mixed $value Value to validate
     * @param array $options Allowed values
     * @param string $field Field name
     * @return self
     */
    public function in($value, $options, $field) {
        if (!empty($value) && !in_array($value, $options, true)) {
            $this->errors[$field] = "$field must be one of: " . implode(', ', $options);
        }
        return $this;
    }

    /**
     * Check if validation passed
     * 
     * @return bool
     */
    public function passes() {
        return empty($this->errors);
    }

    /**
     * Check if validation failed
     * 
     * @return bool
     */
    public function fails() {
        return !$this->passes();
    }

    /**
     * Get validation errors
     * 
     * @return array
     */
    public function getErrors() {
        return $this->errors;
    }

    /**
     * Get first error message
     * 
     * @return string|null
     */
    public function getFirstError() {
        return !empty($this->errors) ? reset($this->errors) : null;
    }

    /**
     * Sanitize string (trim and remove HTML tags)
     * 
     * @param string $value Value to sanitize
     * @return string
     */
    public static function sanitize($value) {
        return htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
    }

    /**
     * Sanitize HTML content (allow safe tags only)
     * 
     * @param string $value HTML to sanitize
     * @return string
     */
    public static function sanitizeHtml($value) {
        // Allow only safe HTML tags
        $allowedTags = '<p><br><strong><em><u><a><ul><ol><li><h1><h2><h3><h4><h5><h6>';
        return strip_tags($value, $allowedTags);
    }
}
