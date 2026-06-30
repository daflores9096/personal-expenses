<?php

declare(strict_types=1);

namespace App;

use PDO;

/**
 * Exporta e importa copias completas de la base de datos en formato SQL.
 */
class DatabaseBackup
{
    private const HEADER = '-- Backup generado por Control de Gastos';

    public static function export(PDO $pdo): string
    {
        $output = self::HEADER . "\n";
        $output .= '-- Fecha: ' . date('c') . "\n\n";
        $output .= "SET NAMES utf8mb4;\n";
        $output .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);

        foreach ($tables as $table) {
            $create = $pdo->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_ASSOC);
            $output .= "DROP TABLE IF EXISTS `$table`;\n";
            $output .= ($create['Create Table'] ?? '') . ";\n\n";

            $stmt = $pdo->query("SELECT * FROM `$table`");
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $columns = array_keys($row);
                $colList = implode('`, `', $columns);
                $values = array_map(static fn($v) => self::sqlValue($pdo, $v), $row);
                $output .= "INSERT INTO `$table` (`$colList`) VALUES (" . implode(', ', $values) . ");\n";
            }
            $output .= "\n";
        }

        $output .= "SET FOREIGN_KEY_CHECKS=1;\n";
        return $output;
    }

    public static function restore(PDO $pdo, string $sql): void
    {
        $sql = trim($sql);
        if ($sql === '') {
            throw new \InvalidArgumentException('El archivo SQL está vacío');
        }

        if (!str_contains($sql, self::HEADER) && !str_contains($sql, 'CREATE TABLE')) {
            throw new \InvalidArgumentException('El archivo no parece un respaldo SQL válido');
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');

        $buffer = '';
        foreach (preg_split('/\R/', $sql) as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '--')) {
                continue;
            }
            $buffer .= $line . "\n";
            if (str_ends_with(rtrim($trimmed), ';')) {
                $pdo->exec($buffer);
                $buffer = '';
            }
        }

        if (trim($buffer) !== '') {
            $pdo->exec($buffer);
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    }

    private static function sqlValue(PDO $pdo, mixed $value): string
    {
        if ($value === null) {
            return 'NULL';
        }
        return $pdo->quote((string)$value);
    }
}
