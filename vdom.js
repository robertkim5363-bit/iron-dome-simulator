function flattenChildren(children, result) {
  children.forEach(function (child) {
    if (Array.isArray(child)) {
      // JSX의 중첩 children처럼 배열 안 배열이 들어와도 평탄화해
      // 이후 diff/createNode가 항상 일관된 children 리스트를 받게 합니다.
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

// JSX 대신 쓰는 VNode 생성 함수입니다.
// type이 문자열이면 DOM 노드, 함수면 함수형 컴포넌트로 취급합니다.
function h(type, props) {
  const children = [];
  const rawChildren = Array.prototype.slice.call(arguments, 2);

  flattenChildren(rawChildren, children);

  if (typeof type === 'function') {
    // 이 프로젝트의 자식 함수형 컴포넌트는 hook을 쓰지 않는 props-only 함수이므로
    // 별도 인스턴스를 만들지 않고 즉시 실행해 하위 VNode를 얻습니다.
    return type(Object.assign({}, props || {}, { children: children }));
  }

  return {
    type: type,
    props: props || {},
    children: children
  };
}

// VNode를 실제 DOM 노드로 바꾸는 단계입니다.
function createNode(vNode) {
  if (typeof vNode === 'string') {
    return document.createTextNode(vNode);
  }

  const el = document.createElement(vNode.type);
  // 최초 마운트에서도 props 반영 로직을 재사용하면
  // 생성(create)과 갱신(props patch)이 같은 규칙으로 DOM을 다루게 됩니다.
  applyPropsToElement(el, {}, vNode.props || {});

  (vNode.children || []).forEach(function (child) {
    // VDOM 트리를 DOM 트리로 바꾸는 과정도 재귀적으로 내려갑니다.
    el.appendChild(createNode(child));
  });

  return el;
}

// 이전 props와 새 props를 비교해 실제 DOM 속성과 이벤트를 동기화합니다.
function applyPropsToElement(el, oldProps, newProps) {
  const previous = oldProps || {};
  const next = newProps || {};

  // 먼저 사라진 속성을 지우고,
  Object.keys(previous).forEach(function (key) {
    if (!(key in next)) {
      removeProp(el, key, previous[key]);
    }
  });

  // 남아 있거나 새로 생긴 속성은 값 비교 후 필요한 것만 반영합니다.
  Object.keys(next).forEach(function (key) {
    if (previous[key] !== next[key]) {
      setProp(el, key, next[key], previous[key]);
    }
  });
}

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

    // style 객체도 얕게 diff해서 빠진 키는 지우고 바뀐 키만 다시 씁니다.
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

    // 이벤트는 VNode props로 전달되지만 실제 등록/해제는 DOM patch 단계에서 처리합니다.
    // 이전 핸들러를 먼저 제거한 뒤 새 핸들러를 붙여 참조 변경을 안전하게 반영합니다.
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

function removeProp(el, key, oldValue) {
  if (key === 'key') {
    return;
  }

  if (key === 'className') {
    el.removeAttribute('class');
    return;
  }

  if (key === 'style' && oldValue && typeof oldValue === 'object') {
    // style 객체 삭제는 키별로 비워야 브라우저에 남은 인라인 스타일이 누적되지 않습니다.
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

function isEventProp(key) {
  return /^on[A-Z]/.test(key);
}
