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

// JSX 대신 쓰는 VNode 생성 함수입니다.
// type이 문자열이면 DOM 노드, 함수면 함수형 컴포넌트로 취급합니다.
function h(type, props) {
  const children = [];
  const rawChildren = Array.prototype.slice.call(arguments, 2);

  flattenChildren(rawChildren, children);

  if (typeof type === 'function') {
    // 자식 컴포넌트는 props만 받아 순수하게 VNode를 반환합니다.
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
  applyPropsToElement(el, {}, vNode.props || {});

  (vNode.children || []).forEach(function (child) {
    el.appendChild(createNode(child));
  });

  return el;
}

// 이전 props와 새 props를 비교해 실제 DOM 속성과 이벤트를 동기화합니다.
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

    // 이벤트는 VNode props로 전달되지만 실제 등록/해제는 DOM patch 단계에서 처리합니다.
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
