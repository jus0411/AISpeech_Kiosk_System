package com.malmal.kiosk.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    @Value("${toss.secret.key}")
    private String secretKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/confirm")
    public ResponseEntity<?> confirmPayment(@RequestBody Map<String, Object> requestData) {
        String paymentKey = (String) requestData.get("paymentKey");
        String orderId = (String) requestData.get("orderId");
        Number amount = (Number) requestData.get("amount");

        if (paymentKey == null || orderId == null || amount == null) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Invalid request parameters");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        try {
            // 토스페이먼츠 API 서버로 승인 요청
            String url = "https://api.tosspayments.com/v1/payments/confirm";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Basic Auth 헤더 생성: "Basic " + Base64(secretKey + ":")
            String authStr = secretKey + ":";
            String encodedAuth = Base64.getEncoder().encodeToString(authStr.getBytes(StandardCharsets.UTF_8));
            headers.set("Authorization", "Basic " + encodedAuth);

            Map<String, Object> body = new HashMap<>();
            body.put("paymentKey", paymentKey);
            body.put("orderId", orderId);
            body.put("amount", amount);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            return ResponseEntity.ok(response.getBody());

        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Payment confirmation failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}
