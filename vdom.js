/*
  flattenChildren은 h()에 들어온 자식들을 평평한 1차원 배열로 정리합니다.

  왜 필요한가?
  - children 안에는 배열이 중첩될 수 있습니다.
  - null / undefined / false 같은 렌더링 불필요 값이 들어올 수도 있습니다.
  - 숫자는 텍스트 노드로 바꿔야 합니다.

  그래서 최종적으로 diff/createNode가 다루기 쉬운
  "정리된 children 배열"을 만들어 줍니다.
*/
function flattenChildren(children, result) {
  children.forEach(function (child) {
    if (Array.isArray(child)) {
      flattenChildren(child, result);
      return;
    }

    if (child === null || child === undefined || child === false) {
      return;
    }

    if (typeof child === 'number') {
      result.push(String(child));
      return;
    }

    result.push(child);
  });
}

/*
  h()는 JSX 대신 사용하는 VNode 생성 함수입니다.

  예:
  h('div', { className: 'box' }, 'hello')

  반환:
  {
    type: 'div',
    props: { className: 'box' },
    children: ['hello']
  }

  특별한 점:
  - type이 문자열이면 일반 DOM 태그
  - type이 함수면 함수형 컴포넌트

  이 프로젝트에서는 자식 컴포넌트가 props-only 순수 함수이므로,
  함수형 컴포넌트는 그냥 즉시 실행해서 그 컴포넌트가 반환한 VNode를 받습니다.
*/
function h(type, props) {
  const children = [];
  const rawChildren = Array.prototype.slice.call(arguments, 2);

  flattenChildren(rawChildren, children);

  if (typeof type === 'function') {
    return type(Object.assign({}, props || {}, { children: children }));
  }

  return {
    type: type,
    props: props || {},
    children: children
  };
}

/*
  createNode는 VNode를 실제 DOM 노드로 바꾸는 함수입니다.

  역할:
  - 문자열이면 TextNode 생성
  - 객체 VNode면 element 생성
  - props 적용
  - 자식 VNode도 재귀적으로 DOM으로 변환

  즉 "가상 화면 설명"을 "실제 브라우저 노드"로 바꾸는 단계입니다.
*/
function createNode(vNode) {
  if (typeof vNode === 'string') {
    return document.createTextNode(vNode);
  }

  const el = document.createElement(vNode.type);
  applyPropsToElement(el, {}, vNode.props || {});

  (vNode.children || []).forEach(function (child) {
    el.appendChild(createNode(child));
  });

  return el;
}

/*
  applyPropsToElement는 이전 props와 새 props를 비교해서 실제 DOM에 반영합니다.

  처리 순서:
  1. 이전에는 있었지만 지금은 사라진 props 제거
  2. 새 props 중 변경된 값만 setProp으로 반영

  create 시에도, update 시에도 같은 함수를 재사용합니다.
*/
function applyPropsToElement(el, oldProps, newProps) {
  const previous = oldProps || {};
  const next = newProps || {};

  Object.keys(previous).forEach(function (key) {
    if (!(key in next)) {
      removeProp(el, key, previous[key]);
    }
  });

  Object.keys(next).forEach(function (key) {
    if (previous[key] !== next[key]) {
      setProp(el, key, next[key], previous[key]);
    }
  });
}

/*
  setProp은 props의 한 항목을 실제 DOM에 반영합니다.

  처리 대상:
  - className
  - style 객체
  - onClick 같은 이벤트
  - 일반 attribute
*/
function setProp(el, key, value, oldValue) {
  if (key === 'key') {
    return;
  }

  if (key === 'className') {
    el.setAttribute('class', value);
    return;
  }

  if (key === 'style' && value && typeof value === 'object') {
    const prevStyle = oldValue && typeof oldValue === 'object' ? oldValue : {};

    Object.keys(prevStyle).forEach(function (styleKey) {
      if (!(styleKey in value)) {
        el.style[styleKey] = '';
      }
    });

    Object.keys(value).forEach(function (styleKey) {
      el.style[styleKey] = value[styleKey];
    });
    return;
  }

  if (isEventProp(key)) {
    const eventName = key.slice(2).toLowerCase();

    /*
      이벤트는 VNode props로 전달되지만,
      실제 DOM 등록/해제는 patch 단계에서 처리합니다.

      이전 핸들러 제거 -> 새 핸들러 등록 순서로 동작합니다.
    */
    if (typeof oldValue === 'function') {
      el.removeEventListener(eventName, oldValue);
    }

    if (typeof value === 'function') {
      el.addEventListener(eventName, value);
    }
    return;
  }

  if (value === false || value === null || value === undefined) {
    el.removeAttribute(key);
    return;
  }

  if (value === true) {
    el.setAttribute(key, '');
    return;
  }

  el.setAttribute(key, String(value));
}

/*
  removeProp은 사라진 props를 실제 DOM에서 지웁니다.
*/
function removeProp(el, key, oldValue) {
  if (key === 'key') {
    return;
  }

  if (key === 'className') {
    el.removeAttribute('class');
    return;
  }

  if (key === 'style' && oldValue && typeof oldValue === 'object') {
    Object.keys(oldValue).forEach(function (styleKey) {
      el.style[styleKey] = '';
    });
    return;
  }

  if (isEventProp(key)) {
    if (typeof oldValue === 'function') {
      el.removeEventListener(key.slice(2).toLowerCase(), oldValue);
    }
    return;
  }

  el.removeAttribute(key);
}

/*
  이벤트 props는 onClick, onInput처럼 on + 대문자로 시작하는 이름으로 판단합니다.
*/
function isEventProp(key) {
  return /^on[A-Z]/.test(key);
}
