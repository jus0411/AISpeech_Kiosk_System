package com.malmal.kiosk.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Menu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private Long price;
    private String type;
    private String img; // imageUrl에서 img로 변경

    private String category;

    // 세트 메뉴의 구성 단품 메뉴 이름들 (쉼표로 구분)
    private String componentNames;

    // 재고 관리
    private Integer stock = 50;

    protected Menu() {}

    public Menu(String name, Long price, String type, String img, String category) {
        this.name = name;
        this.price = price;
        this.type = type;
        this.img = img;
        this.category = category;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public Long getPrice() { return price; }
    public String getType() { return type; }
    public String getImg() { return img; } // Getter 이름도 변경
    public String getCategory() { return category; }
    
    public String getComponentNames() { return componentNames; }
    public void setComponentNames(String componentNames) { this.componentNames = componentNames; }
    
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
}
