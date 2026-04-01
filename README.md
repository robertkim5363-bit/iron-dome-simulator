# Bean Lab Mini React

강낭콩 키우기 화면을 이용해 React의 핵심 아이디어를 바닐라 JavaScript로 직접 구현한 Mini React 프로젝트입니다.

이 프로젝트의 목적은 단순히 "게임 UI"를 만드는 것이 아니라, 아래 개념이 실제로 어떻게 연결되는지 눈으로 확인하고 설명할 수 있게 만드는 것입니다.

- Component
- State
- Hooks
- Virtual DOM
- Diff
- Patch
- render 이후 effect 실행

## 1. 이 프로젝트가 보여주려는 것

이 프로젝트는 두 층으로 나뉩니다.

1. Mini React 런타임
   - `FunctionComponent`
   - `useState`
   - `useMemo`
   - `useEffect`
   - `Virtual DOM -> Diff -> Patch`

2. 강낭콩 서비스 화면
   - 물 주기
   - 햇빛 쬐기
   - 영양 공급
   - 하루 보내기
   - 수확하기
   - 테스트하기

즉 "강낭콩"은 React 원리를 설명하기 위한 주제일 뿐이고,
진짜 핵심은 작은 React 스타일 런타임을 직접 구현해 보는 데 있습니다.

## 2. 파일별 역할

- [index.html](C:/jungle_week5/index.html)
  - 전체 레이아웃과 CSS
  - 런타임 디버그 / 서비스 화면 / 화이트박스 테스트 배치

- [app.js](C:/jungle_week5/app.js)
  - Mini React 런타임의 핵심
  - `FunctionComponent`
  - `useState`, `useMemo`, `useEffect`
  - 루트 컴포넌트 `App`

- [vdom.js](C:/jungle_week5/vdom.js)
  - `h()` 함수
  - VNode 생성
  - VNode -> 실제 DOM 변환
  - props / event 반영

- [diff.js](C:/jungle_week5/diff.js)
  - 이전 VDOM과 새 VDOM 비교
  - patch 목록 생성
  - 실제 DOM patch 적용

- [game.js](C:/jungle_week5/game.js)
  - 강낭콩 상태 계산 로직
  - 성장 단계 계산
  - 건강 상태 계산
  - props-only 자식 컴포넌트

- [AI_CONVENTION.md](C:/jungle_week5/AI_CONVENTION.md)
  - 구현 규약 문서

## 3. 핵심 개념 설명

### 3-1. FunctionComponent란 무엇인가

`FunctionComponent`는 루트 함수형 컴포넌트를 감싸는 작은 실행기입니다.

왜 필요한가?

- 함수형 컴포넌트는 렌더할 때마다 다시 실행됩니다.
- 그런데 상태는 이전 값을 기억해야 합니다.
- 따라서 상태와 훅 정보를 함수 바깥에 저장하는 객체가 필요합니다.

이 프로젝트에서 그 객체가 바로 `FunctionComponent`입니다.

이 클래스가 맡는 일:

- `hooks` 배열 관리
- `hookIndex` 관리
- 최초 렌더(`mount`)
- 상태 변경 후 재렌더(`update`)
- `useEffect` 예약 및 patch 이후 실행
- 디버그 정보 수집

즉 App 함수는 "다음 화면을 계산"하고,
FunctionComponent는 "그 계산을 실행하고 유지하는 런타임"입니다.

### 3-2. hooks 배열과 hookIndex

hooks는 함수 안에 저장되지 않습니다.  
`FunctionComponent.hooks` 배열에 저장됩니다.

예를 들어 App 안에서 다음 hook을 호출하면:

```js
const [beanState, setBeanState] = useState(...)
const stageInfo = useMemo(...)
const healthSummary = useMemo(...)
const actionHandlers = useMemo(...)
useEffect(...)
```

내부적으로는 대략 이렇게 됩니다.

```text
hook[0] = state
hook[1] = memo(stageInfo)
hook[2] = memo(healthSummary)
hook[3] = memo(actionHandlers)
hook[4] = effect
```

