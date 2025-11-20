<?php
/**
 * Simple Router
 * 
 * Handles URL routing and method dispatching
 */

class Router {
    private $routes = [];
    private $prefix = '';

    /**
     * Set route prefix
     * 
     * @param string $prefix Route prefix (e.g., '/api')
     */
    public function setPrefix($prefix) {
        $this->prefix = rtrim($prefix, '/');
    }

    /**
     * Register GET route
     * 
     * @param string $path Route path
     * @param callable $callback Route handler
     */
    public function get($path, $callback) {
        $this->addRoute('GET', $path, $callback);
    }

    /**
     * Register POST route
     * 
     * @param string $path Route path
     * @param callable $callback Route handler
     */
    public function post($path, $callback) {
        $this->addRoute('POST', $path, $callback);
    }

    /**
     * Register PUT route
     * 
     * @param string $path Route path
     * @param callable $callback Route handler
     */
    public function put($path, $callback) {
        $this->addRoute('PUT', $path, $callback);
    }

    /**
     * Register DELETE route
     * 
     * @param string $path Route path
     * @param callable $callback Route handler
     */
    public function delete($path, $callback) {
        $this->addRoute('DELETE', $path, $callback);
    }

    /**
     * Add route to routing table
     * 
     * @param string $method HTTP method
     * @param string $path Route path
     * @param callable $callback Route handler
     */
    private function addRoute($method, $path, $callback) {
        $path = $this->prefix . $path;
        
        // Convert path with parameters to regex
        // Example: /users/:id -> /users/([^/]+)
        $pattern = preg_replace('/\/:([^\/]+)/', '/(?P<$1>[^/]+)', $path);
        $pattern = '#^' . $pattern . '$#';

        $this->routes[] = [
            'method' => $method,
            'pattern' => $pattern,
            'callback' => $callback,
            'path' => $path
        ];
    }

    /**
     * Dispatch request to matching route
     */
    public function dispatch() {
        $method = $_SERVER['REQUEST_METHOD'];
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        // Remove trailing slash except for root
        if ($uri !== '/' && substr($uri, -1) === '/') {
            $uri = rtrim($uri, '/');
        }

        foreach ($this->routes as $route) {
            if ($route['method'] === $method && preg_match($route['pattern'], $uri, $matches)) {
                // Extract named parameters
                $params = array_filter($matches, function($key) {
                    return !is_numeric($key);
                }, ARRAY_FILTER_USE_KEY);

                // Call the route callback with parameters
                call_user_func_array($route['callback'], array_values($params));
                return;
            }
        }

        // No route matched - 404
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Not found']);
    }

    /**
     * Get all registered routes (for debugging)
     * 
     * @return array
     */
    public function getRoutes() {
        return array_map(function($route) {
            return [
                'method' => $route['method'],
                'path' => $route['path']
            ];
        }, $this->routes);
    }
}
