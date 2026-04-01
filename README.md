# Bean Lab Mini React

강낭콩 키우기 UI를 통해 React의 핵심 아이디어인 `Component`, `State`, `Hooks`, `Virtual DOM`, `Diff`, `Patch`가 어떻게 이어지는지 보여주는 학습용 Mini React 프로젝트입니다.

## 한 줄 소개

이 프로젝트의 목적은 "강낭콩 게임 만들기"가 아니라, 강낭콩 서비스 화면을 예시로 사용해 **React의 핵심 동작 원리를 바닐라 JavaScript로 직접 구현하고 설명하는 것**입니다.

## 프로젝트 목표

- 함수형 컴포넌트 기반 UI 구조를 직접 구현합니다.
- 상태는 루트 컴포넌트 하나에서만 관리합니다.
- `useState`, `useMemo`, `useEffect`를 최소 단위로 직접 구현합니다.
- Virtual DOM을 만들고 이전 VDOM과 비교한 뒤, 바뀐 부분만 실제 DOM에 반영합니다.
- 사용자의 클릭이 `setState -> rerender -> diff -> patch -> effect`로 이어지는 흐름을 눈으로 확인할 수 있게 만듭니다.

## 데모에서 보여주는 기능

- `물 주기`
- `햇빛 쬐기`
- `영양 공급`
- `하루 보내기`
- `수확하기`
- `테스트하기`

강낭콩은 아무 행동에서나 자라지 않습니다.  
물, 햇빛, 영양은 성장 조건을 준비하고, 실제 성장은 `하루 보내기`를 눌렀을 때만 증가합니다.

## 과제 요구사항 대응

| 과제 요구사항 | Bean Lab 구현 방식 |
| --- | --- |
| 함수형 컴포넌트 사용 | 루트 `App`과 자식 컴포넌트를 모두 함수형으로 구현 |
| `FunctionComponent` 클래스 직접 구현 | `app.js`에서 루트 컴포넌트를 감싸는 런타임 객체 구현 |
| 루트에서만 상태 관리 | `beanState` 하나를 루트 `App`의 `useState`로 관리 |
| 자식 컴포넌트는 props-only | `ActionButton`, `Meter`, `ServicePanel`, `RuntimePanel`, `WhiteBoxPanel`은 state 없이 props만 사용 |
| `useState`, `useMemo`, `useEffect` 구현 | hooks 배열과 `hookIndex` 기반으로 구현 |
| Virtual DOM + Diff + Patch | `vdom.js`에서 VDOM 생성, `diff.js`에서 비교와 DOM patch 수행 |
| 사용자 입력에 따른 화면 변화 | 버튼 클릭으로 상태가 바뀌고 필요한 DOM만 갱신 |

## 폴더 구조

- `index.html`
  화면 레이아웃과 CSS를 담당합니다.
- `app.js`
  Mini React 런타임의 핵심입니다. `FunctionComponent`, hooks, 루트 `App`이 들어 있습니다.
- `vdom.js`
  `h()` 함수와 VDOM을 실제 DOM으로 바꾸는 로직이 들어 있습니다.
- `diff.js`
  이전 VDOM과 새 VDOM을 비교해 patch 목록을 만들고 적용합니다.
- `game.js`
  강낭콩 상태 계산 함수와 props-only 자식 컴포넌트가 들어 있습니다.
- `AI_CONVENTION.md`
  구현 시 지켜야 하는 제약과 규칙을 정리한 문서입니다.

## 핵심 개념

### 1. FunctionComponent

`FunctionComponent`는 루트 함수형 컴포넌트를 감싸는 작은 런타임 객체입니다.

이 클래스가 담당하는 역할:

- hooks 배열 보관
- 현재 몇 번째 hook을 쓰는지 추적
- 최초 렌더링 수행
- 상태 변경 이후 재렌더링 수행
- patch 이후 effect 실행
- 디버그 정보 수집

핵심은 함수형 컴포넌트가 매번 다시 실행되더라도, 바깥의 `FunctionComponent`가 상태와 hook 정보를 계속 보관하기 때문에 상태를 잃지 않는다는 점입니다.

### 2. hooks 배열과 hookIndex

훅은 함수 내부에 저장되지 않습니다.  
대신 `FunctionComponent.hooks` 배열에 순서대로 저장됩니다.

예를 들어 루트 `App`에서 아래와 같이 hook을 호출하면:

```js
const [beanState, setBeanState] = useState(...)
const stageInfo = useMemo(...)
const healthSummary = useMemo(...)
const actionHandlers = useMemo(...)
useEffect(...)
```

내부적으로는 이런 식으로 슬롯이 재사용됩니다.

```text
hook[0] = state
hook[1] = memo(stageInfo)
hook[2] = memo(healthSummary)
hook[3] = memo(actionHandlers)
hook[4] = effect
```

