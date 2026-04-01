# Bean Lab Mini React

React의 핵심 아이디어 일부를 바닐라 JavaScript로 직접 구현한 학습용 프로젝트입니다.  
강낭콩 키우기 화면을 통해 `Component`, `State`, `Hooks`, `Virtual DOM`, `Diff`, `Patch` 흐름이 실제로 어떻게 연결되는지 보여주는 것이 목표입니다.

## 1. 이 프로젝트가 하는 일

이 프로젝트는 크게 두 층으로 나뉩니다.

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

즉, 이 프로젝트는 "강낭콩 게임"이 목적이 아니라,  
강낭콩 UI를 이용해서 React의 핵심 원리를 설명하는 것이 목적입니다.

## 2. 폴더/파일 역할

- [index.html](C:/jungle_week5/index.html)
  - 전체 화면 레이아웃과 CSS를 담당합니다.
- [app.js](C:/jungle_week5/app.js)
  - Mini React 런타임의 핵심입니다.
  - `FunctionComponent`, hooks, 루트 `App`이 들어 있습니다.
- [vdom.js](C:/jungle_week5/vdom.js)
  - `h()` 함수와 VDOM -> 실제 DOM 변환 로직이 들어 있습니다.
- [diff.js](C:/jungle_week5/diff.js)
  - 이전 VDOM과 새 VDOM을 비교해 patch 목록을 만들고 적용합니다.
- [game.js](C:/jungle_week5/game.js)
  - 강낭콩 상태 계산 함수와 props-only 자식 컴포넌트들이 들어 있습니다.
- [AI_CONVENTION.md](C:/jungle_week5/AI_CONVENTION.md)
  - 구현 시 지켜야 할 규약 문서입니다.

## 3. 핵심 개념

### 3-1. FunctionComponent

`FunctionComponent`는 루트 함수형 컴포넌트를 감싸는 작은 런타임 객체입니다.

이 클래스가 하는 일:

- `hooks` 배열 보관
- 현재 몇 번째 훅을 쓰는지 추적
- 첫 렌더 수행
- 상태 변경 후 재렌더 수행
- effect를 patch 이후에 실행

쉽게 말하면:

- 함수형 컴포넌트는 매번 다시 실행되지만
- `FunctionComponent`가 바깥에서 상태와 훅 정보를 계속 들고 있기 때문에
- 상태를 잃지 않고 다시 렌더할 수 있습니다

### 3-2. hooks 배열

훅은 함수 안에 저장되지 않습니다.  
대신 `FunctionComponent.hooks` 배열에 순서대로 저장됩니다.

예를 들어 루트 `App` 안에서 훅을 이렇게 호출하면:

```js
const [beanState, setBeanState] = useState(...)
const stageInfo = useMemo(...)
const healthSummary = useMemo(...)
const actionHandlers = useMemo(...)
useEffect(...)
```

내부적으로는 대략 이런 식이 됩니다.

```text
hook[0] = state
hook[1] = memo(stageInfo)
hook[2] = memo(healthSummary)
hook[3] = memo(actionHandlers)
hook[4] = effect
```

중요한 점은 "훅 호출 순서"입니다.  
렌더가 다시 일어나도 같은 순서로 훅을 호출하면 같은 슬롯을 재사용할 수 있습니다.

### 3-3. useState

`useState`는 상태값과 `setState`를 hooks 배열에 저장합니다.

처음 렌더:

- 초기값을 hooks 배열에 저장

다음 렌더:

- 같은 index의 값을 다시 읽음

`setState`가 하는 일:

1. 새 상태값 계산
2. 기존 값과 다르면 저장
3. `scheduleUpdate()` 호출
4. 루트 컴포넌트 재렌더 예약

즉 `setState`는 단순히 값만 바꾸는 함수가 아니라,  
화면 갱신까지 이어지게 만드는 함수입니다.

### 3-4. useMemo

`useMemo`는 계산 결과를 저장해 두고, `deps`가 바뀌지 않으면 이전 값을 재사용합니다.

이 프로젝트에서 `useMemo`는:

- 성장 단계 계산
- 건강 상태 계산
- 액션 핸들러 묶음 재사용

에 사용됩니다.

즉 `useMemo`는 "다시 계산할 필요가 없으면 이전 결과를 그대로 쓰자"는 훅입니다.

### 3-5. useEffect

`useEffect`는 render 중 바로 실행되지 않습니다.  
이 프로젝트에서는 patch가 끝난 뒤 `flushEffects()`에서 실행됩니다.

왜 이렇게 하냐면:

- render는 화면을 계산하는 단계
- patch는 실제 DOM 반영 단계
- effect는 부가 작업 단계