왜 상태가 유지될까?

- App 함수는 다시 실행되지만
- hooks 배열은 FunctionComponent 객체에 남아 있습니다
- 다음 렌더에서도 같은 순서로 hook을 호출하면
- 같은 index의 값을 다시 읽게 됩니다

즉 hook의 핵심은 "호출 순서와 저장소 재사용"입니다.

### 3-3. useState

`useState`는 변경 가능한 상태를 저장하는 hook입니다.

입력:

- 초기값 또는 초기값 생성 함수

반환:

- 현재 상태값
- `setState`

`setState`가 하는 일:

1. 다음 상태값 계산
2. 기존 값과 다른지 확인
3. hooks 배열의 state 값 갱신
4. `scheduleUpdate()` 호출

즉 `setState`는 값을 바꾸는 것에서 끝나지 않고,
루트 컴포넌트가 다시 렌더되도록 예약합니다.

### 3-4. scheduleUpdate와 간단한 batching

`scheduleUpdate()`는 `queueMicrotask()`를 이용해 update를 조금 미룹니다.

왜 그렇게 하냐면:

- 같은 이벤트 핸들러 안에서 `setState`가 여러 번 호출될 수 있습니다.
- 그때마다 즉시 렌더하면 불필요하게 여러 번 다시 그리게 됩니다.

그래서 이 프로젝트는:

- 같은 이벤트 루프 안에서 여러 setState가 와도
- update는 한 번만 예약되게 해서
- 매우 단순한 batching 효과를 냅니다.

### 3-5. useMemo

`useMemo`는 파생 계산 결과를 캐시하는 hook입니다.

이 프로젝트에서 `useMemo`는:

- `growth` 값으로 `stageInfo` 계산
- `water/sunlight/nutrition` 값으로 `healthSummary` 계산
- 버튼 핸들러 객체 `actionHandlers` 재사용

에 사용됩니다.

즉 `useMemo`는:

- deps가 같으면 이전 계산 결과를 그대로 쓰고
- deps가 달라질 때만 다시 계산합니다

### 3-6. useEffect

`useEffect`는 부수 효과를 다루는 hook입니다.

중요한 점:

- render 중 바로 실행하지 않음
- patch 이후 실행

왜?

- render는 화면 계산 단계
- patch는 실제 DOM 반영 단계
- effect는 부수 작업 단계

이 세 단계를 분리해야 React 스타일 구조가 됩니다.

이 프로젝트에서 effect는 문서 제목을 갱신합니다.

```js
useEffect(function () {
  document.title = ...
}, [beanState.day, stageInfo.name]);
```

### 3-7. deps란 무엇인가

`deps`는 "이 값들이 바뀌면 다시 실행하라"는 기준값 목록입니다.

예:

```js
[beanState.day, stageInfo.name]
```

의미:

- 이전 렌더의 deps와 현재 렌더의 deps를 비교
- 하나라도 다르면 effect 또는 memo 재실행
- 모두 같으면 이전 값 재사용

즉 deps는 재실행 조건표입니다.

## 4. Virtual DOM / Diff / Patch

### 4-1. VDOM

`h()` 함수는 JSX 대신 VNode를 만듭니다.

예:

```js
h('div', { className: 'box' }, 'hello')
```

결과:

```js
{
  type: 'div',
  props: { className: 'box' },
  children: ['hello']
}
```

즉 VDOM은 "화면을 실제 DOM으로 만들기 전의 설명 객체"입니다.

### 4-2. diff

`diff(oldVNode, newVNode)`는 이전 화면 설명과 새 화면 설명을 비교합니다.

비교 결과:

- create
- remove
- replace
- text
- props

같은 patch 목록을 만듭니다.

### 4-3. patch

`patch()`는 diff가 만든 patch 목록을 실제 DOM에 적용합니다.

즉:

- diff = 무엇을 바꿔야 하는지 결정
- patch = 실제로 바꾸는 단계

## 5. 전체 렌더링 흐름

버튼을 눌렀을 때 일어나는 일:

