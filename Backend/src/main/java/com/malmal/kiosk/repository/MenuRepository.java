package com.malmal.kiosk.repository;

import com.malmal.kiosk.domain.Menu;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MenuRepository extends JpaRepository<Menu, Long> {
    // 특정 카테고리의 메뉴들만 가져오기 위한 메서드
    List<Menu> findByCategory(String category);
    
    // 이름으로 메뉴 찾기 (세트 메뉴 구성품 재고 차감 시 사용)
    Optional<Menu> findByName(String name);
}
