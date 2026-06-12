package com.malmal.kiosk.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import com.malmal.kiosk.repository.MenuRepository;
import com.malmal.kiosk.domain.Menu;
import org.springframework.beans.factory.annotation.Autowired;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    @Value("${toss.secret.key}")
    private String secretKey;

    private final RestTemplate restTemplate = new RestTemplate();
    
    @Autowired
    private MenuRepository menuRepository;

    @Autowired
    private com.malmal.kiosk.repository.OrderRecordRepository orderRecordRepository;

    @Autowired
    private ObjectMapper objectMapper;

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
            
            // 결제 승인 성공 시, 장바구니 항목 재고 차감 로직
            if (response.getStatusCode().is2xxSuccessful() && requestData.containsKey("cartItems")) {
                System.out.println("결제 승인 완료. 재고 차감을 시작합니다. cartItems: " + requestData.get("cartItems"));
                java.util.List<Map<String, Object>> cartItems = (java.util.List<Map<String, Object>>) requestData.get("cartItems");
                for (Map<String, Object> item : cartItems) {
                    Number menuIdNum = (Number) item.get("id");
                    Number countNum = (Number) item.get("count");
                    System.out.println("차감 대상 아이템 ID: " + menuIdNum + ", 수량: " + countNum);
                    if (menuIdNum != null && countNum != null) {
                        Long menuId = menuIdNum.longValue();
                        int count = countNum.intValue();
                        Menu menu = menuRepository.findById(menuId).orElse(null);
                        if (menu != null && menu.getStock() != null) {
                            int newStock = menu.getStock() - count;
                            System.out.println("기존 재고: " + menu.getStock() + " -> 변경 재고: " + newStock);
                            menu.setStock(Math.max(0, newStock));
                            menuRepository.save(menu);

                            // 세트 메뉴일 경우 구성 단품들의 재고도 차감
                            if (menu.getComponentNames() != null && !menu.getComponentNames().isEmpty()) {
                                String[] components = menu.getComponentNames().split(",");
                                for (String compName : components) {
                                    Menu compMenu = menuRepository.findByName(compName.trim()).orElse(null);
                                    if (compMenu != null && compMenu.getStock() != null) {
                                        int compStock = compMenu.getStock() - count;
                                        compMenu.setStock(Math.max(0, compStock));
                                        menuRepository.save(compMenu);
                                    }
                                }
                            }
                        } else {
                            System.out.println("메뉴를 찾을 수 없거나 재고가 null입니다. menuId: " + menuId);
                        }
                    }
                }
                
                // 주문 기록(결제 금액 및 상세내역) DB 저장
                String cartItemsJson = "";
                try {
                    cartItemsJson = objectMapper.writeValueAsString(cartItems);
                } catch (Exception e) {
                    System.out.println("cartItems 직렬화 실패: " + e.getMessage());
                }

                com.malmal.kiosk.domain.OrderRecord orderRecord = new com.malmal.kiosk.domain.OrderRecord(
                        amount.intValue(),
                        java.time.LocalDateTime.now(),
                        cartItemsJson
                );
                orderRecordRepository.save(orderRecord);
                
            } else {
                System.out.println("결제가 성공하지 않았거나 cartItems가 요청에 없습니다.");
            }
            
            return ResponseEntity.ok(response.getBody());

        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "Payment confirmation failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/cash")
    public ResponseEntity<?> confirmCashPayment(@RequestBody Map<String, Object> requestData) {
        if (requestData.containsKey("cartItems")) {
            System.out.println("현금 결제 완료. 재고 차감을 시작합니다.");
            java.util.List<Map<String, Object>> cartItems = (java.util.List<Map<String, Object>>) requestData.get("cartItems");
            for (Map<String, Object> item : cartItems) {
                Number menuIdNum = (Number) item.get("id");
                Number countNum = (Number) item.get("count");
                if (menuIdNum != null && countNum != null) {
                    Long menuId = menuIdNum.longValue();
                    int count = countNum.intValue();
                    Menu menu = menuRepository.findById(menuId).orElse(null);
                    if (menu != null && menu.getStock() != null) {
                        int newStock = menu.getStock() - count;
                        menu.setStock(Math.max(0, newStock));
                        menuRepository.save(menu);

                        // 세트 메뉴일 경우 구성 단품들의 재고도 차감
                        if (menu.getComponentNames() != null && !menu.getComponentNames().isEmpty()) {
                            String[] components = menu.getComponentNames().split(",");
                            for (String compName : components) {
                                Menu compMenu = menuRepository.findByName(compName.trim()).orElse(null);
                                if (compMenu != null && compMenu.getStock() != null) {
                                    int compStock = compMenu.getStock() - count;
                                    compMenu.setStock(Math.max(0, compStock));
                                    menuRepository.save(compMenu);
                                }
                            }
                        }
                    }
                }
            }
            
            // 장바구니 데이터를 바탕으로 총 금액 계산
            int totalAmount = 0;
            for (Map<String, Object> item : cartItems) {
                Number countNum = (Number) item.get("count");
                Number priceNum = (Number) item.get("price");
                if (countNum != null && priceNum != null) {
                    totalAmount += countNum.intValue() * priceNum.intValue();
                }
            }

            // 주문 기록(결제 금액 및 상세내역) DB 저장
            String cartItemsJson = "";
            try {
                cartItemsJson = objectMapper.writeValueAsString(cartItems);
            } catch (Exception e) {
                System.out.println("cartItems 직렬화 실패: " + e.getMessage());
            }

            com.malmal.kiosk.domain.OrderRecord orderRecord = new com.malmal.kiosk.domain.OrderRecord(
                    totalAmount,
                    java.time.LocalDateTime.now(),
                    cartItemsJson
            );
            orderRecordRepository.save(orderRecord);
            
            return ResponseEntity.ok(Map.of("success", true));
        }
        return ResponseEntity.badRequest().body(Map.of("message", "No cart items provided"));
    }
}
