# Iron Dome Defense Simulator

**Virtual DOM & Diff Algorithm** + **Component · State · Hooks** 직접 구현 프로젝트

크래프톤 정글 SW-AI 12기 | Week 3–4 수요 코딩회

---

## 핵심 가치 제안

**미션**
> 위성사진 위에 방공 레이더 영역을 설정하고, 미사일 스웜 공격을 시뮬레이션하여
> 방어 체계의 취약점을 시각적으로 검증하는 시스템을 만든다.

**비전**
> React의 핵심 개념(Component, State, Hooks, Virtual DOM)을
> 외부 프레임워크 없이 Vanilla JS로 직접 구현하여 동작 원리를 완벽히 이해한다.

---

## 실행 방법

빌드 없이 브라우저에서 바로 실행합니다.

```
index.html 을 브라우저에서 열기
```

> `file://` 프로토콜 기준. 외부 의존성 없음 (ESRI 위성 이미지만 인터넷 필요)

---

## 파일 구조

```
iron-dome-simulator/
├── index.html                  ✅ 메인 실행 파일 (Week 4 — Iron Dome Sim v2)
├── index-v1-backup.html        🔒 v1 백업 (기본 드론+레이더)
├── week3-camp-david.html       📁 Week 3 — Camp David Camo Demo
├── week3-norfolk.html          📁 Week 3 — Norfolk 잠수함 Demo
└── README.md
```

---

## Week 4 핵심 구현 — 과제 매핑

### 1. FunctionComponent 클래스

함수형 컴포넌트를 감싸는 `FunctionComponent` 클래스를 직접 구현했습니다.

```javascript
class FunctionComponent {
  constructor(fn, props) {
    this.fn = fn;
    this.hooks = [];    // hooks 배열 (상태 저장용)
    this.hookIndex = 0;
  }
  mount(container) { ... }   // 첫 렌더링
  update() { ... }           // 상태 변경 후 리렌더링 (rAF Batching)
}
```

- `mount()`: VNode 트리 생성 → renderVNode → 실제 DOM 삽입 → Effects 실행
- `update()`: 새 VNode 생성 → diff(old, new) → patch 적용 → Effects 실행
- **Batching**: `requestAnimationFrame`으로 동일 프레임의 여러 setState를 한 번에 처리

### 2. Hooks — useState, useEffect, useMemo

**"함수는 매번 새로 실행되는데, 상태는 어떻게 유지할까?"**

hooks 배열에 인덱스 기반으로 저장합니다.

| Hook | 역할 | 프로젝트 적용 |
|------|------|--------------|
| `useState` | 동적 상태 관리 | 드론 위치, 레이더 존, 미사일 배열, 모드 전환 등 13개 상태 |
| `useEffect` | 생명주기 & 사이드이펙트 | 키보드 리스너, 게임 루프, 충돌 감지, 마우스 드래그 등 7개 이펙트 |
| `useMemo` | 비용 높은 계산 캐싱 | 테스트 결과, 레이더 면적, 취약 그리드, 활성 미사일 수 |

### 3. Component 아키텍처 (Lifting State Up)

모든 State는 루트 `App` 컴포넌트에서만 관리합니다.
자식 컴포넌트는 **Stateless** — props만 받아서 VNode을 반환하는 순수 함수입니다.

```
App (Root — 13개 useState, 7개 useEffect, 4개 useMemo)
├── TopBar(props)        — 상단 네비게이션, 모드 표시
├── SimView(props)       — 위성사진 + 레이더 SVG + 드론 + 미사일 + 취약점
├── TestView(props)      — VDom 테스트 결과 패널
├── InfoPanel(props)     — 우측 정보 패널 (존 용량, breach 수)
├── StatusBar(props)     — 하단 상태바 + 컨트롤 버튼
├── DrawHint(props)      — 그리기 모드 힌트
└── ControlsHelp(props)  — 조작 안내
```

### 4. Virtual DOM + Diff + Patch (Week 3 → 4 연속)

Week 3에서 만든 VDOM 엔진을 그대로 재사용합니다.

- `createVNode` / `renderVNode` — VNode ↔ DOM 변환
- `diff` / `diffProps` / `diffChildren` — 5가지 Diff 케이스
- `applyPatch` / `applyChildPatches` — 최소 DOM 조작
- SVG 네임스페이스 지원 추가 (레이더 폴리곤 렌더링)

---

## 기능

### 방공 레이더 시스템
- 마우스 Lasso로 자유 영역 그리기
- **영역당 100발 요격 가능** — 겹치면 용량 합산 (100+100=200)
- **비례율 제한** — 종횡비 4:1 초과 시 거부 (일직선 방지)
- 잔여 용량 실시간 표시 (초록→주황→빨강)

### 미사일 스웜 공격
- 🎯 Target 모드 → 지도 클릭 → 해당 좌표로 20발 스웜 발사
- 미사일이 레이더 영역 통과 시 요격 (용량 1 차감)
- 요격 실패 시 **breach** — 빨간 펄스 점으로 영구 표시
- 화면 가장자리에서 타겟을 향해 직선 비행

### 키보드 드론 정찰
- 화살표 키(↑↓←→)로 실시간 조종
- 레이더 영역 진입 시 즉시 요격 → Respawn 가능

### 취약 지대 시각화
- 레이더가 커버하지 않는 구역에 **빨간 점** 자동 표시 (60px 그리드)
- 방어 공백을 시각적으로 식별

### VDom 테스트 스위트 (7개)

| 테스트 | 검증 내용 | 결과 |
|--------|----------|------|
| No-op Patch | 변경 없으면 패치 미생성 | `PASS` |
| Text Node Change | 텍스트 변경 감지 | `UPDATE` |
| Attribute Update | props 변경 최소 반영 | `UPDATE` |
| Node Create | 새 요소 추가 | `CREATE` |
| Node Remove | 요소 삭제 | `REMOVE` |
| Element Replace | 태그 교체 | `REPLACE` |
| Undo / Redo | 상태 복원 | `PASS` |

---

## 데모 위치 정보

| 데모 | 위치 | 배경 |
|------|------|------|
| Iron Dome Sim (Week 4) | Israel · Negev Desert | ESRI 위성사진 |
| Camp David (Week 3) | 39.648°N 77.465°W · Maryland | ESRI 위성사진 |
| Norfolk (Week 3) | 36.9397°N 76.3333°W · Virginia | ESRI 위성사진 |

---

## 기술 스택

| 구분 | 내용 |
|------|------|
| Language | Vanilla JavaScript (ES6 class + ES5 혼합) |
| Framework | **없음** — 자체 Mini React 구현 |
| Rendering | 순수 DOM API, SVG, CSS animation |
| 위성 이미지 | ESRI ArcGIS World Imagery MapServer |
| 빌드 도구 | 없음 — 단일 HTML 파일 |
| 외부 의존성 | Google Fonts (UI 폰트) |

---

## 팀원

크래프톤 정글 SW-AI 12기
