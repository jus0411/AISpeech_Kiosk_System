package com.malmal.kiosk.repository;

import com.malmal.kiosk.domain.OrderRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface OrderRecordRepository extends JpaRepository<OrderRecord, Long> {
    // 특정 시간 이후에 생성된 주문 내역 조회 (오늘 주문 내역을 조회할 때 사용)
    List<OrderRecord> findByCreatedAtAfter(LocalDateTime dateTime);
}
