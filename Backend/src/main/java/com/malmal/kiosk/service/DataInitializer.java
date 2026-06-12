package com.malmal.kiosk.service;

import com.malmal.kiosk.domain.Menu;
import com.malmal.kiosk.repository.MenuRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final MenuRepository menuRepository;

    public DataInitializer(MenuRepository menuRepository) {
        this.menuRepository = menuRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        // 필드 이름 변경 후 데이터 정합성을 위해 기존 데이터를 삭제하고 새로 고침 (필요 시)
        menuRepository.deleteAll(); 

        Menu set1 = new Menu("말말 세트 (아메리카노+베이글)", 7000L, "HOT", "/images/malmalmonring.png", "set");
        set1.setComponentNames("카페 아메리카노,플레인 베이글");
        
        Menu set2 = new Menu("말말 디저트 세트 (라떼+치즈케이크)", 11000L, "BOTH", "/images/malmaldesert.png", "set");
        set2.setComponentNames("카페 라떼,번트 치즈 케이크");
        
        Menu set3 = new Menu("말말 시그니처 세트 (아인슈페너+마카롱)", 8500L, "ICE", "/images/malmalsigniture.png", "set");
        set3.setComponentNames("말말 아인슈페너,블루베리 마카롱");

        List<Menu> menus = Arrays.asList(
            // 세트 메뉴 (name, price, type, img, category)
            set1, set2, set3,

            // 시그니처
            new Menu("말말 아인슈페너", 6500L, "ICE", "/images/malmaleinspanner.png", "signature"),
            new Menu("말말 흑임자 샷 라떼", 6800L, "ICE", "/images/malmalblacksesame.png", "signature"),
            new Menu("말말 레드 크림슨 티", 6000L, "BOTH", "/images/malmalred.png", "signature"),

            // 커피
            new Menu("카페 아메리카노", 4500L, "BOTH", "/images/americano.png", "caffeine"),
            new Menu("카페 라떼", 5000L, "BOTH", "/images/latte.png", "caffeine"),
            new Menu("바닐라 라떼", 5500L, "BOTH", "/images/vanillalatte.png", "caffeine"),
            new Menu("카라멜 마끼아또", 5900L, "BOTH", "/images/caramel.png", "caffeine"),
            new Menu("콜드 브루", 4900L, "ICE", "/images/coldbrew.png", "caffeine"),
            new Menu("에스프레소", 3000L, "HOT", "/images/espreso.png", "caffeine"),

            // 논커피
            new Menu("시그니처 초콜릿", 5700L, "BOTH", "/images/signiturechoco.png", "noncoffee"),
            new Menu("제주 유기농 말차 라떼", 6100L, "BOTH", "/images/matchalatte.png", "noncoffee"),
            new Menu("딸기 라떼", 6500L, "ICE", "/images/strawberrylatte.png", "noncoffee"),
            new Menu("고구마 라떼", 5500L, "HOT", "/images/gogumalatte.png", "noncoffee"),

            // 에이드
            new Menu("피치 딸기 에이드", 5700L, "ICE", "/images/peachstrawberrypizio.png", "ade"),
            new Menu("쿨 라임 에이드", 5900L, "ICE", "/images/coollimepizio.png", "ade"),
            new Menu("청포도 에이드", 5500L, "ICE", "/images/grapeade.png", "ade"),
            new Menu("자몽 에이드", 5500L, "ICE", "/images/grapefruitade.png", "ade"),
            
            // 디저트
            new Menu("번트 치즈 케이크", 6900L, "NONE", "/images/buntcheesecake.png", "dessert"),
            new Menu("마스카포네 티라미수", 7000L, "NONE", "/images/tiramisu.png", "dessert"),
            new Menu("클래식 스콘", 3500L, "NONE", "/images/classicscone.png", "dessert"),
            new Menu("블루베리 마카롱", 3000L, "NONE", "/images/blueberrymacaron.png", "dessert"),
            new Menu("두바이 쫀득 쿠키", 5000L, "NONE", "/images/dubai.png", "dessert"),
            new Menu("플레인 베이글", 3500L, "NONE", "/images/classicscone.png", "dessert"), // 임시 이미지 공유

            // 티
            new Menu("자몽 허니 블랙 티", 5700L, "BOTH", "/images/grapefruitblacktea.png", "tea"),
            new Menu("유자 민트 티", 5900L, "BOTH", "/images/yujaminttea.png", "tea"),
            new Menu("로얄 밀크티", 5500L, "BOTH", "/images/royalmilktea.png", "tea"),
            new Menu("캐모마일 블렌드 티", 4500L, "BOTH", "/images/chamomiletea.png", "tea")
        );

        menuRepository.saveAll(menus);
        System.out.println(">>> 메뉴 데이터 필드명 수정 및 재로드 완료!");
    }
}
