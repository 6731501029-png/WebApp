<?php

declare(strict_types=1);

require __DIR__ . '/backend/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$route = app_route();
$pdo = db();

switch (true) {
    case $method === 'POST' && $route === '/voter/login':
        voter_login($pdo);
        break;

    case $method === 'GET' && $route === '/voter/candidatesinfo':
        voter_candidates_info($pdo);
        break;

    case $method === 'POST' && $route === '/voter/vote':
        voter_vote($pdo);
        break;

    case $method === 'GET' && $route === '/voter/history':
        voter_history($pdo);
        break;

    case $method === 'GET' && $route === '/voter/dashboardvt':
        voter_dashboard($pdo);
        break;

    case $method === 'POST' && $route === '/candidate/login':
        candidate_login($pdo);
        break;

    case $method === 'POST' && $route === '/candidate/register':
        candidate_register($pdo);
        break;

    case in_array($method, ['PUT', 'POST'], true) && $route === '/candidate/updateinfo':
        candidate_update_info($pdo);
        break;

    case $method === 'GET' && $route === '/candidate/votingscore':
        candidate_voting_score($pdo);
        break;

    case $method === 'POST' && $route === '/admin/login':
        admin_login($pdo);
        break;

    case in_array($method, ['GET', 'POST'], true) && $route === '/admin/candidatesam':
        admin_candidates($pdo);
        break;

    case $method === 'PATCH' && preg_match('#^/admin/status/([^/]+)$#', $route, $matches) === 1:
        admin_update_status($pdo, $matches[1]);
        break;

    case $method === 'GET' && $route === '/admin/dashboardam':
        admin_dashboard($pdo);
        break;

    default:
        text_response(404, 'Not found');
}