따라서 렌더링이 다시 일어나도 **같은 순서로 hook을 호출해야 같은 슬롯을 재사용할 수 있습니다.**

### 3. useState

`useState`는 상태값과 `setState`를 hooks 배열에 저장합니다.

동작 흐름:

1. 첫 렌더에서는 초기값을 hooks 배열에 저장합니다.
2. 다음 렌더에서는 같은 index의 상태를 다시 읽습니다.
3. `setState`가 호출되면 새 상태를 계산합니다.
4. 값이 실제로 바뀌었다면 `scheduleUpdate()`를 호출합니다.
5. 루트 컴포넌트 재렌더링을 예약합니다.

즉 `setState`는 값을 저장하는 함수이면서, 화면 갱신 흐름의 시작점이기도 합니다.

### 3-1. scheduleUpdate와 microtask

이 프로젝트는 `scheduleUpdate()` 안에서 `queueMicrotask()`를 사용해 같은 이벤트 루프 안의 중복 업데이트를 줄입니다.

즉 한 번의 사용자 액션 중 `setState`가 여러 번 호출되더라도, 즉시 여러 번 다시 그리는 대신 **한 번만 update를 예약하는 방향**으로 동작합니다.

이 부분은 과제의 선택 포인트였던 batching 아이디어를 아주 단순한 형태로 반영한 구현입니다.

### 4. useMemo

`useMemo`는 계산 결과를 저장해 두고, `deps`가 바뀌지 않으면 이전 값을 재사용합니다.

이 프로젝트에서 `useMemo`는 다음 계산에 사용됩니다.

- 성장 단계 계산
- 건강 상태 계산
- 액션 핸들러 묶음 재사용

즉 "다시 계산할 필요가 없으면 이전 계산 결과를 그대로 쓴다"는 아이디어를 직접 구현한 것입니다.

### 5. useEffect

`useEffect`는 render 중 바로 실행되지 않습니다.  
이 프로젝트에서는 patch가 끝난 뒤 `flushEffects()`에서 실행됩니다.

이렇게 분리한 이유:

- render: 화면 계산
- patch: 실제 DOM 반영
- effect: 부가 작업

이 프로젝트에서 effect는 문서 제목 갱신에 사용됩니다.

```js
useEffect(function () {
  document.title = ...;
}, [beanState.day, stageInfo.name]);
```

### 6. deps

`deps`는 "이 값들이 바뀌면 다시 실행하라"는 기준값 목록입니다.

예:

```js
[beanState.day, stageInfo.name]
```

이전 렌더와 현재 렌더의 deps를 비교해서:

- 하나라도 다르면 effect 또는 memo를 다시 실행
- 모두 같으면 이전 값을 재사용

즉 deps는 재실행 조건표라고 볼 수 있습니다.

## 렌더링 흐름

버튼을 눌렀을 때 실제로 일어나는 흐름은 아래와 같습니다.

```text
사용자 클릭
-> ActionButton onClick 실행
-> setState 호출
-> scheduleUpdate 실행
-> 루트 App 재실행
-> 새 Virtual DOM 생성
-> 이전 Virtual DOM과 diff 비교
-> patch 적용
-> patch 이후 useEffect 실행
```

이 구조 덕분에 화면 전체를 무조건 다시 만드는 것이 아니라, diff 결과에 따라 필요한 변경만 실제 DOM에 반영할 수 있습니다.

## 상태 구조

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

- 자식 컴포넌트는 state를 가지지 않습니다.
- 루트 `App`만 state를 가집니다.
- 자식은 props만 받아 렌더합니다.

이것이 과제에서 요구한 `Lifting State Up` 구조입니다.

## 자식 컴포넌트

현재 자식 컴포넌트는 모두 props-only 순수 함수입니다.

- `ActionButton`
- `Meter`
- `ServicePanel`
- `RuntimePanel`
- `WhiteBoxPanel`

이 컴포넌트들은:

- `useState`를 쓰지 않고
- `useEffect`를 쓰지 않고
- 전달받은 props만 사용해
- VDOM을 반환합니다

즉 "자식은 Stateless + props-only" 조건을 만족합니다.

## Runtime Panel / WhiteBox Panel

이 프로젝트는 단순히 UI만 보여주는 것이 아니라, 내부 구조까지 확인할 수 있게 설계했습니다.

### Runtime Panel

- 현재 루트 state 스냅샷
- renderCount
- hookCount
- lastEffectCount
- totalEffectCount
- hooks 배열 스냅샷

이 패널을 통해 "화면 뒤에서 실제로 어떤 값이 바뀌는가"를 설명할 수 있습니다.

### WhiteBox Panel

- 루트 state 관리 여부
- Hook 순서 유지 여부
- `setState` 이후 자동 업데이트 여부
- 부분 업데이트 지향 여부
- `useMemo` 활용 여부
- `useEffect` 활용 여부

즉 발표에서 "우리는 UI만 만든 것이 아니라, 내부 런타임 구조도 검증했다"는 근거로 사용할 수 있습니다.

