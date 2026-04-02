/*
  diff는 이전 VDOM과 새 VDOM을 비교해서
  "실제 DOM에 어떤 변경이 필요한지"를 patch 목록으로 만드는 함수입니다.

  반환값은 patch 배열이며, patch()가 이 배열을 실제 DOM에 적용합니다.
*/
function diff(oldNode, newNode, parentEl, existingEl) {
  const patches = [];

  if (oldNode == null && newNode == null) {
    return patches;
  }

  if (oldNode == null) {
    // 예전엔 없었고 지금은 생긴 노드 -> 새로 create
    patches.push({
      type: 'create',
      parentEl: parentEl,
      vNode: newNode
    });
    return patches;
  }

  const el = existingEl !== undefined ? existingEl : parentEl.firstChild;

  if (newNode == null) {
    // 예전엔 있었는데 지금은 사라진 노드 -> remove
    patches.push({
      type: 'remove',
      el: el
    });
    return patches;
  }

  const isOldText = typeof oldNode === 'string';
  const isNewText = typeof newNode === 'string';

  if (isOldText || isNewText) {
    if (isOldText && isNewText) {
      // 둘 다 텍스트면 전체 노드를 바꾸지 않고 내용만 바꿉니다.
      if (oldNode !== newNode) {
        patches.push({
          type: 'text',
          el: el,
          value: newNode
        });
      }
      return patches;
    }

    // 하나는 텍스트, 하나는 일반 노드면 통째로 교체합니다.
    patches.push({
      type: 'replace',
      el: el,
      vNode: newNode
    });
    return patches;
  }

  if (oldNode.type !== newNode.type) {
    // 태그 종류가 다르면 세부 비교보다 교체가 더 단순합니다.
    patches.push({
      type: 'replace',
      el: el,
      vNode: newNode
    });
    return patches;
  }

  if (!arePropsSame(oldNode.props || {}, newNode.props || {})) {
    // 태그는 같지만 props가 다르면 props patch를 만듭니다.
    patches.push({
      type: 'props',
      el: el,
      oldProps: oldNode.props || {},
      newProps: newNode.props || {}
    });
  }

  const oldChildren = oldNode.children || [];
  const newChildren = newNode.children || [];
  const maxLength = Math.max(oldChildren.length, newChildren.length);

  /*
    자식 비교는 index 기준으로 단순 재귀 비교합니다.
    실제 React처럼 key 기반 고급 reconciliation은 구현하지 않았습니다.
  */
  for (let index = 0; index < maxLength; index += 1) {
    const childPatches = diff(
      oldChildren[index],
      newChildren[index],
      el,
      el ? el.childNodes[index] : null
    );

    childPatches.forEach(function (childPatch) {
      patches.push(childPatch);
    });
  }

  return patches;
}

/*
  props가 같은지 판단하는 단순 비교 함수입니다.

  주의:
  - 이 함수는 얕은 비교만 합니다.
  - 함수 참조가 달라지면 props가 바뀐 것으로 봅니다.
  - 즉 실제 React처럼 정교한 최적화는 아닙니다.
*/
function arePropsSame(oldProps, newProps) {
  const oldKeys = Object.keys(oldProps);
  const newKeys = Object.keys(newProps);

  if (oldKeys.length !== newKeys.length) {
    return false;
  }

  for (let index = 0; index < oldKeys.length; index += 1) {
    const key = oldKeys[index];
    if (oldProps[key] !== newProps[key]) {
      return false;
    }
  }

  return true;
}

/*
  patch는 diff가 만든 patch 목록을 실제 DOM에 적용합니다.

  즉 diff가 "무엇을 바꿀지" 결정한다면,
  patch는 "어떻게 바꿀지" 실행하는 단계입니다.
*/
function patch(patches) {
  patches.forEach(function (patchItem) {
    switch (patchItem.type) {
      case 'create':
        patchItem.parentEl.appendChild(createNode(patchItem.vNode));
        break;
      case 'remove':
        if (patchItem.el && patchItem.el.parentNode) {
          patchItem.el.parentNode.removeChild(patchItem.el);
        }
        break;
      case 'replace':
        if (patchItem.el && patchItem.el.parentNode) {
          patchItem.el.parentNode.replaceChild(createNode(patchItem.vNode), patchItem.el);
        }
        break;
      case 'text':
        if (patchItem.el) {
          patchItem.el.nodeValue = patchItem.value;
        }
        break;
      case 'props':
        if (patchItem.el) {
          applyPropsToElement(patchItem.el, patchItem.oldProps, patchItem.newProps);
        }
        break;
      default:
        throw new Error('지원하지 않는 patch 타입: ' + patchItem.type);
    }
  });
}
