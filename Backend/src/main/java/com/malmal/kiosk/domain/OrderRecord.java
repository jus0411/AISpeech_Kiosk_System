package com.malmal.kiosk.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import java.time.LocalDateTime;

@Entity
public class OrderRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer totalAmount;
    private LocalDateTime createdAt;

    @Column(columnDefinition = "TEXT")
    private String cartItemsJson;

    protected OrderRecord() {}

    public OrderRecord(Integer totalAmount, LocalDateTime createdAt, String cartItemsJson) {
        this.totalAmount = totalAmount;
        this.createdAt = createdAt;
        this.cartItemsJson = cartItemsJson;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Integer totalAmount) { this.totalAmount = totalAmount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getCartItemsJson() { return cartItemsJson; }
    public void setCartItemsJson(String cartItemsJson) { this.cartItemsJson = cartItemsJson; }
}