## 실제 React와 차이

이 프로젝트는 React 전체를 구현한 것이 아닙니다.

차이점:

- Fiber 없음
- 비동기 우선순위 스케줄링 없음
- 정교한 reconciliation 최적화 없음
- key 기반 고급 리스트 diff 없음
- 훨씬 단순한 hooks 시스템

하지만 핵심 아이디어는 직접 담고 있습니다.

- 함수형 컴포넌트
- 루트 상태 관리
- hooks 배열 기반 상태 유지
- Virtual DOM
- Diff / Patch
- patch 이후 effect 실행

## 발표용 4분 흐름

### 1. 시작

"저희 프로젝트는 Bean Lab Mini React입니다. 강낭콩 키우기 UI를 통해 React의 핵심 원리인 Component, State, Hooks, Virtual DOM, Diff, Patch를 바닐라 JavaScript로 직접 구현한 프로젝트입니다."

### 2. 프로젝트 목적

"중요한 점은 강낭콩 게임 자체가 목적이 아니라, 상태 변화가 내부적으로 어떻게 렌더링으로 이어지는지 설명하는 것이 목적이라는 점입니다."

### 3. 구조 소개

"구조는 크게 두 층입니다. 하나는 Mini React 런타임이고, 다른 하나는 강낭콩 서비스 화면입니다. 런타임에서는 FunctionComponent, hooks 배열, useState, useMemo, useEffect, diff/patch를 구현했고, UI는 그 구조를 설명하는 데모 역할을 합니다."

### 4. 상태와 컴포넌트

"모든 state는 루트 App 하나에만 있습니다. 자식 컴포넌트는 state를 가지지 않고 props만 받아 렌더링하는 순수 함수로 만들었습니다. 즉 과제의 Lifting State Up 요구사항을 그대로 따랐습니다."

### 5. Hooks 설명

"함수형 컴포넌트는 렌더링마다 다시 실행되지만, 상태는 함수 안이 아니라 FunctionComponent의 hooks 배열에 저장됩니다. 그래서 hookIndex를 이용해 같은 순서의 hook 슬롯을 다시 찾아가며 상태를 유지할 수 있습니다."

### 6. 렌더링 흐름

"버튼을 누르면 setState가 호출되고, 루트 App이 다시 실행되며 새로운 Virtual DOM을 만듭니다. 이후 이전 VDOM과 비교해 바뀐 부분만 patch로 실제 DOM에 반영하고, 마지막에 effect가 실행됩니다."

### 7. 데모 포인트

"발표에서는 버튼을 눌러 상태가 바뀌는 모습과 함께 Runtime Panel을 보여드릴 예정입니다. 여기서 루트 state, hook 스냅샷, renderCount를 확인할 수 있고, WhiteBox Panel에서는 우리가 과제 핵심 조건을 만족하는지 설명형 검증 결과를 보여줍니다."

### 8. 마무리

"정리하면 Bean Lab Mini React는 강낭콩 키우기 UI를 이용해 Mini React 런타임의 핵심 원리를 직접 눈으로 확인할 수 있도록 만든 프로젝트입니다."

## 발표 때 꼭 강조할 포인트

- 모든 state는 루트 `App`에만 있습니다.
- 자식 컴포넌트는 props-only 순수 함수입니다.
- hooks는 함수 내부가 아니라 바깥 배열에 저장됩니다.
- `hookIndex`로 같은 훅 슬롯을 재사용합니다.
- `setState`는 값 변경뿐 아니라 update 예약까지 담당합니다.
- 새 VDOM을 만들고 `diff/patch`로 필요한 부분만 반영합니다.
- `useEffect`는 render 중이 아니라 patch 이후에 실행됩니다.

## 예상 질문과 답변

### 왜 자식 컴포넌트에 state를 두지 않았나요?

과제 요구사항이 루트 상태 관리였고, 상태 흐름을 한 곳에 모아두는 편이 React의 데이터 흐름을 설명하기에도 더 명확하기 때문입니다.

### 왜 useEffect를 바로 실행하지 않았나요?

render와 side effect를 분리해야 React와 비슷한 구조를 만들 수 있기 때문입니다. 이 프로젝트에서는 patch 이후에 effect를 실행합니다.

### setState가 값만 바꾸는 함수가 아닌 이유는 무엇인가요?

상태가 바뀐 뒤 실제 화면도 다시 계산되어야 하기 때문입니다. 그래서 `setState`는 루트 컴포넌트 update까지 예약합니다.

### 실제 React와 가장 큰 차이는 무엇인가요?

Fiber, 비동기 스케줄링, 더 정교한 reconciliation 같은 고급 기능이 없다는 점입니다. 대신 학습용으로 핵심 개념만 남겨 직접 구현했습니다.

## 실행 방법

브라우저에서 `index.html`을 열면 바로 실행됩니다.
