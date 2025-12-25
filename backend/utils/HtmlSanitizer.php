<?php

/**
 * HtmlSanitizer
 *
 * Purpose:
 * - Strip disallowed tags/attributes from admin-authored rich text fields.
 * - Enforce a strict allowlist so menu descriptions can't inject arbitrary HTML.
 *
 * Allowed tags: <p>, <strong>, <em>, <br>, <ul>, <ol>, <li>, <div class="rt-cols-2|rt-cols-3">
 */
class HtmlSanitizer
{
    private static $allowedTags = ['p', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'div'];
    private static $allowedDivClasses = ['rt-cols-2', 'rt-cols-3'];

    /**
     * Sanitize a small fragment of HTML using the allowlist.
     *
     * @param string|null $html
     * @return string
     */
    public static function sanitizeRichText($html)
    {
        if (!is_string($html)) {
            return '';
        }

        $trimmed = trim($html);
        if ($trimmed === '') {
            return '';
        }

        $clean = strip_tags($trimmed, '<p><strong><em><br><ul><ol><li><div>');

        $doc = new DOMDocument('1.0', 'UTF-8');
        libxml_use_internal_errors(true);
        $wrap = '<div>' . $clean . '</div>';
        $doc->loadHTML('<?xml encoding="UTF-8">' . $wrap, LIBXML_HTML_NODEFDTD | LIBXML_HTML_NOIMPLIED);
        libxml_clear_errors();

        $root = $doc->documentElement;
        if ($root) {
            self::sanitizeNode($root);
        }

        $output = '';
        foreach ($doc->documentElement->childNodes as $child) {
            $output .= $doc->saveHTML($child);
        }

        return trim($output);
    }

    private static function sanitizeNode(DOMNode $node)
    {
        if (!$node->hasChildNodes()) {
            return;
        }

        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMElement) {
                $tag = strtolower($child->tagName);
                if (!in_array($tag, self::$allowedTags, true)) {
                    while ($child->firstChild) {
                        $node->insertBefore($child->firstChild, $child);
                    }
                    $node->removeChild($child);
                    continue;
                }

                if ($tag === 'div') {
                    $classAttr = trim((string) $child->getAttribute('class'));
                    if (!in_array($classAttr, self::$allowedDivClasses, true)) {
                        while ($child->firstChild) {
                            $node->insertBefore($child->firstChild, $child);
                        }
                        $node->removeChild($child);
                        continue;
                    }
                    $attributes = iterator_to_array($child->attributes);
                    foreach ($attributes as $attr) {
                        if ($attr->name !== 'class') {
                            $child->removeAttributeNode($attr);
                        }
                    }
                } else {
                    while ($child->attributes->length > 0) {
                        $child->removeAttributeNode($child->attributes->item(0));
                    }
                }

                self::sanitizeNode($child);
            } elseif (!($child instanceof DOMText)) {
                $node->removeChild($child);
            }
        }
    }
}
