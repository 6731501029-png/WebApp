<?php

declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_PORT = '3306';
const DB_NAME = 'mfu_voting_app';
const DB_USER = 'root';
const DB_PASS = '';

function app_route(): string
{
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    $basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');

    if ($basePath !== '' && $basePath !== '/' && str_starts_with($uriPath, $basePath)) {
        $uriPath = substr($uriPath, strlen($basePath)) ?: '/';
    }

    return '/' . ltrim($uriPath, '/');
}

function app_base_path(): string
{
    $basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');

    return $basePath === '/' ? '' : $basePath;
}

function app_root_path(): string
{
    return dirname(__DIR__);
}

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('MFU_DB_HOST') ?: DB_HOST;
    $port = getenv('MFU_DB_PORT') ?: DB_PORT;
    $name = getenv('MFU_DB_NAME') ?: DB_NAME;
    $user = getenv('MFU_DB_USER') ?: DB_USER;
    $pass = getenv('MFU_DB_PASS');
    $pass = $pass === false ? DB_PASS : $pass;

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function json_response(int $status, array $payload): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function text_response(int $status, string $message): never
{
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message;
    exit;
}

function request_json(): array
{
    $raw = file_get_contents('php://input');

    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);

    return is_array($decoded) ? $decoded : [];
}

function request_data(): array
{
    if (!empty($_POST)) {
        return $_POST;
    }

    $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    if (str_contains($contentType, 'application/json')) {
        return request_json();
    }

    return request_json();
}

function require_session_role(string $role): array
{
    $auth = $_SESSION['auth'] ?? null;

    if (!is_array($auth) || ($auth['role'] ?? null) !== $role) {
        text_response(401, 'Unauthorized');
    }

    return $auth;
}

function set_auth_session(string $role, string $id, array $extra = []): void
{
    session_regenerate_id(true);
    $_SESSION['auth'] = array_merge([
        'role' => $role,
        'id' => $id,
    ], $extra);
}

function storage_path(string $name): string
{
    $dir = app_root_path() . '/storage';
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }

    return $dir . '/' . $name;
}

function read_storage_json(string $name, array $default = []): array
{
    $path = storage_path($name);

    if (!is_file($path)) {
        return $default;
    }

    $decoded = json_decode((string) file_get_contents($path), true);

    return is_array($decoded) ? $decoded : $default;
}