```text
사용자 클릭
-> ActionButton의 onClick 실행
-> setState 호출
-> scheduleUpdate로 update 예약
-> App 다시 실행
-> 새 VDOM 생성
-> 이전 VDOM과 diff 비교
-> patch로 실제 DOM 반영
-> patch 이후 useEffect 실행
```

즉 상태 변화 -> VDOM 재계산 -> 차이만 반영 -> effect 실행
흐름입니다.

## 6. 상태 구조

루트 state 하나에 강낭콩 서비스 전체 상태가 들어 있습니다.

- `day`
- `water`
- `sunlight`
- `nutrition`
- `growth`
- `harvestCount`
- `healthNote`
- `lastAction`
- `log`
- `lastTestRun`
- `hasRunWhiteBoxTest`

중요한 점:

- 자식 컴포넌트는 state를 가지지 않음
- 루트 App만 state를 가짐
- 자식은 props만 받아 화면을 그림

즉 과제에서 요구한 Lifting State Up 구조를 따릅니다.

## 7. 자식 컴포넌트

현재 자식 컴포넌트:

- `ActionButton`
- `Meter`
- `ServicePanel`
- `RuntimePanel`
- `WhiteBoxPanel`

이 컴포넌트들은:

- hook을 쓰지 않고
- props만 받아서
- VDOM을 반환하는 순수 함수입니다

즉 "Stateless + props-only" 조건을 만족합니다.

## 8. 강낭콩 성장 규칙

강낭콩은 모든 행동에서 성장하지 않습니다.

- 물 주기: 수분 증가
- 햇빛 쬐기: 햇빛 증가
- 영양 공급: 영양 증가
- 하루 보내기: 날짜 증가 + 자원 소모 + 성장도 증가

즉:

- 물/햇빛/영양은 성장 조건을 준비
- 실제 성장 반영은 하루 보내기에서만 수행

## 9. 런타임 디버그 / 화이트박스 테스트

### 9-1. 런타임 디버그

화면에서 확인 가능한 정보:

- 루트 state 스냅샷
- renderCount
- hookCount
- lastEffectCount
- totalEffectCount
- hook 저장소 요약

즉 "지금 내부 런타임이 어떤 상태인지"를 보여주는 패널입니다.

### 9-2. 화이트박스 테스트

화이트박스 테스트는 완전한 자동 테스트 프레임워크는 아닙니다.  
대신 현재 런타임이 과제 핵심 조건을 만족하는지 설명형으로 확인하는 패널입니다.

검증 항목:

- 루트 상태 관리
- Hook 순서 유지
- setState 이후 자동 업데이트
- 부분 업데이트 지향
- useMemo 활용
- useEffect 활용

즉 발표 때 "우리는 UI만 만든 게 아니라 내부 구조도 검증했다"는 근거로 활용할 수 있습니다.

## 10. 실제 React와 차이

이 프로젝트는 React 전체 구현이 아닙니다.

없는 것들:

- Fiber
- 비동기 우선순위 스케줄링
- key 기반 고급 reconciliation
- 정교한 최적화

하지만 핵심 아이디어는 담겨 있습니다.

- 함수형 컴포넌트
- 루트 상태 관리
- hooks 배열 기반 상태 유지
- Virtual DOM
- Diff / Patch
- patch 이후 effect 실행

## 11. 발표 때 강조하면 좋은 포인트

1. 모든 state는 루트 `App`에만 있다.
2. 자식 컴포넌트는 props-only 순수 함수다.
3. hooks는 함수 안이 아니라 FunctionComponent의 hooks 배열에 저장된다.
4. `hookIndex`로 같은 순서의 hook 슬롯을 재사용한다.
5. `setState`는 값 변경뿐 아니라 update 예약까지 담당한다.
6. 새 VDOM을 만들고 diff / patch로 필요한 부분만 반영한다.
7. `useEffect`는 render 중이 아니라 patch 이후에 실행된다.

## 12. 한 줄 요약

Bean Lab Mini React는  
"강낭콩 UI를 통해 Mini React 런타임의 핵심 원리를 직접 구현하고 설명하는 프로젝트"입니다.
