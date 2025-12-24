<?php
/**
 * Password Validator
 * 
 * Enforces strong password requirements and prevents common passwords.
 */

class PasswordValidator {
    /**
     * Minimum password length
     */
    const MIN_LENGTH = 8;

    /**
     * Common passwords to reject (small sample - use full list in production)
     */
    private static $commonPasswords = [
        'password', 'password123', '123456', '12345678', 'qwerty',
        'abc123', 'monkey', '1234567', 'letmein', 'trustno1',
        'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
        'ashley', 'bailey', 'passw0rd', 'shadow', '123123',
        'admin', 'admin123', 'root', 'toor', 'pass', 'test'
    ];

    /**
     * Validate password strength
     * 
     * @param string $password Password to validate
     * @return array ['valid' => bool, 'errors' => array]
     */
    public static function validate($password) {
        $errors = [];

        // Check minimum length
        if (strlen($password) < self::MIN_LENGTH) {
            $errors[] = 'Password must be at least ' . self::MIN_LENGTH . ' characters long';
        }

        // Check for uppercase letter
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter';
        }

        // Check for lowercase letter
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'Password must contain at least one lowercase letter';
        }

        // Check for number
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one number';
        }

        // Check for special character
        if (!preg_match('/[^A-Za-z0-9]/', $password)) {
            $errors[] = 'Password must contain at least one special character';
        }

        // Check against common passwords
        if (self::isCommonPassword($password)) {
            $errors[] = 'Password is too common - please choose a more unique password';
        }

        // Check for sequential characters (123, abc, etc.)
        if (self::hasSequentialCharacters($password)) {
            $errors[] = 'Password should not contain sequential characters';
        }

        // Check for repeated characters (aaa, 111, etc.)
        if (self::hasRepeatedCharacters($password)) {
            $errors[] = 'Password should not contain repeated characters';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }

    /**
     * Check if password is in common passwords list
     * 
     * @param string $password Password to check
     * @return bool True if password is common
     */
    private static function isCommonPassword($password) {
        $lowerPassword = strtolower($password);
        return in_array($lowerPassword, self::$commonPasswords);
    }

    /**
     * Check for sequential characters (123, abc, etc.)
     * 
     * @param string $password Password to check
     * @return bool True if contains sequential characters
     */
    private static function hasSequentialCharacters($password) {
        $sequences = [
            '0123456789',
            'abcdefghijklmnopqrstuvwxyz',
            'qwertyuiop',
            'asdfghjkl',
            'zxcvbnm'
        ];

        $password = strtolower($password);

        foreach ($sequences as $sequence) {
            // Check forward and backward
            for ($i = 0; $i < strlen($sequence) - 2; $i++) {
                $seq = substr($sequence, $i, 3);
                $revSeq = strrev($seq);

                if (strpos($password, $seq) !== false || strpos($password, $revSeq) !== false) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check for repeated characters (aaa, 111, etc.)
     * 
     * @param string $password Password to check
     * @return bool True if contains 3+ repeated characters
     */
    private static function hasRepeatedCharacters($password) {
        return preg_match('/(.)\1{2,}/', $password);
    }

    /**
     * Calculate password strength score (0-100)
     * 
     * @param string $password Password to evaluate
     * @return int Strength score
     */
    public static function calculateStrength($password) {
        $score = 0;

        // Length score (max 30 points)
        $length = strlen($password);
        $score += min(30, $length * 2);

        // Character variety (max 40 points)
        if (preg_match('/[a-z]/', $password)) $score += 10;
        if (preg_match('/[A-Z]/', $password)) $score += 10;
        if (preg_match('/[0-9]/', $password)) $score += 10;
        if (preg_match('/[^A-Za-z0-9]/', $password)) $score += 10;

        // Complexity bonus (max 30 points)
        $uniqueChars = count(array_unique(str_split($password)));
        $score += min(15, $uniqueChars);

        // Mixed case and numbers
        if (preg_match('/[a-z].*[A-Z]|[A-Z].*[a-z]/', $password)) $score += 5;
        if (preg_match('/[A-Za-z].*[0-9]|[0-9].*[A-Za-z]/', $password)) $score += 5;
        if (preg_match('/[A-Za-z0-9].*[^A-Za-z0-9]|[^A-Za-z0-9].*[A-Za-z0-9]/', $password)) $score += 5;

        // Penalties
        if (self::isCommonPassword($password)) $score -= 40;
        if (self::hasSequentialCharacters($password)) $score -= 20;
        if (self::hasRepeatedCharacters($password)) $score -= 10;

        return max(0, min(100, $score));
    }

    /**
     * Get password strength label
     * 
     * @param int $score Strength score (0-100)
     * @return string Strength label
     */
    public static function getStrengthLabel($score) {
        if ($score >= 80) return 'Very Strong';
        if ($score >= 60) return 'Strong';
        if ($score >= 40) return 'Fair';
        if ($score >= 20) return 'Weak';
        return 'Very Weak';
    }

    /**
     * Generate a strong random password
     * 
     * @param int $length Password length (min 12)
     * @return string Generated password
     */
    public static function generate($length = 16) {
        $length = max(12, $length);
        
        $lowercase = 'abcdefghijklmnopqrstuvwxyz';
        $uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $numbers = '0123456789';
        $special = '!@#$%^&*()-_=+[]{}|;:,.<>?';
        
        $all = $lowercase . $uppercase . $numbers . $special;
        
        // Ensure at least one of each type
        $password = '';
        $password .= $lowercase[random_int(0, strlen($lowercase) - 1)];
        $password .= $uppercase[random_int(0, strlen($uppercase) - 1)];
        $password .= $numbers[random_int(0, strlen($numbers) - 1)];
        $password .= $special[random_int(0, strlen($special) - 1)];
        
        // Fill rest with random characters
        for ($i = 4; $i < $length; $i++) {
            $password .= $all[random_int(0, strlen($all) - 1)];
        }
        
        // Shuffle the password
        $password = str_shuffle($password);
        
        return $password;
    }
}
