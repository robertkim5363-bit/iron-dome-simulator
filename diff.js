// diff는 이전 VDOM과 새 VDOM을 비교해 실제 DOM에 어떤 변경이 필요한지 목록으로 만듭니다.
function diff(oldNode, newNode, parentEl, existingEl) {
  const patches = [];

  if (oldNode == null && newNode == null) {
    return patches;
  }

  if (oldNode == null) {
    // 이전 노드가 없으면 새 노드를 만들라는 patch 하나만 있으면 됩니다.
    patches.push({
      type: 'create',
      parentEl: parentEl,
      vNode: newNode
    });
    return patches;
  }

  const el = existingEl !== undefined ? existingEl : parentEl.firstChild;

  if (newNode == null) {
    // 새 노드가 사라졌다면 현재 DOM 노드를 제거 대상으로 기록합니다.
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
      // 둘 다 text라면 노드 자체를 바꾸지 않고 nodeValue만 바꾸는 편이 가장 저렴합니다.
      if (oldNode !== newNode) {
        patches.push({
          type: 'text',
          el: el,
          value: newNode
        });
      }
      return patches;
    }

    patches.push({
      type: 'replace',
      el: el,
      vNode: newNode
    });
    return patches;
  }

  if (oldNode.type !== newNode.type) {
    // 태그 종류가 다르면 세부 비교보다 통째 교체가 더 단순합니다.
    patches.push({
      type: 'replace',
      el: el,
      vNode: newNode
    });
    return patches;
  }

  if (!arePropsSame(oldNode.props || {}, newNode.props || {})) {
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

  for (let index = 0; index < maxLength; index += 1) {
    // 자식도 같은 규칙으로 재귀 비교합니다.
    // key 기반 재배치는 없으므로 같은 index끼리 비교하는 단순한 학습용 전략입니다.
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

// patch는 diff가 만든 변경 목록을 실제 DOM에 적용하는 단계입니다.
function patch(patches) {
  patches.forEach(function (patchItem) {
    switch (patchItem.type) {
      case 'create':
        // create는 새 DOM subtree를 만들어 부모 아래에 붙입니다.
        patchItem.parentEl.appendChild(createNode(patchItem.vNode));
        break;
      case 'remove':
        if (patchItem.el && patchItem.el.parentNode) {
          patchItem.el.parentNode.removeChild(patchItem.el);
        }
        break;
      case 'replace':
        if (patchItem.el && patchItem.el.parentNode) {
          // replace는 기존 subtree를 버리고 새 subtree로 교체합니다.
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
          // props patch는 DOM 노드를 재사용한 채 속성과 이벤트만 다시 동기화합니다.
          applyPropsToElement(patchItem.el, patchItem.oldProps, patchItem.newProps);
        }
        break;
      default:
        throw new Error('지원하지 않는 patch 타입: ' + patchItem.type);
    }
  });
}
