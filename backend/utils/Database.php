<?php
/**
 * Database Connection Manager
 * 
 * Provides MySQL database connection using PDO with connection pooling
 */

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Logger.php';

class Database {
    private static $instance = null;
    private $pdo;

    /**
     * Return a proxy that opens the PDO connection only when a route actually
     * performs a database operation.
     */
    public static function lazy() {
        return new LazyDatabaseConnection();
    }

    /**
     * Private constructor for singleton pattern
     */
    private function __construct() {
        $host = Config::get('DB_HOST', 'localhost');
        $port = Config::get('DB_PORT', '3306');
        $dbname = Config::get('DB_NAME', 'thunder_road');
        $charset = Config::get('DB_CHARSET', 'utf8mb4');
        $user = Config::get('DB_USER', 'root');
        $password = Config::get('DB_PASSWORD', '');

        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=$charset";

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_PERSISTENT => true, // Connection pooling
        ];

        try {
            $this->pdo = new PDO($dsn, $user, $password, $options);
            Logger::info('Database connected', ['host' => $host, 'database' => $dbname]);
        } catch (PDOException $e) {
            Logger::error('Database connection failed', [
                'error' => $e->getMessage(),
                'host' => $host,
                'database' => $dbname
            ]);

            // Fail fast in production
            if (Config::isProduction()) {
                require_once __DIR__ . '/../middleware/ErrorHandler.php';
                ErrorHandler::respond('Database connection failed', 503);
            }

            throw $e;
        }
    }

    /**
     * Get database instance (singleton)
     * 
     * @return Database
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get PDO connection
     * 
     * @return PDO
     */
    public function getConnection() {
        return $this->pdo;
    }

    /**
     * Execute a query with parameters
     * 
     * @param string $sql SQL query
     * @param array $params Parameters
     * @return PDOStatement
     */
    public function query($sql, $params = []) {
        if (Config::getBool('LOG_QUERIES', false)) {
            Logger::debug('Database query', ['sql' => $sql, 'params' => $params]);
        }

        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            Logger::error('Database query failed', [
                'error' => $e->getMessage(),
                'sql' => $sql,
                'params' => $params
            ]);
            throw $e;
        }
    }

    /**
     * Fetch all rows from query
     * 
     * @param string $sql SQL query
     * @param array $params Parameters
     * @return array
     */
    public function fetchAll($sql, $params = []) {
        return $this->query($sql, $params)->fetchAll();
    }

    /**
     * Fetch single row from query
     * 
     * @param string $sql SQL query
     * @param array $params Parameters
     * @return array|null
     */
    public function fetchOne($sql, $params = []) {
        $result = $this->query($sql, $params)->fetch();
        return $result ?: null;
    }

    /**
     * Insert row and return last insert ID
     * 
     * @param string $sql SQL query
     * @param array $params Parameters
     * @return int Last insert ID
     */
    public function insert($sql, $params = []) {
        $this->query($sql, $params);
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Update rows and return affected count
     * 
     * @param string $sql SQL query
     * @param array $params Parameters
     * @return int Affected rows
     */
    public function update($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->rowCount();
    }

    /**
     * Delete rows and return affected count
     * 
     * @param string $sql SQL query
     * @param array $params Parameters
     * @return int Affected rows
     */
    public function delete($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->rowCount();
    }

    /**
     * Begin transaction
     */
    public function beginTransaction() {
        return $this->pdo->beginTransaction();
    }

    /**
     * Commit transaction
     */
    public function commit() {
        return $this->pdo->commit();
    }

    /**
     * Rollback transaction
     */
    public function rollback() {
        return $this->pdo->rollBack();
    }

    /**
     * Prevent cloning of singleton
     */
    private function __clone() {}

    /**
     * Prevent unserialization of singleton
     */
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

class LazyDatabaseConnection {
    private $database = null;

    private function database() {
        if ($this->database === null) {
            $this->database = Database::getInstance();
        }

        return $this->database;
    }

    public function __call($name, $arguments) {
        return call_user_func_array([$this->database(), $name], $arguments);
    }
}