function write_storage_json(string $name, array $data): void
{
    file_put_contents(
        storage_path($name),
        json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
}

function app_status(): array
{
    return read_storage_json('app_status.json', ['voting' => 'enable']);
}

function save_app_status(array $status): void
{
    write_storage_json('app_status.json', $status);
}

function candidate_media_map(): array
{
    return read_storage_json('candidate_media.json', []);
}

function save_candidate_media_map(array $map): void
{
    write_storage_json('candidate_media.json', $map);
}

function candidate_image_url(string $candidateId): string
{
    $media = candidate_media_map();
    $value = $media[$candidateId] ?? '';

    if (!is_string($value) || $value === '') {
        return app_base_path() . '/Public/img/default-candidate.png';
    }

    if (preg_match('#^https?://#i', $value) === 1) {
        return $value;
    }

    return app_base_path() . '/' . ltrim($value, '/');
}

function persist_candidate_image(string $candidateId): ?string
{
    if (!isset($_FILES['image']) || !is_array($_FILES['image'])) {
        return null;
    }

    $file = $_FILES['image'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        text_response(400, 'Invalid file type');
    }

    $tmpName = (string) ($file['tmp_name'] ?? '');
    $original = (string) ($file['name'] ?? '');
    $extension = strtolower(pathinfo($original, PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if (!in_array($extension, $allowed, true)) {
        text_response(400, 'Invalid file type');
    }

    $dir = app_root_path() . '/Public/uploads/candidates';
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }

    $safeId = preg_replace('/[^a-zA-Z0-9_-]/', '_', $candidateId) ?: 'candidate';
    $relative = 'Public/uploads/candidates/' . $safeId . '.' . $extension;
    $destination = app_root_path() . '/' . $relative;

    if (!move_uploaded_file($tmpName, $destination)) {
        text_response(500, 'Update failed');
    }

    $map = candidate_media_map();
    $map[$candidateId] = $relative;
    save_candidate_media_map($map);

    return $relative;
}

function update_candidate_image_reference(string $candidateId, ?string $imageValue): void
{
    if ($imageValue === null) {
        return;
    }

    $trimmed = trim($imageValue);
    if ($trimmed === '') {
        return;
    }

    $map = candidate_media_map();
    $map[$candidateId] = $trimmed;
    save_candidate_media_map($map);
}

function candidate_profile_row(array $row): array
{
    $candidateId = (string) $row['candidate_id'];

    return [
        'image' => candidate_image_url($candidateId),
        'number' => $candidateId,
        'candidate_id' => $candidateId,
        'name' => $row['name'] ?: '',
        'policy' => $row['policies'] ?: '',
        'is_enabled' => (bool) ($row['is_enabled'] ?? true),
    ];
}

function fetch_candidate_profiles(PDO $pdo, bool $enabledOnly = true): array
{
    $sql = 'SELECT candidate_id, name, policies, is_enabled FROM candidates';
    if ($enabledOnly) {
        $sql .= ' WHERE is_enabled = 1';
    }
    $sql .= ' ORDER BY candidate_id ASC';

    $rows = $pdo->query($sql)->fetchAll();

    return array_map('candidate_profile_row', $rows);
}

function fetch_ranked_results(PDO $pdo, ?string $search = null, bool $enabledOnly = false): array
{
    $params = [];
    $sql = '
        SELECT
            c.candidate_id,
            c.name,
            c.policies,
            c.is_enabled,
            COUNT(v.id) AS score
        FROM candidates c
        LEFT JOIN votes v ON v.candidate_id = c.candidate_id
    ';

    $where = [];
    if ($enabledOnly) {
        $where[] = 'c.is_enabled = 1';
    }
    if ($search !== null && trim($search) !== '') {
        $where[] = 'c.name LIKE :search';
        $params['search'] = '%' . trim($search) . '%';
    }
    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= '
        GROUP BY c.candidate_id, c.name, c.policies, c.is_enabled
        ORDER BY score DESC, c.candidate_id ASC
    ';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $results = [];
    $rank = 1;
    foreach ($rows as $row) {
        $results[] = [
            'rank' => $rank,
            'No' => 'No.' . $row['candidate_id'],
            'candidate_id' => $row['candidate_id'],
            'name' => $row['name'] ?: '',
            'score' => (int) $row['score'],
            'image' => candidate_image_url((string) $row['candidate_id']),
            'policy' => $row['policies'] ?: '',
            'is_enabled' => (bool) $row['is_enabled'],
        ];
        $rank++;
    }

    return $results;
}

function dashboard_summary(PDO $pdo): array
{
    $totalVoters = (int) $pdo->query('SELECT COUNT(*) FROM voters')->fetchColumn();
    $totalCandidates = (int) $pdo->query('SELECT COUNT(*) FROM candidates WHERE is_enabled = 1')->fetchColumn();
    $totalVotes = (int) $pdo->query('SELECT COUNT(*) FROM votes')->fetchColumn();
    $percentageVoting = $totalVoters > 0 ? round(($totalVotes / $totalVoters) * 100, 1) : 0.0;

    return [
        'percentage_of_voting' => $percentageVoting,
        'number_of_voters' => $totalVoters,
        'number_of_candidates' => $totalCandidates,
        'number_of_voting' => $totalVotes,
    ];
}

function voter_login(PDO $pdo): never
{
    try {
        $data = request_data();
        $citizenId = trim((string) ($data['citizen_id'] ?? ''));
        $laserId = trim((string) ($data['laser_id'] ?? ''));

        $stmt = $pdo->prepare('
            SELECT citizen_id, laser_id, is_enabled, has_voted
            FROM voters
            WHERE citizen_id = :citizen_id AND laser_id = :laser_id
            LIMIT 1
        ');
        $stmt->execute([
            'citizen_id' => $citizenId,
            'laser_id' => $laserId,
        ]);
        $voter = $stmt->fetch();

        if (!$voter || !(bool) $voter['is_enabled']) {
            text_response(401, 'Wrong citizen_id or Wrong laser_id');
        }

        set_auth_session('voter', $citizenId, [
            'citizen_id' => $citizenId,
            'laser_id' => $laserId,
        ]);

        text_response(200, '/voter/dashboardvt');
    } catch (Throwable $e) {
        text_response(500, 'Server error');
    }
}

function voter_candidates_info(PDO $pdo): never
{
    try {
        require_session_role('voter');
        json_response(200, fetch_candidate_profiles($pdo, true));
    } catch (Throwable $e) {
        text_response(500, 'Server error');
    }
}

function voter_vote(PDO $pdo): never
{
    try {
        $auth = require_session_role('voter');
        $status = app_status();
        if (($status['voting'] ?? 'enable') !== 'enable') {
            text_response(400, 'UNCONFIRMED');
        }

        $data = request_data();
        $candidateId = trim((string) ($data['candidate_id'] ?? ''));
        $citizenId = (string) ($auth['citizen_id'] ?? $auth['id']);

        if ($candidateId === '') {
            text_response(400, 'UNCONFIRMED');
        }

        $pdo->beginTransaction();

        $voterStmt = $pdo->prepare('SELECT is_enabled, has_voted FROM voters WHERE citizen_id = :citizen_id LIMIT 1 FOR UPDATE');
        $voterStmt->execute(['citizen_id' => $citizenId]);
        $voter = $voterStmt->fetch();

        $candidateStmt = $pdo->prepare('SELECT candidate_id FROM candidates WHERE candidate_id = :candidate_id AND is_enabled = 1 LIMIT 1');
        $candidateStmt->execute(['candidate_id' => $candidateId]);
        $candidate = $candidateStmt->fetch();

        if (!$voter || !(bool) $voter['is_enabled'] || (bool) $voter['has_voted'] || !$candidate) {
            $pdo->rollBack();
            text_response(400, 'UNCONFIRMED');
        }

        $insertStmt = $pdo->prepare('INSERT INTO votes (voter_id, candidate_id) VALUES (:voter_id, :candidate_id)');
        $insertStmt->execute([
            'voter_id' => $citizenId,
            'candidate_id' => $candidateId,
        ]);

        $updateStmt = $pdo->prepare('UPDATE voters SET has_voted = 1 WHERE citizen_id = :citizen_id');
        $updateStmt->execute(['citizen_id' => $citizenId]);

        $pdo->commit();

        text_response(200, 'CONFIRMED');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        text_response(500, 'Server error');
    }
}

function voter_history(PDO $pdo): never
{
    try {
        $auth = require_session_role('voter');
        $citizenId = (string) ($auth['citizen_id'] ?? $auth['id']);

        $stmt = $pdo->prepare('
            SELECT candidate_id, voted_at
            FROM votes
            WHERE voter_id = :voter_id
            ORDER BY voted_at DESC
        ');
        $stmt->execute(['voter_id' => $citizenId]);
        $rows = $stmt->fetchAll();

        if ($rows === []) {
            text_response(404, 'No history found');
        }

        $history = array_map(static fn(array $row): array => [
            'candidate_id' => $row['candidate_id'],
            'timestamp' => $row['voted_at'],
        ], $rows);

        json_response(200, $history);
    } catch (Throwable $e) {
        text_response(500, 'Server error');
    }
}

function voter_dashboard(PDO $pdo): never
{
    try {
        require_session_role('voter');
        $search = isset($_GET['search']) ? trim((string) $_GET['search']) : null;
        json_response(200, array_merge(
            dashboard_summary($pdo),
            ['results' => fetch_ranked_results($pdo, $search, true)]
        ));
    } catch (Throwable $e) {
        text_response(500, 'Server error');
    }
}

function candidate_login(PDO $pdo): never
{
    try {
        $data = request_data();
        $candidateId = trim((string) ($data['candidate_id'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        $stmt = $pdo->prepare('
            SELECT candidate_id, password, name, is_enabled
            FROM candidates
            WHERE candidate_id = :candidate_id
            LIMIT 1
        ');
        $stmt->execute(['candidate_id' => $candidateId]);
        $candidate = $stmt->fetch();

        if (
            !$candidate ||
            !(bool) $candidate['is_enabled'] ||
            ($candidate['password'] ?? '') === '' ||
            !hash_equals((string) $candidate['password'], $password)
        ) {
            text_response(401, 'Invalid credentials');
        }

        set_auth_session('candidate', $candidateId, [
            'candidate_id' => $candidateId,
            'name' => (string) ($candidate['name'] ?? ''),
        ]);

        text_response(200, '/candidate/votingscore');
    } catch (Throwable $e) {
        text_response(500, 'Server error');
    }
}

function candidate_register(PDO $pdo): never
{
    try {
        $data = request_data();
        $candidateId = trim((string) ($data['candidate_id'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        $confirmPassword = (string) ($data['confirm_password'] ?? '');

        if ($candidateId === '' || $password === '' || $confirmPassword === '' || $password !== $confirmPassword) {
            text_response(400, 'this ID is not authorized');
        }

        $stmt = $pdo->prepare('SELECT candidate_id, password FROM candidates WHERE candidate_id = :candidate_id LIMIT 1');
        $stmt->execute(['candidate_id' => $candidateId]);
        $candidate = $stmt->fetch();

        if (!$candidate) {
            text_response(400, 'this ID is not authorized');
        }

        if (($candidate['password'] ?? '') !== null && trim((string) $candidate['password']) !== '') {
            text_response(401, 'this ID is already registered');
        }

        $updateStmt = $pdo->prepare('UPDATE candidates SET password = :password WHERE candidate_id = :candidate_id');
        $updateStmt->execute([
            'password' => $password,
            'candidate_id' => $candidateId,
        ]);

        text_response(200, 'Registration success');
    } catch (Throwable $e) {
        text_response(500, 'Server error');
    }
}

function candidate_update_info(PDO $pdo): never
{
    try {
        $auth = require_session_role('candidate');
        $candidateId = (string) ($auth['candidate_id'] ?? $auth['id']);
        $data = request_data();

        $name = trim((string) ($data['name'] ?? ''));
        $policy = trim((string) ($data['policy'] ?? ($data['policies'] ?? '')));
        $image = isset($data['image']) ? (string) $data['image'] : (isset($data['img']) ? (string) $data['img'] : null);

        persist_candidate_image($candidateId);
        update_candidate_image_reference($candidateId, $image);

        $stmt = $pdo->prepare('
            UPDATE candidates
            SET name = :name, policies = :policies
            WHERE candidate_id = :candidate_id
        ');
        $stmt->execute([
            'name' => $name,
            'policies' => $policy,
            'candidate_id' => $candidateId,
        ]);

        text_response(200, 'Profile updated');
    } catch (Throwable $e) {
        text_response(500, 'Update failed');
    }
}

function candidate_voting_score(PDO $pdo): never
{
    try {
        $auth = require_session_role('candidate');
        $candidateId = (string) ($auth['candidate_id'] ?? $auth['id']);
        $results = fetch_ranked_results($pdo);
        $ranked = array_values(array_filter(
            $results,
            static fn(array $item): bool => $item['candidate_id'] === $candidateId
        ));

        $stmt = $pdo->prepare('SELECT candidate_id, name, policies, is_enabled FROM candidates WHERE candidate_id = :candidate_id LIMIT 1');
        $stmt->execute(['candidate_id' => $candidateId]);
        $candidate = $stmt->fetch();

        if (!$candidate) {
            text_response(401, 'Unauthorized');
        }

        $current = $ranked[0] ?? [
            'rank' => count($results) + 1,
            'score' => 0,
        ];

        json_response(200, [
            'current rank' => $current['rank'],
            'voting score' => $current['score'],
            'top leaderboard' => $results[0]['No'] ?? null,
            'results' => $results,
            'profile' => candidate_profile_row($candidate),
        ]);
    } catch (Throwable $e) {
        text_response(500, 'Server error');
    }
}

function admin_login(PDO $pdo): never
{
    try {
        $data = request_data();
        $username = trim((string) ($data['username'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        $adminId = trim((string) ($data['admin_id'] ?? ''));

        $stmt = $pdo->prepare('SELECT id, username, password FROM admins WHERE username = :username LIMIT 1');
        $stmt->execute(['username' => $username]);
        $admin = $stmt->fetch();

        if (
            !$admin ||
            !hash_equals((string) $admin['password'], $password) ||
            ($adminId !== '' && (string) $admin['id'] !== $adminId)
        ) {
            text_response(401, "Wrong username' or Wrong password");
        }

        set_auth_session('admin', (string) $admin['id'], [
            'username' => $admin['username'],
        ]);

        text_response(200, '/admin/dashboardad');
    } catch (Throwable $e) {
        text_response(500, 'Server error');
    }
}

function admin_candidates(PDO $pdo): never
{
    try {
        require_session_role('admin');

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $data = request_data();
            $candidateId = trim((string) ($data['candidate_id'] ?? ''));

            if ($candidateId === '') {
                text_response(400, 'Candidate ID is required');
            }

            $stmt = $pdo->prepare('SELECT candidate_id FROM candidates WHERE candidate_id = :candidate_id LIMIT 1');
            $stmt->execute(['candidate_id' => $candidateId]);

            if ($stmt->fetch()) {
                text_response(400, 'Candidate ID already exists');
            }

            $insert = $pdo->prepare('
                INSERT INTO candidates (candidate_id, password, name, policies, is_enabled)
                VALUES (:candidate_id, NULL, NULL, NULL, 1)
            ');
            $insert->execute(['candidate_id' => $candidateId]);

            text_response(200, 'Candidate ID created');
        }

        json_response(200, fetch_candidate_profiles($pdo, false));
    } catch (Throwable $e) {
        text_response(500, 'Server error');
    }
}

function admin_update_status(PDO $pdo, string $type): never
{
    try {
        require_session_role('admin');
        $data = request_data();
        $status = strtolower(trim((string) ($data['status'] ?? '')));
        $enabled = $status === 'enable' ? 1 : 0;

        switch ($type) {
            case 'voting':
                $current = app_status();
                $current['voting'] = $enabled ? 'enable' : 'disable';
                save_app_status($current);
                text_response(200, 'Status updated');
                break;

            case 'candidate':
                $candidateId = trim((string) ($data['candidate_id'] ?? ''));
                if ($candidateId === '') {
                    text_response(400, 'Candidate ID is required');
                }
                $stmt = $pdo->prepare('UPDATE candidates SET is_enabled = :enabled WHERE candidate_id = :candidate_id');
                $stmt->execute([
                    'enabled' => $enabled,
                    'candidate_id' => $candidateId,
                ]);
                text_response(200, 'Status updated');
                break;

            case 'voter':
                $citizenId = trim((string) ($data['citizen_id'] ?? ''));
                if ($citizenId === '') {
                    text_response(400, 'Citizen ID is required');
                }
                $stmt = $pdo->prepare('UPDATE voters SET is_enabled = :enabled WHERE citizen_id = :citizen_id');
                $stmt->execute([
                    'enabled' => $enabled,
                    'citizen_id' => $citizenId,
                ]);
                text_response(200, 'Status updated');
                break;
        }

        text_response(400, 'Unsupported status type');
    } catch (Throwable $e) {
        text_response(500, 'Server error');
    }
}

function admin_dashboard(PDO $pdo): never
{
    try {
        require_session_role('admin');
        $search = isset($_GET['search']) ? trim((string) $_GET['search']) : null;
        json_response(200, array_merge(
            dashboard_summary($pdo),
            ['results' => fetch_ranked_results($pdo, $search)]
        ));
    } catch (Throwable $e) {
        text_response(500, 'Server error');
    }
}
