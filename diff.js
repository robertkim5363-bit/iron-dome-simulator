function diff(oldNode, newNode, parentEl, existingEl) {
  const patches = [];

  if (oldNode == null && newNode == null) {
    return patches;
  }

  if (oldNode == null) {
    patches.push({
      type: 'create',
      parentEl: parentEl,
      vNode: newNode
    });
    return patches;
  }

  const el = existingEl !== undefined ? existingEl : parentEl.firstChild;

  if (newNode == null) {
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
