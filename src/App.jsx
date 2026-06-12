import { useState, useEffect, useRef } from 'react';
import './App.css';
import { numWords, menuAliasesByName, optionOptions } from './data';
let isPaymentConfirming = false;

function App() {
  const [isSplashScreen, setIsSplashScreen] = useState(true);
  const [menuData, setMenuData] = useState({
    set: [], signature: [], caffeine: [], noncoffee: [], ade: [], dessert: [], tea: []
  });
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState('signature');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartHeight, setCartHeight] = useState(40);
  const [isDraggingCart, setIsDraggingCart] = useState(false);
  const cartDragRef = useRef({ isDragging: false, startY: 0, startHeight: 40, hasDragged: false, currentHeight: 40 });

  const [activeModal, setActiveModal] = useState('MAIN');
  const [receiptTime, setReceiptTime] = useState('');
  const [activeDetailItem, setActiveDetailItem] = useState(null);
  const [currentOptions, setCurrentOptions] = useState({});
  const [currentModalQty, setCurrentModalQty] = useState(1);

  const [toastMessage, setToastMessage] = useState("");
  const toastTimeoutRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  const speakTTS = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // 마크다운 강조(별표) 등의 특수 기호를 소리 내어 읽지 않도록 정제
    const cleanText = text ? text.replace(/\*/g, "") : "";
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.05; // refined pacing rate
    
    const voices = window.speechSynthesis.getVoices();
    // Prioritize high-quality natural female Korean voice
    const femaleVoice = voices.find(v => 
      v.lang === 'ko-KR' && 
      (v.name.includes('SunHi') || v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('female') || v.name.includes('여성'))
    ) || voices.find(v => v.lang === 'ko-KR');

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const [orderQueue, setOrderQueue] = useState([]);
  const [lastProcessingPaymentMethod, setLastProcessingPaymentMethod] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [lastRecognizedText, setLastRecognizedText] = useState("");

  const [orderType, setOrderType] = useState('매장');

  const [aiMessage, setAiMessage] = useState("말말카페 AI 말말이입니다. 🎤버튼을 누르고 기분이나 취향을 말씀해 주시면, 맞춤 메뉴를 추천해 드릴게요!");
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // ⭐️ [추가한 부분] 고령자 및 접근성(돋보기) 모드 상태
  const [isA11yMode, setIsA11yMode] = useState(false);

  // ⭐️ [추가한 부분] 장바구니 스와이프 제스처 상태
  const [swipeData, setSwipeData] = useState({ id: null, startX: 0, currentX: 0, isDragging: false });

  const handleDragStart = (e, uniqueKey) => {
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    setSwipeData({ id: uniqueKey, startX: clientX, currentX: 0, isDragging: true });
  };
  const handleDragMove = (e, uniqueKey) => {
    if (swipeData.id === uniqueKey && swipeData.isDragging) {
      const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      setSwipeData(prev => ({ ...prev, currentX: clientX - prev.startX }));
    }
  };
  const handleDragEnd = (e, uniqueKey) => {
    if (swipeData.id === uniqueKey && swipeData.isDragging) {
      if (swipeData.currentX < -80) {
        removeItemCompletely(uniqueKey);
      }
      setSwipeData({ id: null, startX: 0, currentX: 0, isDragging: false });
    }
  };

  // ⭐️ 장바구니 상하 스와이프 드래그 리사이즈 로직
  const handleCartDragStart = (e) => {
    if (window.innerWidth > 1024) return;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    const initialHeight = isCartOpen ? cartHeight : (75 / window.innerHeight * 100);
    cartDragRef.current = { isDragging: true, startY: clientY, startHeight: initialHeight, hasDragged: false, currentHeight: initialHeight };
    setIsDraggingCart(true);
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!cartDragRef.current.isDragging) return;
      const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
      const deltaY = clientY - cartDragRef.current.startY;

      if (Math.abs(deltaY) > 5) {
        cartDragRef.current.hasDragged = true;
        const vhDelta = (deltaY / window.innerHeight) * 100;
        let newHeight = cartDragRef.current.startHeight - vhDelta;

        if (newHeight > 90) newHeight = 90;
        if (newHeight < 12) newHeight = 12;

        cartDragRef.current.currentHeight = newHeight;
        setCartHeight(newHeight);

        setIsCartOpen(prev => {
          if (!prev && newHeight > 15) return true;
          return prev;
        });
      }
    };

    const handleEnd = () => {
      if (!cartDragRef.current.isDragging) return;
      cartDragRef.current.isDragging = false;
      setIsDraggingCart(false);

      if (cartDragRef.current.hasDragged) {
        if (cartDragRef.current.currentHeight < 20) {
          setIsCartOpen(false);
          setCartHeight(40);
        }
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);
  useEffect(() => {
    const fetchMenus = () => {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://malmal-coffee.duckdns.org';
      fetch(`${API_BASE_URL}/api/menus`)
        .then(res => res.json())
        .then(data => {
          // 세트 메뉴 재고 동적 계산 (구성품 중 가장 적은 재고를 세트 재고로 덮어쓰기)
          data.forEach(menu => {
            if (menu.componentNames) {
              const compNames = menu.componentNames.split(',');
              const compStocks = compNames.map(cName => {
                const comp = data.find(m => m.name === cName.trim());
                return comp ? comp.stock : 0;
              });
              if (compStocks.length > 0) {
                menu.stock = Math.min(...compStocks); // 세트 자체 재고는 무시하고 구성품 재고 중 최소값으로 동기화
              }
            }
          });

          // 백엔드의 평면적인 리스트를 카테고리별 객체로 변환
          const categorized = data.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
          }, {
            set: [], signature: [], caffeine: [], noncoffee: [], ade: [], dessert: [], tea: []
          });
          setMenuData(categorized);
          setLoading(false);
        })
        .catch(err => {
          console.error("데이터를 가져오는데 실패했습니다:", err);
          setLoading(false);
        });
    };

    fetchMenus();
    const interval = setInterval(fetchMenus, 3000); // 3초마다 갱신 (실시간 반영)
    return () => clearInterval(interval);
  }, []);

  // 결제 리다이렉션 승인 및 데이터 복원 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentSuccess = params.get('payment_success');
    const paymentFail = params.get('payment_fail');
    const paymentKey = params.get('paymentKey');
    const orderId = params.get('orderId');
    const amount = params.get('amount');

    if (paymentSuccess === 'true' && paymentKey && orderId && amount) {
      if (isPaymentConfirming) return;
      isPaymentConfirming = true;

      // 1. localStorage에서 결제 전 장바구니 및 수령 방식 복원
      const savedCart = localStorage.getItem("malmal_kiosk_cart");
      const savedOrderType = localStorage.getItem("malmal_kiosk_orderType");
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
      if (savedOrderType) {
        setOrderType(savedOrderType);
      }

      // 2. 화면을 PROCESSING(결제 처리 중) 상태로 전환
      setLastProcessingPaymentMethod("카드");
      setActiveModal('PROCESSING');
      setIsSplashScreen(false); // 스플래시 화면 건너뛰기

      // 3. 백엔드에 결제 승인 요청 보냄
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://malmal-coffee.duckdns.org';
      fetch(`${API_BASE_URL}/api/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentKey: paymentKey,
          orderId: orderId,
          amount: Number(amount),
          cartItems: savedCart ? JSON.parse(savedCart) : []
        })
      })
      .then(res => {
        if (!res.ok) throw new Error("승인 실패");
        return res.json();
      })
      .then(data => {
        // 결제 승인 성공 시 영수증 모달 출력 및 음성 피드백
        setReceiptTime(new Date().toLocaleString());
        setActiveModal('RECEIPT');
        speakTTS("결제가 완료되었습니다. 이용해 주셔서 감사합니다.");
        
        // URL 파라미터 지우기 (새로고침 시 재요청 방지)
        window.history.replaceState({}, document.title, window.location.pathname);
        // localStorage 임시 데이터 삭제
        localStorage.removeItem("malmal_kiosk_cart");
        localStorage.removeItem("malmal_kiosk_orderType");
        localStorage.removeItem("malmal_kiosk_totalAmount");
      })
      .catch(err => {
        console.error("결제 승인 오류:", err);
        isPaymentConfirming = false;
        showToast("결제 승인에 실패했습니다. 다시 시도해 주세요.");
        setActiveModal('MAIN');
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    } else if (paymentFail === 'true') {
      // 결제 실패 처리
      const savedCart = localStorage.getItem("malmal_kiosk_cart");
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
      showToast("결제가 취소되었거나 실패했습니다.");
      setActiveModal('MAIN');
      setIsSplashScreen(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const recognitionTimeoutRef = useRef(null);
  const recognitionRef = useRef(null);

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.count, 0);
  const cartWithUniqueKey = cart.map(item => ({ ...item, uniqueKey: item.id + "_" + item.optionKey }));

  const changeCount = (uniqueKey, delta) => {
    setCart((prev) => prev.map((item) => {
      const itemUniqueKey = item.id + "_" + item.optionKey;
      return itemUniqueKey === uniqueKey ? { ...item, count: item.count + delta } : item;
    }).filter((item) => item.count > 0));
  };

  const removeItemCompletely = (uniqueKey) => {
    setCart((prev) => prev.filter((item) => {
      const itemUniqueKey = item.id + "_" + item.optionKey;
      return itemUniqueKey !== uniqueKey;
    }));
  };

  const processNextInQueue = (currentQueue) => {
    if (currentQueue && currentQueue.length > 1) {
      const nextQueue = currentQueue.slice(1);
      setOrderQueue(nextQueue);
      openDetailModal(nextQueue[0].item, nextQueue[0].qty, nextQueue[0].options);
    } else {
      setOrderQueue([]);
      setActiveModal('MAIN');
      setActiveDetailItem(null);
    }
  };

  const addFinalItemToCartWithOpts = (opts) => {
    setCart((prev) => {
      const optionKey = JSON.stringify(opts);
      const existingIdx = prev.findIndex((i) => i.id === activeDetailItem.id && i.optionKey === optionKey);

      let price = activeDetailItem.price;
      if (opts.shot === "에스프레소 샷 추가 (+500원)") price += 500;

      if (existingIdx !== -1) {
        return prev.map((i, idx) =>
          idx === existingIdx ? { ...i, count: i.count + currentModalQty, price: price } : i
        );
      }
      return [...prev, { ...activeDetailItem, count: currentModalQty, price: price, options: { ...opts }, optionKey: optionKey }];
    });
    processNextInQueue(orderQueue);
  };

  const addFinalItemToCart = () => addFinalItemToCartWithOpts(currentOptions);

  const handleCancelModal = () => processNextInQueue(orderQueue);

  const handleMenuClick = (item) => {
    if (item.type === 'NONE') {
      setCart(prevCart => {
        let newCart = [...prevCart];
        const existingIdx = newCart.findIndex(i => i.id === item.id && i.optionKey === "{}");
        if (existingIdx !== -1) newCart[existingIdx] = { ...newCart[existingIdx], count: newCart[existingIdx].count + 1 };
        else newCart.push({ ...item, count: 1, options: {}, optionKey: "{}" });
        return newCart;
      });
    } else {
      setOrderQueue([{ item: item, qty: 1 }]);
      openDetailModal(item, 1);
    }
  };

  // ⭐️ [신규] 완전히 랜덤화되고 똑똑해진 AI 추천 로직 (백엔드 Gemini API 연동)
  const fetchAiRecommendation = async (text) => {
    setIsAiThinking(true);
    setAiRecommendations([]);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://malmal-coffee.duckdns.org';
      const response = await fetch(`${API_BASE_URL}/api/ai/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error("서버 응답 오류");
      }

      const data = await response.json();
      const reply = data.recommendation;

      // 전체 메뉴 리스트를 가져와서 제미나이가 추천한 텍스트 안에 메뉴 이름이나 별명(Alias)이 있는지 똑똑하게 확인
      const allMenus = [...menuData.set, ...menuData.signature, ...menuData.caffeine, ...menuData.noncoffee, ...menuData.ade, ...menuData.dessert, ...menuData.tea];
      const spacelessReply = reply.replace(/ /g, ""); // 띄어쓰기 무시하고 검사하기 위함

      const recommendedItems = allMenus.filter(menu => {
        // 1. 원본 이름 포함 여부
        if (reply.includes(menu.name)) return true;
        // 2. 띄어쓰기를 없앤 이름 포함 여부
        const spacelessName = menu.name.replace(/ /g, "");
        if (spacelessReply.includes(spacelessName)) return true;
        // 3. 메뉴의 별명(Alias)이 응답에 포함되어 있는지 검사 (예: "아메리카노" -> "카페 아메리카노" 매칭)
        if (menuAliasesByName && menuAliasesByName[menu.name]) {
          for (let alias of menuAliasesByName[menu.name]) {
            if (spacelessReply.includes(alias.replace(/ /g, ""))) return true;
          }
        }
        return false;
      });

      setAiMessage(reply);
      speakTTS(reply);
      // 만약 매칭된 카드가 없다면(드물게 발생), 전체 메뉴 중 랜덤으로 2개라도 띄워주기 (빈 화면 방지)
      setAiRecommendations(recommendedItems.length > 0 ? recommendedItems : allMenus.sort(() => 0.5 - Math.random()).slice(0, 2));
    } catch (error) {
      console.error("AI 추천 통신 오류:", error);
      const fallbackMsg = "현재 AI 서버 접속량이 많아, 인기 메뉴를 무작위로 추천해 드릴게요!";
      setAiMessage(fallbackMsg);
      speakTTS(fallbackMsg);
      const allMenus = [...menuData.set, ...menuData.signature, ...menuData.caffeine, ...menuData.noncoffee, ...menuData.ade, ...menuData.dessert, ...menuData.tea];
      setAiRecommendations(allMenus.sort(() => 0.5 - Math.random()).slice(0, 2));
    } finally {
      setIsAiThinking(false);
    }
  };

  const processVoiceOrder = (text) => {
    setLastRecognizedText(text);
    const spacelessText = text.replace(/ /g, "");
    const allMenus = [...menuData.set, ...menuData.signature, ...menuData.caffeine, ...menuData.noncoffee, ...menuData.ade, ...menuData.dessert, ...menuData.tea];

    if (spacelessText.includes("결제") || spacelessText.includes("계산")) {
      if (activeModal !== 'RECEIPT' && activeModal !== 'PROCESSING' && activeModal !== 'PAYMENT') {
        startPaymentFlow();
        return;
      }
    }

    if (activeModal === 'RECEIPT') {
      if (spacelessText.includes("확인") || spacelessText.includes("처음으로") || spacelessText.includes("닫기")) { closeReceipt(); return; }
    }

    if (activeModal === 'PAYMENT') {
      let isTypeUpdated = false;
      if (spacelessText.includes("매장") || spacelessText.includes("먹고")) { setOrderType("매장"); isTypeUpdated = true; }
      if (spacelessText.includes("포장") || spacelessText.includes("테이크아웃") || spacelessText.includes("가져")) { setOrderType("포장"); isTypeUpdated = true; }

      if (spacelessText.includes("현금")) { handlePaymentSelection("CASH"); return; }
      if (spacelessText.includes("카드")) { handlePaymentSelection("CARD"); return; }
      if (spacelessText.includes("닫기") || spacelessText.includes("취소")) { setActiveModal('MAIN'); return; }

      if (isTypeUpdated) return;
    }

    if (activeModal === 'DETAIL') {
      let newOptions = { ...currentOptions };
      let isOptionUpdated = false;
      const updateOpt = (key, val) => { newOptions[key] = val; isOptionUpdated = true; };

      if (activeDetailItem.type !== 'NONE') {
        if (spacelessText.includes("얼음조금")) updateOpt("ice", "얼음 조금");
        if (spacelessText.includes("얼음중간")) updateOpt("ice", "얼음 중간");
        if (spacelessText.includes("얼음많이")) updateOpt("ice", "얼음 많이");
        if (spacelessText.includes("얼음없이") || spacelessText.includes("얼음빼고")) updateOpt("ice", "없음");

        if (spacelessText.includes("핫") || spacelessText.includes("따뜻한")) updateOpt("temp", "HOT");
        if (spacelessText.includes("아이스") || spacelessText.includes("차가운")) updateOpt("temp", "ICE");

        if (spacelessText.includes("당도30")) updateOpt("sweetness", "30%");
        if (spacelessText.includes("당도50") || spacelessText.includes("당도기본")) updateOpt("sweetness", "50% (기본)");
        if (spacelessText.includes("당도70")) updateOpt("sweetness", "70%");
        if (spacelessText.includes("당도100")) updateOpt("sweetness", "100%");

        if (spacelessText.includes("펄추가")) updateOpt("pearl", "타피오카 펄 추가");
        if (spacelessText.includes("화이트펄추가")) updateOpt("pearl", "화이트 펄 추가");
        if (spacelessText.includes("펄없이") || spacelessText.includes("펄빼고")) updateOpt("pearl", "없음");

        if (spacelessText.includes("샷추가")) updateOpt("shot", "에스프레소 샷 추가 (+500원)");
        if (spacelessText.includes("샷없이") || spacelessText.includes("샷빼고")) updateOpt("shot", "없음");
      }

      if (isOptionUpdated) {
        setCurrentOptions(newOptions);
      }

      if (spacelessText.includes("확인") || spacelessText.includes("담기") || spacelessText.includes("담아") || spacelessText.includes("주문")) {
        addFinalItemToCartWithOpts(newOptions);
        return;
      }
      if (spacelessText.includes("닫기") || spacelessText.includes("취소")) {
        handleCancelModal();
        return;
      }
      if (isOptionUpdated) return;
    }

    if (activeModal === 'MAIN') {
      const isClearAll = (spacelessText.includes("전부") || spacelessText.includes("모두") || spacelessText.includes("전체") || spacelessText.includes("싹다")) &&
        (spacelessText.includes("취소") || spacelessText.includes("빼") || spacelessText.includes("삭제") || spacelessText.includes("비워")) ||
        spacelessText.includes("다취소") || spacelessText.includes("다빼") || spacelessText.includes("다삭제") || spacelessText.includes("전부비워");

      if (isClearAll) { setCart([]); return; }

      // ⭐️ [신규 로직] AI 추천 화면에서 "추천해준거 다 담아줘" 등 상황 처리
      if (activeCategory === 'ai_recommend' && aiRecommendations.length > 0) {
        const isCartAddIntent = spacelessText.match(/담아|주문|추가|줘|시킬|담을/);
        const isTargetingRecommendations = spacelessText.match(/이거|그거|전부|다|하나씩|추천한|추천해준/);
        const isAskingNewRecommendation = spacelessText.match(/어때|알려|뭐가|다른|다시/);
        
        if (isCartAddIntent && isTargetingRecommendations && !isAskingNewRecommendation) {
           let hasOutOfStock = false;
           const availableItems = aiRecommendations.filter(item => {
             if (item.stock <= 0) {
               hasOutOfStock = true;
               return false;
             }
             return true;
           });

           if (availableItems.length === 0) {
             setAiMessage("추천해 드린 메뉴가 모두 품절되었습니다.");
             speakTTS("죄송합니다. 추천해 드린 메뉴가 모두 품절되었습니다.");
             return;
           }

           setCart(prevCart => {
             let newCart = [...prevCart];
             availableItems.forEach(item => {
                let defaultOpts = { shot: "없음" };
                if (item.type !== 'NONE') {
                  defaultOpts = {
                    temp: item.type === 'HOT' || item.type === 'BOTH' ? 'HOT' : 'ICE',
                    ice: item.type !== 'HOT' ? '얼음 중간' : '없음',
                    sweetness: '50% (기본)',
                    pearl: '없음',
                    shot: "없음"
                  };
                }
                const optionKey = item.type !== 'NONE' ? JSON.stringify(defaultOpts) : "{}";
                const existingIdx = newCart.findIndex(i => i.id === item.id && i.optionKey === optionKey);
                if (existingIdx !== -1) {
                  newCart[existingIdx] = { ...newCart[existingIdx], count: newCart[existingIdx].count + 1 };
                } else {
                  newCart.push({ ...item, count: 1, options: item.type !== 'NONE' ? defaultOpts : {}, optionKey: optionKey, price: item.price });
                }
             });
             return newCart;
           });
           
           if (hasOutOfStock) {
             setAiMessage("일부 메뉴가 품절되어, 주문 가능한 메뉴만 장바구니에 담았습니다.");
             speakTTS("일부 메뉴가 품절되어 주문 가능한 메뉴만 장바구니에 담았습니다. 결제하시려면 결제해 줘 라고 말씀해주세요.");
           } else {
             setAiMessage("말말이의 추천 메뉴를 장바구니에 쏙 담았습니다!");
             speakTTS("추천해 드린 메뉴를 모두 장바구니에 담았습니다. 결제하시려면 아래 결제하기 버튼을 누르시거나 결제해 줘 라고 말씀해주세요.");
           }
           return;
        }
      }

      let foundItems = [];
      allMenus.forEach(item => {
        const itemAliases = menuAliasesByName[item.name] || [];
        const spacelessName = item.name.replace(/ /g, "");
        const allAliasesToSearch = [spacelessName, ...itemAliases];

        for (let alias of allAliasesToSearch) {
          const idx = spacelessText.indexOf(alias);
          if (idx !== -1) { foundItems.push({ item, index: idx, nameLength: alias.length }); break; }
        }
      });

      // 사용자의 명시적인 추천/대화 의도 및 주문 의도 키워드 감지
      let isRecommendationIntent = spacelessText.includes("추천") || 
                                     spacelessText.includes("우울") || 
                                     spacelessText.includes("기분") || 
                                     spacelessText.includes("도와") || 
                                     spacelessText.includes("도움") || 
                                     spacelessText.includes("어때") || 
                                     spacelessText.includes("알려줘") || 
                                     spacelessText.includes("소개") || 
                                     (spacelessText.includes("뭐가") && spacelessText.includes("맛있"));

      // "추천한거 담아줘" 처럼 장바구니 추가 의도가 명확한 경우, AI 추천으로 넘어가지 않도록 예외 처리
      const isCartOrderCommand = spacelessText.match(/담아|주문|추가|줘|시킬|담을/);
      if (isRecommendationIntent && isCartOrderCommand && (spacelessText.includes("추천한") || spacelessText.includes("추천해준"))) {
        isRecommendationIntent = false;
      }

      // 만약 메뉴 매칭이 되었고, 명시적인 추천 의도가 아니라면 바로 주문 모달 노출/장바구니 추가 처리 진행
      if (foundItems.length > 0 && !isRecommendationIntent) {
        let validItems = [];
        foundItems.forEach(current => {
          const isOverlappedAndShorter = foundItems.some(other => {
            if (current === other) return false;
            const currentStart = current.index, currentEnd = current.index + current.nameLength;
            const otherStart = other.index, otherEnd = other.index + other.nameLength;
            if (Math.max(currentStart, otherStart) < Math.min(currentEnd, otherEnd)) {
              return current.nameLength < other.nameLength || (current.nameLength === other.nameLength && current.item.id > other.item.id);
            }
            return false;
          });
          if (!isOverlappedAndShorter) validItems.push(current);
        });

        validItems.sort((a, b) => a.index - b.index);

        const actions = [];
        validItems.forEach((found, i) => {
          const itemEnd = found.index + found.nameLength;
          const restOfText = spacelessText.substring(itemEnd);

          const removeMatch = restOfText.match(/취소|빼|삭제|없애/);
          const addMatch = restOfText.match(/추가|담|줘|주문|시킬/);

          let itemAction = 'ADD';
          if (removeMatch) {
            if (!addMatch) {
              itemAction = 'REMOVE';
            } else if (removeMatch.index < addMatch.index) {
              itemAction = 'REMOVE';
            }
          }

          const nextIndex = i + 1 < validItems.length ? validItems[i + 1].index : spacelessText.length;
          const chunk = spacelessText.substring(itemEnd, nextIndex);
          let qty = 1;
          const digitMatch = chunk.match(/\d+/);
          if (digitMatch) qty = parseInt(digitMatch[0], 10);
          else for (let nw of numWords) if (chunk.includes(nw.word)) { qty = nw.num; break; }

          if (itemAction === 'ADD') {
            if (found.item.stock <= 0) {
              showToast(`'${found.item.name}' 메뉴는 품절되어 담을 수 없습니다.`);
              speakTTS(`${found.item.name} 메뉴는 품절되어 주문하실 수 없습니다.`);
              return; // skip pushing to actions
            }
            if (found.item.stock < qty) {
              showToast(`'${found.item.name}' 메뉴의 재고가 부족하여 남은 수량(${found.item.stock}개)만큼만 담습니다.`);
              speakTTS(`${found.item.name} 메뉴의 재고가 부족하여 남은 수량인 ${found.item.stock}개까지만 담겠습니다.`);
              qty = found.item.stock; // Limit qty to available stock
            }
          }

          actions.push({ type: itemAction, item: found.item, qty });
        });

        let newQueue = [];
        let directAddActions = [];
        let itemsToRemove = [];

        actions.forEach(action => {
          if (action.type === 'REMOVE') {
            itemsToRemove.push(action.item);
          } else {
            if (action.item.type === 'NONE') {
              action.options = {};
              action.optionKey = "{}";
              directAddActions.push(action);
            } else {
              let defaultOpts = { shot: "없음" };
              if (action.item.type !== 'NONE') {
                defaultOpts = {
                  temp: action.item.type === 'HOT' || action.item.type === 'BOTH' ? 'HOT' : 'ICE',
                  ice: action.item.type === 'ICE' ? '얼음 중간' : '없음',
                  sweetness: '50% (기본)',
                  pearl: '없음',
                  shot: "없음"
                };
              }

              let newOptions = { ...defaultOpts };
              let isDirectAdd = false;

              if (spacelessText.match(/기본|그냥|바로/)) {
                isDirectAdd = true;
              }

              const updateOpt = (key, val) => { newOptions[key] = val; };

              if (action.item.type !== 'HOT') {
                if (spacelessText.includes("얼음조금")) updateOpt("ice", "얼음 조금");
                if (spacelessText.includes("얼음중간")) updateOpt("ice", "얼음 중간");
                if (spacelessText.includes("얼음많이")) updateOpt("ice", "얼음 많이");
                if (spacelessText.includes("얼음없이") || spacelessText.includes("얼음빼고")) updateOpt("ice", "없음");
              }

              if (spacelessText.includes("핫") || spacelessText.includes("따뜻한") || spacelessText.includes("따듯한") || spacelessText.includes("뜨아") || spacelessText.includes("핫초코")) {
                if (action.item.type !== 'ICE') {
                  updateOpt("temp", "HOT");
                  newOptions.ice = "없음";
                }
              }
              if (spacelessText.includes("아이스") || spacelessText.includes("차가운") || spacelessText.includes("아아") || spacelessText.includes("아이스초코")) {
                if (action.item.type !== 'HOT') {
                  updateOpt("temp", "ICE");
                  if (newOptions.ice === "없음" && !spacelessText.includes("얼음없이") && !spacelessText.includes("얼음빼고")) newOptions.ice = "얼음 중간";
                }
              }

              if (spacelessText.includes("당도30")) updateOpt("sweetness", "30%");
              if (spacelessText.includes("당도50") || spacelessText.includes("당도기본")) updateOpt("sweetness", "50% (기본)");
              if (spacelessText.includes("당도70")) updateOpt("sweetness", "70%");
              if (spacelessText.includes("당도100")) updateOpt("sweetness", "100%");

              if (spacelessText.includes("펄추가")) updateOpt("pearl", "타피오카 펄 추가");
              if (spacelessText.includes("화이트펄추가") || spacelessText.includes("알로에펄추가")) updateOpt("pearl", "화이트 펄 추가");
              if (spacelessText.includes("펄없이") || spacelessText.includes("펄빼고")) updateOpt("pearl", "없음");

              if (spacelessText.includes("샷추가")) updateOpt("shot", "에스프레소 샷 추가 (+500원)");
              if (spacelessText.includes("샷없이") || spacelessText.includes("샷빼고")) updateOpt("shot", "없음");

              if (isDirectAdd) {
                action.options = newOptions;
                action.optionKey = JSON.stringify(newOptions);
                directAddActions.push(action);
              } else {
                newQueue.push({ item: action.item, qty: action.qty, options: newOptions });
              }
            }
          }
        });

        if (itemsToRemove.length > 0) {
          setCart(prevCart => {
            let newCart = [...prevCart];
            itemsToRemove.forEach(item => { newCart = newCart.filter(cartItem => cartItem.id !== item.id); });
            return newCart;
          });
        }

        if (directAddActions.length > 0) {
          setCart(prevCart => {
            let newCart = [...prevCart];
            directAddActions.forEach(action => {
              let price = action.item.price;
              if (action.options && action.options.shot === "에스프레소 샷 추가 (+500원)") price += 500;

              const existingIdx = newCart.findIndex(i => i.id === action.item.id && i.optionKey === action.optionKey);
              if (existingIdx !== -1) {
                newCart[existingIdx] = { ...newCart[existingIdx], count: newCart[existingIdx].count + action.qty, price };
              } else {
                newCart.push({ ...action.item, count: action.qty, options: action.options || {}, optionKey: action.optionKey || "{}", price });
              }
            });
            return newCart;
          });
        }

        if (newQueue.length > 0) {
          setOrderQueue(newQueue);
          openDetailModal(newQueue[0].item, newQueue[0].qty, newQueue[0].options);
        }
        return;
      }

      // 메뉴 매칭이 없거나 명시적인 추천 의도가 포함된 경우 (자연어 기반 AI 추천 폴백 라우팅)
      if (foundItems.length === 0 || isRecommendationIntent) {
        const isSwitchingCategory = (spacelessText.includes("시그니처") || spacelessText.includes("세트") || spacelessText.includes("커피") || spacelessText.includes("에스프레소") || spacelessText.includes("논커피") || spacelessText.includes("디저트") || spacelessText.includes("푸드") || spacelessText.includes("에이드") || spacelessText.includes("주스") || spacelessText.includes("차") || spacelessText.includes("티")) && !spacelessText.includes("추천");

        // 1. 카테고리 전환 명령어가 감지되었다면 화면 즉시 전환
        if (isSwitchingCategory) {
          if (spacelessText.includes("시그니처")) { handleCategoryClick('signature'); return; }
          if (spacelessText.includes("세트")) { handleCategoryClick('set'); return; }
          if (spacelessText.includes("커피") || spacelessText.includes("에스프레소")) { handleCategoryClick('caffeine'); return; }
          if (spacelessText.includes("논커피")) { handleCategoryClick('noncoffee'); return; }
          if (spacelessText.includes("디저트") || spacelessText.includes("푸드")) { handleCategoryClick('dessert'); return; }
          if (spacelessText.includes("에이드") || spacelessText.includes("주스")) { handleCategoryClick('ade'); return; }
          if (spacelessText.includes("차") || spacelessText.includes("티")) { handleCategoryClick('tea'); return; }
        }

        // 2. 카테고리 전환이 아닌 그 외 모든 미매칭 발화는 아주 자연스럽게 AI 추천 탭으로 즉시 전환하여 제미나이 추천 실행!
        if (activeCategory !== 'ai_recommend') {
          handleCategoryClick('ai_recommend');
        }
        fetchAiRecommendation(text);
        return;
      }
    }
  };

  const startVoiceRecognition = () => {
    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return showToast("크롬 브라우저를 사용해 주세요.");

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'ko-KR';
      // continuous를 false로 변경: 사용자가 말을 멈추면 즉시 인식을 종료하고 결과를 반환하여 반응 속도를 대폭 높임
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
    }

    const recognition = recognitionRef.current;

    recognition.onstart = () => {
      setIsListening(true);
      setLastRecognizedText("");

      recognitionTimeoutRef.current = setTimeout(() => {
        recognition.stop();
      }, 15000);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
    };

    recognition.onerror = () => {
      setIsListening(false);
      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
    };

    recognition.onresult = (event) => {
      const lastIdx = event.results.length - 1;
      const transcript = event.results[lastIdx][0].transcript;

      processVoiceOrder(transcript);
      recognition.stop();
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn("음성 인식이 이미 실행 중입니다.", e);
    }
  };

  const openDetailModal = (item, qty = 1, preSelectedOptions = null) => {
    setActiveDetailItem(item);
    setCurrentModalQty(qty);
    setActiveModal('DETAIL');

    if (preSelectedOptions) {
      setCurrentOptions(preSelectedOptions);
    } else {
      let defaultOptions = { shot: "없음" };
      if (item.type !== 'NONE') {
        defaultOptions = {
          temp: item.type === 'HOT' || item.type === 'BOTH' ? 'HOT' : 'ICE',
          ice: item.type !== 'HOT' ? '얼음 중간' : '없음',
          sweetness: '50% (기본)',
          pearl: '없음',
          shot: "없음"
        };
      }
      setCurrentOptions(defaultOptions);
    }
  };

  const startPaymentFlow = () => {
    if (cart.length === 0) return showToast("담긴 메뉴가 없습니다.");

    // 장바구니에 담긴 메뉴들의 총 수량을 ID별로 합산
    const aggregatedCounts = {};
    for (const item of cart) {
      if (!aggregatedCounts[item.id]) {
        aggregatedCounts[item.id] = { name: item.name, count: 0 };
      }
      aggregatedCounts[item.id].count += item.count;
    }

    // 합산된 수량과 현재 최신 재고(menuData)를 비교하여 검증
    for (const menuId in aggregatedCounts) {
      const aggItem = aggregatedCounts[menuId];
      let menuInfo = null;
      for (const category in menuData) {
        const found = menuData[category].find(m => m.id === parseInt(menuId, 10));
        if (found) {
          menuInfo = found;
          break;
        }
      }

      if (menuInfo) {
        if (aggItem.count > menuInfo.stock) {
          showToast(`'${aggItem.name}' 메뉴의 재고가 부족합니다.\n현재 남은 수량: ${menuInfo.stock}개`);
          return; // 재고가 부족하면 결제 모달로 넘어가지 않음
        }
      }
    }

    setOrderType('매장');
    setActiveModal('PAYMENT');
  };

  const handlePaymentSelection = (method) => {
    setLastProcessingPaymentMethod(method === "CASH" ? "현금" : "카드");
    if (method === "CARD") {
      const clientKey = "test_ck_GjLJoQ1aVZbWyYDyDdalVw6KYe2R";
      const tossPayments = window.TossPayments ? window.TossPayments(clientKey) : null;
      if (tossPayments) {
        if (totalAmount <= 0) {
          showToast("결제할 금액이 없습니다.");
          return;
        }

        // 결제 전 상태를 localStorage에 백업 (리다이렉트 대비)
        localStorage.setItem("malmal_kiosk_cart", JSON.stringify(cart));
        localStorage.setItem("malmal_kiosk_orderType", orderType);
        localStorage.setItem("malmal_kiosk_totalAmount", totalAmount.toString());

        const orderId = `order_${Date.now()}`;
        const origin = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:5173';

        tossPayments.requestPayment('카드', {
          amount: Math.round(totalAmount),
          orderId: orderId,
          orderName: cart.map(item => item.name).join(', ').substring(0, 80) || '말말카페 음료 결제',
          successUrl: `${origin}/?payment_success=true`,
          failUrl: `${origin}/?payment_fail=true`,
        }).catch((error) => {
          console.error("토스 결제 에러:", error);
          showToast(`결제창을 여는데 실패했습니다.\n사유: ${error.message || error.code || '네트워크 혹은 가상 키 인증 오류'}`);
        });
      } else {
        showToast("토스 결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } else {
      setActiveModal('PROCESSING');
    }
  };

  // 현금 결제용 5초 자동 승인 시뮬레이션
  useEffect(() => {
    if (activeModal === 'PROCESSING' && lastProcessingPaymentMethod === '현금') {
      const timer = setTimeout(() => {
        // 현금 결제 성공 처리: 백엔드에 장바구니 데이터를 보내서 재고 차감 요청
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://malmal-coffee.duckdns.org';
        fetch(`${API_BASE_URL}/api/payments/cash`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartItems: cart })
        }).then(() => {
          setReceiptTime(new Date().toLocaleString());
          setActiveModal('RECEIPT');
          speakTTS("결제가 완료되었습니다. 이용해 주셔서 감사합니다.");
        }).catch(err => {
          console.error("현금 결제 재고 차감 실패", err);
          setReceiptTime(new Date().toLocaleString());
          setActiveModal('RECEIPT');
          speakTTS("결제가 완료되었습니다. 이용해 주셔서 감사합니다.");
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeModal, lastProcessingPaymentMethod, cart]);

  const closeReceipt = () => {
    setCart([]);
    setActiveModal('MAIN');
    setLastRecognizedText("");
    setIsSplashScreen(true);
  };

  const handleCategoryClick = (category) => {
    setActiveCategory(category);
    const menuArea = document.querySelector('.menu-area');
    if (menuArea) menuArea.scrollTop = 0;
  };

  // ⭐️ [신규] 에러 방지를 위해 컴포넌트 내부로 안전하게 편입된 상세 모달
  const renderItemDetailModal = () => {
    if (!activeDetailItem) return null;

    return (
      <div className="modal">
        <div className="modal-content">
          <h2 style={{ margin: '0' }}>{activeDetailItem.name}</h2>
          {orderQueue.length > 1 && (
            <div style={{ textAlign: 'center', color: '#ff5252', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '5px' }}>
              (남은 선택 항목: {orderQueue.length - 1}개)
            </div>
          )}
          <div style={{ textAlign: 'center', color: 'var(--mm-primary)', fontWeight: '900', fontSize: '1.6rem', fontFamily: 'var(--font-numeric)', margin: '20px 0', padding: '15px', background: 'var(--mm-light)', border: '1px solid rgba(128,0,32,0.1)', borderRadius: '15px' }}>
            {(activeDetailItem.price + (currentOptions.shot === "에스프레소 샷 추가 (+500원)" ? 500 : 0)).toLocaleString()}원 <span style={{ color: '#888', fontSize: '1rem', fontWeight: 'bold', fontFamily: 'var(--font-main)' }}>(x{currentModalQty})</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
            <button onClick={startVoiceRecognition} className={`mic-btn ${isListening ? 'listening' : ''}`} title="옵션 음성으로 선택">🎤</button>
          </div>

          {activeDetailItem.type !== 'NONE' && (
            <>
              {(activeDetailItem.type === 'BOTH' || activeDetailItem.type === 'HOT') && (
                <div className="option-group">
                  <label className="option-title">온도</label>
                  <div className="option-items">
                    {optionOptions.temp.map(t => (
                      <div key={t} onClick={() => setCurrentOptions(prev => ({ ...prev, temp: t, ice: t === 'HOT' ? '없음' : '얼음 중간' }))} className={`option-item ${currentOptions.temp === t ? 'active' : ''}`}>{t}</div>
                    ))}
                  </div>
                </div>
              )}

              {currentOptions.temp === 'ICE' && activeDetailItem.type !== 'HOT' && (
                <div className="option-group">
                  <label className="option-title">얼음량</label>
                  <div className="option-items">
                    {optionOptions.ice.map(i => (
                      <div key={i} onClick={() => setCurrentOptions(prev => ({ ...prev, ice: i }))} className={`option-item ${currentOptions.ice === i ? 'active' : ''}`}>{i}</div>
                    ))}
                  </div>
                </div>
              )}

              {(activeDetailItem.id >= 13 && activeDetailItem.id <= 16) || (activeDetailItem.id >= 25 && activeDetailItem.id <= 28) ? (
                <div className="option-group">
                  <label className="option-title">당도</label>
                  <div className="option-items">
                    {optionOptions.sweetness.map(s => (
                      <div key={s} onClick={() => setCurrentOptions(prev => ({ ...prev, sweetness: s }))} className={`option-item ${currentOptions.sweetness === s ? 'active' : ''}`}>{s}</div>
                    ))}
                  </div>
                </div>
              ) : null}

              {(activeDetailItem.type === 'BOTH' || activeDetailItem.type === 'ICE') && (
                <div className="option-group">
                  <label className="option-title">펄 추가</label>
                  <div className="option-items">
                    {optionOptions.pearl.map(p => (
                      <div key={p} onClick={() => setCurrentOptions(prev => ({ ...prev, pearl: p }))} className={`option-item ${currentOptions.pearl === p ? 'active' : ''}`}>{p}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="option-group">
            <label className="option-title">샷 추가</label>
            <div className="option-items">
              {optionOptions.shot.map(s => (
                <div key={s} onClick={() => setCurrentOptions(prev => ({ ...prev, shot: s }))} className={`option-item ${currentOptions.shot === s ? 'active' : ''}`}>{s}</div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
            <button className="close-btn" style={{ flex: 1, margin: 0, padding: '15px', color: '#666', fontSize: '1.2rem', borderRadius: '10px' }} onClick={handleCancelModal}>취소</button>
            <button className="pay-btn" style={{ flex: 1, margin: 0, padding: '15px', fontSize: '1.2rem', borderRadius: '10px' }} onClick={addFinalItemToCart}>담기</button>
          </div>
        </div>
      </div>
    );
  };

  if (isSplashScreen) {
    return (
      <div className="splash-screen" onClick={() => {
        setIsSplashScreen(false);
        speakTTS("말말카페에 오신 것을 환영합니다. 마이크 버튼을 눌러 음성으로 주문해 주세요.");
      }}>
        <h1 className="splash-title">MALMAL CAFE</h1>
        <p className="splash-subtitle">Premium AI Barista</p>
        <div className="touch-to-start">화면을 터치하여 주문을 시작하세요</div>
        <p style={{ position: 'absolute', bottom: '40px', opacity: 0.8, fontSize: '1.3rem', fontWeight: 600, letterSpacing: '1px' }}></p>
      </div>
    );
  }

  return (
    // ⭐️ [추가한 부분] a11y-mode (돋보기 모드) 클래스 오버라이딩 적용
    <div className={`app-container ${isA11yMode ? 'a11y-mode' : ''}`}>
      <nav className="sidebar">
        <div className="logo-area">
          <span style={{ fontSize: '2.5rem', margin: '5px 0' }}>☕</span>
          <div style={{ fontSize: '1.2rem', fontWeight: '900' }}>말말카페</div>
        </div>

        <div className="sidebar-bottom-area">
          {/* ⭐️ [추가한 부분] 돋보기/접근성 모드 토글 버튼 (사이드바 하단으로 이동) */}
          <button onClick={() => setIsA11yMode(!isA11yMode)} className="a11y-sidebar-btn" style={{ background: isA11yMode ? '#222' : '#FFEB3B', color: isA11yMode ? 'white' : '#000' }}>
            {isA11yMode ? '🔍 원래 화면' : '🔍 큰 글씨'}
          </button>

          {lastRecognizedText && (
            <div className="voice-debug-area" style={{ marginTop: 0 }}>
              🎤 인식된 문장<br /><span style={{ color: 'white', fontWeight: 800 }}>"{lastRecognizedText}"</span>
            </div>
          )}
        </div>
      </nav>

      <main className="main-container">
        <nav className="category-bar">
          <div className={`category-item ai-btn ${activeCategory === 'ai_recommend' ? 'active' : ''}`} onClick={() => handleCategoryClick('ai_recommend')}>✨ AI 추천</div>
          <div className={`category-item ${activeCategory === 'set' ? 'active' : ''}`} onClick={() => handleCategoryClick('set')}>세트메뉴</div>
          <div className={`category-item ${activeCategory === 'signature' ? 'active' : ''}`} onClick={() => handleCategoryClick('signature')}>시그니처</div>
          <div className={`category-item ${activeCategory === 'caffeine' ? 'active' : ''}`} onClick={() => handleCategoryClick('caffeine')}>커피</div>
          <div className={`category-item ${activeCategory === 'noncoffee' ? 'active' : ''}`} onClick={() => handleCategoryClick('noncoffee')}>논커피</div>
          <div className={`category-item ${activeCategory === 'ade' ? 'active' : ''}`} onClick={() => handleCategoryClick('ade')}>에이드</div>
          <div className={`category-item ${activeCategory === 'tea' ? 'active' : ''}`} onClick={() => handleCategoryClick('tea')}>차(Tea)</div>
          <div className={`category-item ${activeCategory === 'dessert' ? 'active' : ''}`} onClick={() => handleCategoryClick('dessert')}>디저트</div>
        </nav>

        <div className="menu-area">
          {activeCategory === 'ai_recommend' ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ background: 'var(--mm-white-glass)', backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)', padding: '25px', borderRadius: '20px', marginBottom: '30px', borderLeft: '6px solid #673AB7', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.6)' }}>
                <h2 style={{ margin: '0 0 10px 0', color: '#673AB7' }}>🤖 AI 말말이에게 물어보세요!</h2>
                <p style={{ margin: '0', color: '#555', lineHeight: '1.6', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {isAiThinking ? (
                    <span style={{ fontWeight: 'bold', color: '#D32F2F' }}>🤔 고객님의 취향을 분석하고 있습니다... 잠시만요!</span>
                  ) : (aiMessage)}
                </p>
              </div>
              {aiRecommendations.length > 0 && !isAiThinking && (
                <>
                  <h3 style={{ marginTop: '0', color: 'var(--mm-dark)' }}>추천 메뉴</h3>
                  <div className="menu-grid">
                    {aiRecommendations.map((item) => (
                      <div key={item.id} className="menu-card" onClick={() => item.stock > 0 ? handleMenuClick(item) : showToast("해당 메뉴는 품절되었습니다.")} style={{ borderColor: '#673AB7', opacity: item.stock <= 0 ? 0.5 : 1, position: 'relative' }}>
                        {item.stock <= 0 && <div style={{position:'absolute', top:'10px', right:'10px', background:'#D32F2F', color:'white', padding:'5px 10px', borderRadius:'20px', fontWeight:'bold', fontSize:'0.9rem', zIndex:10, boxShadow:'0 2px 5px rgba(0,0,0,0.2)'}}>Sold Out</div>}
                        {item.img ? (
                          <img src={item.img} alt={item.name} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '10px', marginBottom: '15px' }} />
                        ) : (
                          <div className="menu-img-placeholder">이미지 준비중</div>
                        )}
                        <div className="menu-name">{item.name}</div>
                        <div className="menu-price">{item.price.toLocaleString()}원</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <h2 className="category-title">
                {activeCategory === 'set' ? 'Set Menu' : activeCategory === 'signature' ? 'Signature' : activeCategory === 'caffeine' ? 'Coffee' : activeCategory === 'noncoffee' ? 'Non-Coffee' : activeCategory === 'ade' ? 'Ade & Juice' : activeCategory === 'tea' ? 'Tea' : 'Dessert'}
              </h2>
              <div className="menu-grid">
                {menuData[activeCategory].map((item) => (
                  <div key={item.id} className="menu-card" onClick={() => item.stock > 0 ? handleMenuClick(item) : showToast("해당 메뉴는 품절되었습니다.")} style={{ opacity: item.stock <= 0 ? 0.5 : 1, position: 'relative' }}>
                    {item.stock <= 0 && <div style={{position:'absolute', top:'10px', right:'10px', background:'#D32F2F', color:'white', padding:'5px 10px', borderRadius:'20px', fontWeight:'bold', fontSize:'0.9rem', zIndex:10, boxShadow:'0 2px 5px rgba(0,0,0,0.2)'}}>Sold Out</div>}
                    {item.img ? (
                      <img src={item.img} alt={item.name} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '10px', marginBottom: '15px' }} />
                    ) : (
                      <div className="menu-img-placeholder">이미지 준비중</div>
                    )}
                    <div className="menu-name">{item.name}</div>
                    <div className="menu-price">{item.price.toLocaleString()}원</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="main-bottom-area">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px' }}>
            <span className="total-text">총 결제 금액</span>
            <span className="total-price">{totalAmount.toLocaleString()}원</span>
          </div>
          <button className="pay-btn" onClick={startPaymentFlow}>결제하기</button>
        </div>
      </main>

      <aside
        className={`order-container ${isCartOpen ? 'open' : ''} ${isDraggingCart ? 'dragging' : ''}`}
        style={{ '--cart-height': `${cartHeight}vh` }}
      >
        <div
          className="cart-header"
          onClick={() => {
            if (window.innerWidth <= 1024 && !cartDragRef.current.hasDragged) setIsCartOpen(!isCartOpen);
          }}
          onTouchStart={handleCartDragStart}
          onMouseDown={handleCartDragStart}
          style={{ cursor: window.innerWidth <= 1024 ? 'grab' : 'default', position: 'relative' }}
        >
          <div className="drag-handle-pill"></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <h3 className="cart-title" style={{ margin: 0 }}>내 주문 내역 ({cart.length})</h3>
            <span className="cart-toggle-icon" style={{ display: window.innerWidth <= 1024 ? 'inline-block' : 'none', fontSize: '1.2rem', color: '#888', transform: isCartOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▲</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); startVoiceRecognition(); }} className={`mic-btn ${isListening ? 'listening' : ''}`} title="음성으로 주문하기">🎤</button>
        </div>

        {isListening && <div style={{ textAlign: 'center', color: '#D32F2F', padding: '10px', fontWeight: 'bold', background: '#ffebee' }}>음성을 듣고 있습니다... (최대 15초)</div>}

        <div className="cart-list">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: window.innerWidth <= 768 ? '10px' : '100px' }}>선택된 메뉴가 없습니다.</div>
          ) : (
            cartWithUniqueKey.map((item) => {
              const isSwiping = swipeData.id === item.uniqueKey && swipeData.isDragging;
              const tx = isSwiping && swipeData.currentX < 0 ? Math.max(swipeData.currentX, -100) : 0;
              return (
                /* ⭐️ [추가한 부분] 모바일 스와이프 제스처 삭제 처리를 위한 Wrapper */
                <div key={item.uniqueKey} className="cart-item-wrapper" style={{ background: 'transparent' }}>
                  <div
                    className="swipe-delete-bg"
                    onClick={() => removeItemCompletely(item.uniqueKey)}
                    style={{ cursor: 'pointer', opacity: tx < 0 ? 1 : 0, transition: 'opacity 0.2s' }}
                  >
                    🗑️ 삭제
                  </div>
                  <div
                    className="cart-item"
                    onTouchStart={(e) => handleDragStart(e, item.uniqueKey)}
                    onTouchMove={(e) => handleDragMove(e, item.uniqueKey)}
                    onTouchEnd={(e) => handleDragEnd(e, item.uniqueKey)}
                    onMouseDown={(e) => handleDragStart(e, item.uniqueKey)}
                    onMouseMove={(e) => handleDragMove(e, item.uniqueKey)}
                    onMouseUp={(e) => handleDragEnd(e, item.uniqueKey)}
                    onMouseLeave={(e) => handleDragEnd(e, item.uniqueKey)}
                    style={{
                      transform: `translateX(${tx}px)`,
                      transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      margin: 0,
                      cursor: isSwiping ? 'grabbing' : 'grab',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div className="cart-item-name">{item.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#888' }}>
                        {[item.options.temp, item.options.ice, item.options.sweetness, item.options.pearl, item.options.shot].filter(o => o && o !== "없음").join(', ')}
                      </div>
                      <div className="cart-item-price">{(item.price * item.count).toLocaleString()}원</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="cart-controls">
                        <button onClick={() => changeCount(item.uniqueKey, -1)}>-</button>
                        <span>{item.count}</span>
                        <button onClick={() => changeCount(item.uniqueKey, 1)}>+</button>
                      </div>
                      <button className="delete-btn" onClick={() => removeItemCompletely(item.uniqueKey)} onTouchEnd={(e) => { e.stopPropagation(); removeItemCompletely(item.uniqueKey); }}>✖</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mobile-pay-area">
          <div>
            <div style={{ fontSize: '1.1rem', color: '#666', fontWeight: 'bold' }}>총 결제 금액</div>
            <div style={{ fontSize: '1.7rem', fontWeight: '900', color: 'var(--mm-dark)', fontFamily: 'var(--font-numeric)' }}>{totalAmount.toLocaleString()}원</div>
          </div>
          <button className="pay-btn" onClick={startPaymentFlow}>결제</button>
        </div>
      </aside>

      {/* 내부로 병합된 상세 옵션 모달 */}
      {activeModal === 'DETAIL' && renderItemDetailModal()}

      {activeModal === 'PAYMENT' && (
        <div className="modal">
          <div className="receipt" style={{ width: '450px' }}>
            <h2>결제 및 수령 방식</h2>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', marginTop: '20px' }}>
              <button
                className={`option-item ${orderType === '매장' ? 'active' : ''}`}
                style={{ flex: 1, padding: '15px', fontSize: '1.2rem', textAlign: 'center', margin: 0 }}
                onClick={() => setOrderType('매장')}
              >🏬 매장</button>
              <button
                className={`option-item ${orderType === '포장' ? 'active' : ''}`}
                style={{ flex: 1, padding: '15px', fontSize: '1.2rem', textAlign: 'center', margin: 0 }}
                onClick={() => setOrderType('포장')}
              >🛍️ 포장</button>
            </div>

            <p style={{ textAlign: 'center', margin: '15px 0', color: '#888' }}>방식을 터치하시거나 말씀해 주세요.<br />(예: "포장하고 카드로 결제할게")</p>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
              <button onClick={startVoiceRecognition} className={`mic-btn ${isListening ? 'listening' : ''}`} title="현금 또는 카드라고 말씀해주세요">🎤</button>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
              <button className="pay-btn" style={{ flex: 1, padding: '15px', borderRadius: '10px', background: '#3F51B5' }} onClick={() => handlePaymentSelection("CASH")}>현금 결제</button>
              <button className="pay-btn" style={{ flex: 1, padding: '15px', borderRadius: '10px' }} onClick={() => handlePaymentSelection("CARD")}>신용카드</button>
            </div>
            <button className="close-btn" style={{ margin: '20px 0 0 0', fontSize: '1.1rem' }} onClick={() => setActiveModal('MAIN')}>닫기</button>
          </div>
        </div>
      )}

      {activeModal === 'PROCESSING' && (
        <div className="modal">
          <div className="receipt" style={{ width: '300px', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem', marginBottom: '15px', display: 'block' }}>⏳</span>
            <h2>결제 진행 중</h2>
            <p style={{ margin: '15px 0', fontSize: '1.1rem' }}>{lastProcessingPaymentMethod} 결제를 처리하고 있습니다.</p>
            <p style={{ color: '#999', fontSize: '0.9rem' }}>잠시만 기다려 주세요 (5초)</p>
          </div>
        </div>
      )}

      {activeModal === 'RECEIPT' && (
        <div className="modal">
          <div className="receipt">
            <h2>RECEIPT</h2>
            <p style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--mm-primary)', fontSize: '1.2rem', margin: '5px 0' }}>[{orderType}]</p>
            <div style={{ margin: '15px 0', borderBottom: '2px dashed #ccc' }}></div>
            <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '15px' }}>매장명: 말말카페 (MalMal Cafe)</p>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>일시: {receiptTime}</p>
            <div className="receipt-list">
              {cartWithUniqueKey.map((item) => (
                <div key={item.uniqueKey} style={{ fontSize: '0.85rem', margin: '8px 0', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                  <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0', fontWeight: 'bold' }}>
                    <span>{item.name} <span style={{ color: '#888' }}>x{item.count}</span></span>
                    <span>{(item.price * item.count).toLocaleString()}</span>
                  </p>
                  <p style={{ color: '#888', margin: '3px 0 0 0', fontSize: '0.75rem' }}>
                    {[item.options.temp, item.options.ice, item.options.sweetness, item.options.pearl, item.options.shot].filter(o => o && o !== "없음").join(', ')}
                  </p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '1.4rem', color: 'var(--mm-dark)' }}>
              <span>TOTAL</span>
              <span>{totalAmount.toLocaleString()}원</span>
            </div>
            <p style={{ textAlign: 'center', marginTop: '30px', fontWeight: 'bold', color: 'var(--mm-primary)' }}>이용해 주셔서 감사합니다.</p>
            <button className="close-btn" onClick={closeReceipt}>확인 (처음으로)</button>
          </div>
        </div>
      )}

      {/* [추가한 부분] 화려한 AI 음성 인식 시각화 (Global Overlay) */}
      {isListening && (
        <div className="voice-visualizer-overlay">
          <div className="visualizer-container">
            <div className="orb"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
          </div>
          <div className="listening-text">말말이가 듣고 있습니다...</div>
        </div>
      )}
      {/* [추가한 부분] 커스텀 토스트 메시지 UI */}
      {toastMessage && (
        <div className="toast-message">
          {toastMessage.split('\n').map((line, idx) => <div key={idx}>{line}</div>)}
        </div>
      )}
    </div>
  );
}

export default App;