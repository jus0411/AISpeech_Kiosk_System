package com.malmal.kiosk.controller;

import com.malmal.kiosk.domain.Menu;
import com.malmal.kiosk.domain.OrderRecord;
import com.malmal.kiosk.repository.MenuRepository;
import com.malmal.kiosk.repository.OrderRecordRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final MenuRepository menuRepository;
    private final OrderRecordRepository orderRecordRepository;

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.password:qwer1234}")
    private String adminPassword;

    public AdminController(MenuRepository menuRepository, OrderRecordRepository orderRecordRepository) {
        this.menuRepository = menuRepository;
        this.orderRecordRepository = orderRecordRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        Map<String, Object> response = new HashMap<>();
        if (adminUsername.equals(username) && adminPassword.equals(password)) {
            response.put("success", true);
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "아이디 또는 비밀번호가 올바르지 않습니다.");
            return ResponseEntity.status(401).body(response);
        }
    }

    @GetMapping("/menus")
    public List<Menu> getMenus() {
        return menuRepository.findAll();
    }

    @PutMapping("/menus/{id}/stock")
    public ResponseEntity<?> updateStock(@PathVariable Long id, @RequestBody Map<String, Object> requestBody) {
        Object stockObj = requestBody.get("stock");
        if (stockObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Stock value is required"));
        }

        int newStock = Integer.parseInt(stockObj.toString());

        return menuRepository.findById(id)
                .map(menu -> {
                    menu.setStock(newStock);
                    Menu updatedMenu = menuRepository.save(menu);
                    return ResponseEntity.ok(updatedMenu);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        // 오늘 자정(00:00:00) 구하기
        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
        List<OrderRecord> todayOrders = orderRecordRepository.findByCreatedAtAfter(todayStart);

        int totalSales = todayOrders.stream()
                .mapToInt(OrderRecord::getTotalAmount)
                .sum();
        int totalOrders = todayOrders.size();

        Map<String, Object> stats = new HashMap<>();
        stats.put("sales", totalSales);
        stats.put("orders", totalOrders);
        return stats;
    }

    @GetMapping("/orders/today")
    public List<OrderRecord> getTodayOrders() {
        // 오늘 자정(00:00:00) 구하기
        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
        return orderRecordRepository.findByCreatedAtAfter(todayStart);
    }
}
