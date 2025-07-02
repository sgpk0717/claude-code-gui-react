export const SOCKET_PORT = 7002;
export const API_PORT = 7001;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// 레이아웃 템플릿 상수
export const LAYOUT_TEMPLATES = {
  // 1개 인스턴스
  SINGLE: {
    id: 'single',
    name: '단일',
    description: '화면 전체를 사용하는 단일 창',
    maxSessions: 1,
    positions: [
      { position: { x: 0, y: 0 }, size: { width: 100, height: 90 } }
    ]
  },
  
  // 2개 인스턴스
  VERTICAL_SPLIT: {
    id: 'vertical-split',
    name: '좌우 분할',
    description: '화면을 좌우로 2분할',
    maxSessions: 2,
    positions: [
      { position: { x: 0, y: 0 }, size: { width: 50, height: 90 } },
      { position: { x: 50, y: 0 }, size: { width: 50, height: 90 } }
    ]
  },
  
  HORIZONTAL_SPLIT: {
    id: 'horizontal-split',
    name: '위아래 분할',
    description: '화면을 위아래로 2분할',
    maxSessions: 2,
    positions: [
      { position: { x: 0, y: 0 }, size: { width: 100, height: 45 } },
      { position: { x: 0, y: 45 }, size: { width: 100, height: 45 } }
    ]
  },
  
  // 3개 인스턴스
  THREE_COLUMN: {
    id: 'three-column',
    name: '3분할',
    description: '화면을 3개 열로 분할',
    maxSessions: 3,
    positions: [
      { position: { x: 0, y: 0 }, size: { width: 33.33, height: 90 } },
      { position: { x: 33.33, y: 0 }, size: { width: 33.33, height: 90 } },
      { position: { x: 66.66, y: 0 }, size: { width: 33.33, height: 90 } }
    ]
  },
  
  L_SHAPED: {
    id: 'l-shaped',
    name: 'L자형',
    description: '1개 큰 창 + 2개 작은 창',
    maxSessions: 3,
    positions: [
      { position: { x: 0, y: 0 }, size: { width: 70, height: 90 } },
      { position: { x: 70, y: 0 }, size: { width: 30, height: 45 } },
      { position: { x: 70, y: 45 }, size: { width: 30, height: 45 } }
    ]
  },
  
  // 4개 인스턴스
  FOUR_GRID: {
    id: 'four-grid',
    name: '4분할 격자',
    description: '화면을 2x2 격자로 분할',
    maxSessions: 4,
    positions: [
      { position: { x: 0, y: 0 }, size: { width: 50, height: 45 } },
      { position: { x: 50, y: 0 }, size: { width: 50, height: 45 } },
      { position: { x: 0, y: 45 }, size: { width: 50, height: 45 } },
      { position: { x: 50, y: 45 }, size: { width: 50, height: 45 } }
    ]
  }
};

// 기본 창 설정
export const DEFAULT_WINDOW_SIZE = { width: 50, height: 60 }; // 화면의 50% 너비, 60% 높이
export const DEFAULT_WINDOW_POSITION = { x: 10, y: 10 }; // 화면 왼쪽에서 10%, 위에서 10%
export const MIN_WINDOW_SIZE = { width: 400, height: 300 };
export const MENU_BAR_HEIGHT = 60;