이 셋을 분리해야 React와 비슷한 구조가 됩니다.

이 프로젝트에서 effect는 문서 제목을 갱신하는 데 사용됩니다.

```js
useEffect(function () {
  document.title = ...
}, [beanState.day, stageInfo.name]);
```

즉 날짜나 단계 이름이 바뀔 때만 effect가 다시 실행됩니다.

### 3-6. deps란 무엇인가

`deps`는 "이 값들이 바뀌면 다시 실행하라"는 기준값 목록입니다.

예:

```js
[beanState.day, stageInfo.name]
```

이전 렌더의 deps와 현재 렌더의 deps를 비교해서:

- 하나라도 다르면 effect/memo 다시 실행
- 모두 같으면 재사용

즉 deps는 "재실행 조건표"라고 생각하면 됩니다.

## 4. 렌더링 흐름

버튼을 눌렀을 때 흐름은 아래와 같습니다.

```text
사용자 클릭
-> ActionButton onClick 실행
-> setState 호출
-> 루트 App 재실행
-> 새 VDOM 생성
-> 이전 VDOM과 diff 비교
-> patch 적용
-> patch 이후 useEffect 실행
```

이 구조 덕분에 화면 전체를 무조건 다시 만드는 것이 아니라,  
diff 결과에 따라 필요한 변경만 DOM에 반영할 수 있습니다.

## 5. 상태 구조

루트 state 하나에 강낭콩 서비스 전체 상태가 들어 있습니다.

예:

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

- 자식 컴포넌트는 state를 가지지 않습니다
- 루트 `App`만 state를 가집니다
- 자식은 props만 받아서 렌더합니다

이것이 과제에서 요구한 `Lifting State Up` 구조입니다.

## 6. 자식 컴포넌트

현재 자식 컴포넌트는 모두 props-only 순수 함수입니다.

- `ActionButton`
- `Meter`
- `ServicePanel`
- `RuntimePanel`
- `WhiteBoxPanel`

이 함수들은:

- `useState`를 쓰지 않고
- `useEffect`를 쓰지 않고
- 전달받은 props만 사용해서
- VDOM을 반환합니다

즉 과제 요구사항의 "자식은 Stateless + props-only" 조건을 만족합니다.

## 7. 강낭콩 성장 규칙

강낭콩은 아무 행동에서나 자라지 않습니다.

- `물 주기`
  - 수분 증가
- `햇빛 쬐기`
  - 햇빛 증가
- `영양 공급`
  - 영양 증가
- `하루 보내기`
  - 날짜 증가
  - 수분/햇빛/영양 소모
  - 조건에 따라 성장도 증가

즉 실제 성장은 `하루 보내기`에서만 일어납니다.  
물/햇빛/영양은 성장의 조건을 준비하는 역할입니다.

## 8. 화이트박스 테스트

화이트박스 테스트 패널은 "완전 자동 테스트 프레임워크"는 아닙니다.  
대신 현재 런타임이 과제 핵심 조건을 만족하는지 설명형으로 보여주는 검증 패널입니다.

확인하는 항목 예시:

- 루트 state 관리
- Hook 순서 유지
- setState 이후 자동 업데이트
- 부분 업데이트 지향
- useMemo 활용
- useEffect 활용

즉 발표 시 "우리는 UI만 만든 것이 아니라 내부 구조도 확인했다"는 근거로 활용할 수 있습니다.

## 9. 실제 React와 차이

이 프로젝트는 React 전체를 구현한 것이 아닙니다.

차이점:

- Fiber 없음
- 비동기 우선순위 스케줄링 없음
- 정교한 reconciliation 최적화 없음
- key 기반 고급 리스트 diff 없음
- 훨씬 단순한 hooks 시스템

하지만 핵심 아이디어는 담고 있습니다.

- 함수형 컴포넌트
- 루트 상태 관리
- hooks 배열 기반 상태 유지
- Virtual DOM
- Diff / Patch
- patch 이후 effect 실행

## 10. 발표 때 설명하면 좋은 포인트

1. 모든 state는 루트 `App`에만 있다.
2. 자식 컴포넌트는 props-only 순수 함수다.
3. `setState`는 값만 바꾸지 않고 update를 예약한다.
4. hooks 배열과 hookIndex로 상태를 유지한다.
5. 새 VDOM을 만들고 diff/patch로 필요한 부분만 반영한다.
6. `useEffect`는 render 중이 아니라 patch 이후에 실행된다.

## 11. 한 줄 요약

이 프로젝트는  
"강낭콩 키우기 UI를 통해 Mini React 런타임의 핵심 원리를 직접 보여주는 프로젝트"입니다.
