# AI Convention

이 문서는 기존 Virtual DOM(Week 3) 엔진을 기반으로 Mini React 스타일 런타임을 구현할 때 AI가 반드시 지켜야 하는 최소 규약만 정리한 문서이다.

## 1. 프로젝트 목표

- 함수형 컴포넌트 기반 UI 시스템 구현
- `useState`, `useEffect`, `useMemo` 최소 구현
- 상태(State)는 루트 컴포넌트에서만 관리
- 자식 컴포넌트는 상태 없이 props만 받는 순수 함수로 구현
- Virtual DOM 생성 -> Diff -> Patch 흐름 유지
- 사용자 입력/클릭에 따라 화면이 실제로 변경되는 웹 페이지 구현

이 프로젝트는 React를 사용하는 프로젝트가 아니다.

React의 핵심 아이디어 일부를 바닐라 JavaScript로 직접 구현하는 교육용 프로젝트이다.

## 2. 절대 금지사항

### 2.1 기술 금지

- React, Vue, Svelte, Preact 등 외부 UI 프레임워크 및 상태관리/Hook 라이브러리 사용 금지
- `eval()` 사용 금지
- `var` 키워드 사용 금지

### 2.2 구현 금지

- 상태(State)를 루트 컴포넌트 외부에 두는 것 금지
- 자식 컴포넌트에서 state 선언 및 hook 사용 금지
- `innerHTML`로 전체 화면을 갈아엎는 방식 금지
- 실제 DOM을 직접 수정해서 VDOM 흐름을 우회하는 행위 금지
- `props` 직접 수정(mutation) 금지
- effect를 render 도중에 동기적으로 실행하는 것 금지

단, 앱 시작 시 mount 대상 container를 잡기 위한 최소한의 DOM 접근은 허용한다.

예시:

```js
document.getElementById('app');
```

## 3. 상태 관리 및 렌더링 규칙

- 모든 state는 루트 컴포넌트에만 존재해야 한다.
- 자식은 이벤트를 발생시키고, 부모가 상태를 바꾸고, 다시 props를 내려주는 구조를 따른다.
- Hook은 루트 컴포넌트 렌더링 과정에서만 호출할 것
- `setState`는 상태 갱신 후 루트 `update()`를 트리거할 것
- `useEffect`는 render 중이 아니라 patch 완료 후 실행할 것
- 이벤트 핸들러는 VNode의 `props`를 통해 전달하고, 실제 DOM 이벤트 등록/해제는 patch 단계에서만 처리할 것

정답 흐름:

```text
사용자 입력
-> 자식 이벤트 핸들러 실행
-> 부모 콜백 호출
-> 루트 state(setState) 변경
-> 루트 재렌더(update)
-> 새 VDOM 생성
-> diff
-> patch
-> 화면 반영
```

## 4. 필수 인터페이스 및 구현 힌트

### 4.1 기존 VNode 구조 유지

AI가 생성하는 모든 컴포넌트의 반환값은 기존 Week 3의 VNode 규격을 정확히 따라야 한다.

```js
{
  type: string,
  props: object,
  children: Array
}
```

예시:

```js
{
  type: 'button',
  props: { class: 'btn', onClick: handleClick },
  children: ['Click me']
}
```

### 4.2 Hook과 상태 유지 원리

`"함수는 매번 새로 실행되는데 상태를 어떻게 유지할까?"`를 해결하기 위해, 루트 컴포넌트를 감싸는 `FunctionComponent` 클래스 또는 이에 준하는 래퍼 구조를 사용해야 한다.

최소 요구사항:

- `hooks` 배열: 렌더링 간 상태 값과 의존성 배열을 순서대로 저장
- `hookIndex`: 현재 렌더링 중인 Hook의 호출 순서를 추적
- `mount()`: 최초 렌더링 수행
- `update()`: 상태 변경 후 재렌더링 수행

`setState`가 호출되면 값을 갱신하고, 루트 컴포넌트를 재실행하여 새로운 VNode를 만든 뒤 `diff()`와 `patch()`를 트리거해야 한다.

## 5. 컴포넌트 규칙

- 모든 컴포넌트는 함수형 컴포넌트로 구현할 것
- 루트 컴포넌트만 state와 hook을 사용할 수 있다
- 자식 컴포넌트는 상태 없이 `props`만 받아 사용하는 순수 함수여야 한다
- 자식 컴포넌트 내부에서 상태 저장, effect 실행, memo 저장을 시도하지 말 것

## 6. Virtual DOM 규칙

- 상태 변경 시 반드시 새 Virtual DOM을 생성할 것
- 이전 Virtual DOM과 새 Virtual DOM을 비교하여 변경점을 계산할 것
- 실제 DOM 반영은 `patch()`를 통해서만 수행할 것
- 전체를 다시 그리지 말고 필요한 부분만 업데이트할 것

## 7. 구현 우선순위

- 학습보다 구현이 우선이다
- AI를 적극적으로 활용해도 된다
- 다만 생성된 코드의 핵심 로직은 반드시 설명 가능해야 한다
- 핵심 로직은 특히 아래 질문에 답할 수 있어야 한다

핵심 질문:

- 함수는 매번 새로 실행되는데 상태는 어디에 저장되는가?
- `setState`는 왜 화면을 다시 그리게 만드는가?
- `useEffect`는 왜 render 중이 아니라 patch 이후에 실행되어야 하는가?
- `useMemo`는 어떤 값을 언제 재계산해야 하는가?
- 현재 구현과 실제 React의 차이점은 무엇인가?
