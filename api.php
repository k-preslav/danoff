<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method Not Allowed"]);
    exit();
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

// Validate input
if (!isset($input['messages'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing 'messages' in request body"]);
    exit();
}


$apiKey = "sk-hc-v1-efa71b35d9274c1c8e5308ed6fbf28725a3718bed0784897be076878e9c166e7";
$baseUrl = "https://ai.hackclub.com/proxy/v1";
$endpoint = $baseUrl . "/chat/completions";

$data = [
    "model" => "google/gemini-3-flash-preview",
    "messages" => $input['messages']
];

$ch = curl_init($endpoint);


curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . $apiKey,
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);



if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(["error" => "Request Error: " . curl_error($ch)]);
    curl_close($ch);
    exit();
}




curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
    $responseData = json_decode($response, true);
    
    if (isset($responseData['choices'][0]['message']['content'])) {
        echo json_encode([
            "text" => $responseData['choices'][0]['message']['content']
        ]);
    } else {
        echo $response;
    }



} else {
    http_response_code($httpCode);
    echo $response;
}
?>