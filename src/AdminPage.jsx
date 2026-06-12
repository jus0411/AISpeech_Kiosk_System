import React, { useState, useEffect } from 'react';
import './App.css';

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('isAdminAuth') === 'true';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ sales: 345000, orders: 42 });
  const [searchTerm, setSearchTerm] = useState('');
  
  // 신규 모달 및 데이터 상태
  const [activeModal, setActiveModal] = useState(null); // 'ORDER_LIST' or 'RECEIPT'
  const [todayOrders, setTodayOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    let interval;
    if (isAuthenticated) {
      fetchMenus();
      fetchStats();
      interval = setInterval(() => {
        fetchMenus();
        fetchStats();
      }, 3000); // 3초마다 갱신 (실시간 반영)
    }
    // 관리자 페이지는 스크롤이 필요하므로 키오스크의 기본 hidden 설정을 해제
    document.body.style.overflow = 'auto';
    return () => {
      if (interval) clearInterval(interval);
      document.body.style.overflow = 'hidden';
    };
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://malmal-coffee.duckdns.org';
    fetch(`${API_BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsAuthenticated(true);
          sessionStorage.setItem('isAdminAuth', 'true');
          setLoginError('');
        } else {
          setLoginError(data.message || '로그인에 실패했습니다.');
        }
      })
      .catch(err => {
        setLoginError('서버와 연결할 수 없습니다.');
      });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('isAdminAuth');
  };

  const fetchMenus = () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://malmal-coffee.duckdns.org';
    fetch(`${API_BASE_URL}/api/admin/menus`)
      .then(res => {
        if (!res.ok) throw new Error('서버 응답 오류 (502 Bad Gateway 등)');
        return res.json();
      })
      .then(data => {
        // 세트 메뉴 재고 동적 계산
        data.forEach(menu => {
          if (menu.componentNames) {
            const compNames = menu.componentNames.split(',');
            const compStocks = compNames.map(cName => {
              const comp = data.find(m => m.name === cName.trim());
              return comp ? comp.stock : 0;
            });
            if (compStocks.length > 0) {
              menu.stock = Math.min(...compStocks);
            }
          }
        });
        setMenus(data);
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        console.error("메뉴 불러오기 실패:", err);
        setError("서버와 연결할 수 없습니다. (서버가 아직 재부팅 중일 수 있습니다. 10초 뒤 새로고침 해주세요!)");
        setLoading(false);
      });
  };

  const fetchStats = () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://malmal-coffee.duckdns.org';
    fetch(`${API_BASE_URL}/api/admin/stats`)
      .then(res => {
        if (!res.ok) throw new Error('통계 불러오기 실패');
        return res.json();
      })
      .then(data => {
        setStats(data);
      })
      .catch(err => {
        console.error("통계 불러오기 실패:", err);
      });
  };

  const fetchTodayOrders = () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://malmal-coffee.duckdns.org';
    fetch(`${API_BASE_URL}/api/admin/orders/today`)
      .then(res => res.json())
      .then(data => {
        setTodayOrders(data);
      })
      .catch(err => console.error("오늘 주문 목록 불러오기 실패:", err));
  };

  const updateStock = (id, currentStock, delta) => {
    const newStock = Math.max(0, parseInt(currentStock, 10) + delta);
    if (newStock === parseInt(currentStock, 10)) return;

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://malmal-coffee.duckdns.org';
    fetch(`${API_BASE_URL}/api/admin/menus/${id}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: newStock })
    })
      .then(res => {
        if (!res.ok) throw new Error('재고 업데이트 실패');
        return res.json();
      })
      .then(updatedMenu => {
        setMenus(prev => prev.map(m => m.id === id ? updatedMenu : m));
      })
      .catch(err => alert(err.message));
  };

  const handleDirectStockChange = (id, newStockStr) => {
    // 사용자가 입력하는 동안에는 화면(상태)만 먼저 업데이트
    setMenus(prev => prev.map(m => m.id === id ? { ...m, stock: newStockStr } : m));
  };

  const updateStockDirectly = (id, newStockStr) => {
    // 입력창에서 포커스가 벗어날 때(onBlur) 실제 DB 업데이트 요청
    let parsedStock = parseInt(newStockStr, 10);
    if (isNaN(parsedStock) || parsedStock < 0) parsedStock = 0;

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://malmal-coffee.duckdns.org';
    fetch(`${API_BASE_URL}/api/admin/menus/${id}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: parsedStock })
    })
      .then(res => {
        if (!res.ok) throw new Error('재고 업데이트 실패');
        return res.json();
      })
      .then(updatedMenu => {
        setMenus(prev => prev.map(m => m.id === id ? updatedMenu : m));
      })
      .catch(err => alert(err.message));
  };



  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5', fontFamily: 'Pretendard Variable' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '350px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>☕ 관리자 로그인</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#666', fontSize: '0.9rem' }}>아이디</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '5px' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#666', fontSize: '0.9rem' }}>비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '5px' }}
                required
              />
            </div>
            {loginError && <div style={{ color: '#D32F2F', fontSize: '0.85rem', textAlign: 'center' }}>{loginError}</div>}
            <button type="submit" style={{ marginTop: '10px', padding: '12px', background: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>로그인</button>
            <button type="button" onClick={() => window.location.href = '/'} style={{ padding: '12px', background: '#e0e0e0', color: '#333', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>돌아가기</button>
          </form>
        </div>
      </div>
    );
  }

  const lowStockMenus = menus.filter(m => parseInt(m.stock, 10) <= 5);
  const filteredMenus = menus.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1 style={{ margin: 0, color: '#333' }}>☕ 말말카페 관리자 대시보드</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.location.href = '/'} style={{ padding: '10px 20px', background: '#666', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>키오스크 화면</button>
          <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>로그아웃</button>
        </div>
      </header>

      <div className="admin-stats-grid">
        <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>오늘 매출 (추정치)</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#D32F2F' }}>{stats.sales.toLocaleString()}원</div>
        </div>
        <div 
          style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer' }}
          onClick={() => { fetchTodayOrders(); setActiveModal('ORDER_LIST'); }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>오늘 주문 건수 <span style={{fontSize:'0.8rem', color:'#888', fontWeight:'normal'}}>(클릭하여 목록 보기)</span></h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1976D2' }}>{stats.orders}건</div>
        </div>
        <div 
          style={{ background: '#FFF3E0', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer' }}
          onClick={() => setActiveModal('LOW_STOCK_LIST')}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#E65100' }}>⚠️ 품절 임박 메뉴 <span style={{fontSize:'0.8rem', color:'#888', fontWeight:'normal'}}>(클릭하여 목록 보기)</span></h3>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#E65100' }}>
            {lowStockMenus.length}개
          </div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div className="admin-panel-header">
          <h2 style={{ margin: 0, color: '#333' }}>📦 메뉴 및 재고 관리</h2>
          <input
            type="text"
            placeholder="🔍 메뉴명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '10px 15px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '8px', width: '250px' }}
          />
        </div>
        {loading ? <p>로딩 중...</p> : error ? (
          <div style={{ padding: '30px', background: '#ffebee', color: '#D32F2F', borderRadius: '10px', textAlign: 'center', fontWeight: 'bold' }}>
            {error}
          </div>
        ) : (
          <div className="admin-table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '15px', color: '#495057' }}>ID</th>
                <th style={{ padding: '15px', color: '#495057' }}>메뉴명</th>
                <th style={{ padding: '15px', color: '#495057' }}>카테고리</th>
                <th style={{ padding: '15px', color: '#495057' }}>가격</th>
                <th style={{ padding: '15px', color: '#495057', textAlign: 'center' }}>현재 재고</th>
              </tr>
            </thead>
            <tbody>
              {filteredMenus.length > 0 ? filteredMenus.map(menu => (
                <tr key={menu.id} style={{ borderBottom: '1px solid #eee', background: parseInt(menu.stock, 10) <= 0 ? '#ffebee' : 'white' }}>
                  <td style={{ padding: '15px', color: '#666' }}>{menu.id}</td>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#333' }}>
                    {menu.name} {parseInt(menu.stock, 10) <= 0 && <span style={{ background: '#D32F2F', color: 'white', padding: '2px 6px', borderRadius: '5px', fontSize: '0.8rem', marginLeft: '5px' }}>품절</span>}
                  </td>
                  <td style={{ padding: '15px', color: '#666' }}>{menu.category}</td>
                  <td style={{ padding: '15px', color: '#666' }}>{menu.price.toLocaleString()}원</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {menu.category === 'set' ? (
                      <div style={{ color: '#888', fontSize: '0.9rem', fontWeight: 'bold' }}>
                        <div>{menu.stock}</div>
                        <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>(단품 연동 수정불가)</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                        <button onClick={() => updateStock(menu.id, menu.stock, -1)} style={{ width: '35px', height: '35px', borderRadius: '5px', border: '1px solid #ccc', background: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>-</button>
                        <input
                          type="number"
                          value={menu.stock}
                          onChange={(e) => handleDirectStockChange(menu.id, e.target.value)}
                          onBlur={(e) => updateStockDirectly(menu.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
                          style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '60px', textAlign: 'center', padding: '5px', border: '1px solid #ccc', borderRadius: '5px' }}
                        />
                        <button onClick={() => updateStock(menu.id, menu.stock, 1)} style={{ width: '35px', height: '35px', borderRadius: '5px', border: '1px solid #ccc', background: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>+</button>
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="admin-empty-msg">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* 품절 임박 메뉴 목록 모달 */}
      {activeModal === 'LOW_STOCK_LIST' && (
        <div className="modal" onClick={() => setActiveModal(null)} style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#E65100' }}>⚠️ 품절 임박 메뉴</h2>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
            </div>
            {lowStockMenus.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666' }}>품절 임박 메뉴가 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lowStockMenus.map(menu => (
                  <div 
                    key={menu.id} 
                    style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#333' }}>{menu.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#888' }}>{menu.category}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', color: parseInt(menu.stock, 10) === 0 ? '#D32F2F' : '#E65100' }}>
                      잔여: {menu.stock}개
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 오늘 주문 목록 모달 */}
      {activeModal === 'ORDER_LIST' && (
        <div className="modal" onClick={() => setActiveModal(null)} style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>오늘 주문 내역</h2>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
            </div>
            {todayOrders.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666' }}>오늘 발생한 주문이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {todayOrders.map(order => (
                  <div 
                    key={order.id} 
                    style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => { setSelectedOrder(order); setActiveModal('RECEIPT'); }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#333' }}>주문 번호 #{order.id}</div>
                      <div style={{ fontSize: '0.85rem', color: '#888' }}>{new Date(order.createdAt).toLocaleTimeString()}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', color: 'var(--mm-primary)' }}>{order.totalAmount.toLocaleString()}원</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 영수증 상세 모달 */}
      {activeModal === 'RECEIPT' && selectedOrder && (
        <div className="modal" style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="receipt" style={{ background: 'white', padding: '30px', borderRadius: '0', width: '350px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', position: 'relative' }}>
            <h2 style={{ textAlign: 'center', margin: '0 0 10px 0', borderBottom: '2px dashed #ccc', paddingBottom: '10px', fontFamily: 'monospace', fontSize: '2rem' }}>RECEIPT</h2>
            <p style={{ textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: '1.2rem', margin: '5px 0' }}>[주문상세내역]</p>
            <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '15px' }}>매장명: 말말카페 (MalMal Cafe)</p>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>주문번호: #{selectedOrder.id}</p>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>일시: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
            
            <div className="receipt-list" style={{ marginTop: '20px', minHeight: '150px' }}>
              {selectedOrder.cartItemsJson ? JSON.parse(selectedOrder.cartItemsJson).map((item, idx) => (
                <div key={idx} style={{ fontSize: '0.85rem', margin: '8px 0', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                  <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0', fontWeight: 'bold', color: '#333' }}>
                    <span>{item.name} <span style={{ color: '#888' }}>x{item.count}</span></span>
                    <span>{(item.price * item.count).toLocaleString()}</span>
                  </p>
                  <p style={{ color: '#888', margin: '3px 0 0 0', fontSize: '0.75rem' }}>
                    {[item.options?.temp, item.options?.ice, item.options?.sweetness, item.options?.pearl, item.options?.shot].filter(o => o && o !== "없음").join(', ')}
                  </p>
                </div>
              )) : (
                <p style={{textAlign: 'center', color: '#999'}}>상세 메뉴 내역이 없는 주문입니다.</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '1.4rem', color: '#333', borderTop: '2px solid #333', paddingTop: '10px', marginTop: '10px' }}>
              <span>TOTAL</span>
              <span>{selectedOrder.totalAmount.toLocaleString()}원</span>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <button 
                onClick={() => setActiveModal('ORDER_LIST')} 
                style={{ flex: 1, padding: '15px', background: '#e0e0e0', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
              >목록으로</button>
              <button 
                onClick={() => setActiveModal(null)} 
                style={{ flex: 1, padding: '15px', background: '#333', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
              >닫기</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminPage;
