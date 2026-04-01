let currentComponent = null;

class FunctionComponent {
  constructor(renderFn, props, container) {
    this.renderFn = renderFn;
    this.props = props || {};
    this.container = container;
    this.hooks = [];
    this.hookIndex = 0;
    this.vNode = null;
    this.pendingEffects = [];
    this.cleanupEffects = [];
    this.isUpdateScheduled = false;
    this.debug = {
      renderCount: 0,
      hookSnapshot: [],
      lastPatchSummary: [],
      lastEffectCount: 0,
      previousVNodeLabel: '없음',
      currentVNodeLabel: '없음'
    };
  }

  mount() {
    this.update();
  }

  scheduleUpdate() {
    if (this.isUpdateScheduled) {
      return;
    }

    this.isUpdateScheduled = true;

    queueMicrotask(() => {
      this.isUpdateScheduled = false;
      this.update();
    });
  }

  update() {
    const previousVNode = this.vNode;
    this.hookIndex = 0;
    this.pendingEffects = [];

    currentComponent = this;
    const nextVNode = this.renderFn(this.props);
    currentComponent = null;

    const patches = diff(previousVNode, nextVNode, this.container, this.container.firstChild);
    patch(patches);

    this.vNode = nextVNode;
    this.debug.renderCount += 1;
    this.debug.lastPatchSummary = patches.map(describePatch).slice(0, 8);
    this.debug.hookSnapshot = snapshotHooks(this.hooks);
    this.debug.previousVNodeLabel = summarizeVNode(previousVNode);
    this.debug.currentVNodeLabel = summarizeVNode(nextVNode);

    this.flushEffects();
  }

  flushEffects() {
    let effectCount = 0;

    this.pendingEffects.forEach((effectJob) => {
      const previousCleanup = this.cleanupEffects[effectJob.index];

      if (typeof previousCleanup === 'function') {
        previousCleanup();
      }

      const cleanup = effectJob.effect();
      this.cleanupEffects[effectJob.index] = typeof cleanup === 'function' ? cleanup : null;
      effectCount += 1;
    });

    this.debug.lastEffectCount = effectCount;
  }
}

function assertRootHook(hookName) {
  if (!currentComponent) {
    throw new Error(hookName + '는 루트 FunctionComponent 렌더링 중에만 호출할 수 있습니다.');
  }
}

function useState(initialValue) {
  assertRootHook('useState');

  const component = currentComponent;
  const hookIndex = component.hookIndex;

  if (!component.hooks[hookIndex]) {
    const hook = {
      kind: 'state',
      value: typeof initialValue === 'function' ? initialValue() : initialValue,
      setState: null
    };

    hook.setState = function (nextValue) {
      const resolvedValue = typeof nextValue === 'function' ? nextValue(hook.value) : nextValue;

      if (Object.is(resolvedValue, hook.value)) {
        return;
      }

      hook.value = resolvedValue;
      component.scheduleUpdate();
    };

    component.hooks[hookIndex] = hook;
  }

  const currentHook = component.hooks[hookIndex];
  component.hookIndex += 1;
  return [currentHook.value, currentHook.setState];
}

function useMemo(factory, deps) {
  assertRootHook('useMemo');

  const component = currentComponent;
  const hookIndex = component.hookIndex;
  const existingHook = component.hooks[hookIndex];

  if (!existingHook || !areHookDepsSame(existingHook.deps, deps)) {
    component.hooks[hookIndex] = {
      kind: 'memo',
      value: factory(),
      deps: deps ? deps.slice() : null
    };
  }

  const currentHook = component.hooks[hookIndex];
  component.hookIndex += 1;
  return currentHook.value;
}

function useEffect(effect, deps) {
  assertRootHook('useEffect');

  const component = currentComponent;
  const hookIndex = component.hookIndex;
  const existingHook = component.hooks[hookIndex];
  const shouldRun = !existingHook || !areHookDepsSame(existingHook.deps, deps);

  component.hooks[hookIndex] = {
    kind: 'effect',
    deps: deps ? deps.slice() : null
  };

  if (shouldRun) {
    component.pendingEffects.push({
      index: hookIndex,
      effect: effect
    });
  }

  component.hookIndex += 1;
}

function areHookDepsSame(previousDeps, nextDeps) {
  if (!previousDeps || !nextDeps) {
    return false;
  }

  if (previousDeps.length !== nextDeps.length) {
    return false;
  }

  for (let index = 0; index < previousDeps.length; index += 1) {
    if (!Object.is(previousDeps[index], nextDeps[index])) {
      return false;
    }
  }

  return true;
}

function snapshotHooks(hooks) {
  return hooks.map(function (hook, index) {
    if (hook.kind === 'state') {
      return 'hook[' + index + '] state = ' + JSON.stringify(hook.value);
    }

    if (hook.kind === 'memo') {
      if (hook.value && typeof hook.value === 'object') {
        const keys = Object.keys(hook.value);
        const hasFunctionValue = keys.some(function (key) {
          return typeof hook.value[key] === 'function';
        });

        if (hasFunctionValue) {
          return 'hook[' + index + '] memo = actionHandlers(' + keys.join(', ') + ')';
        }
      }

      return 'hook[' + index + '] memo = ' + JSON.stringify(hook.value);
    }

    if (hook.kind === 'effect') {
      return 'hook[' + index + '] effect deps = ' + JSON.stringify(hook.deps);
    }

    return 'hook[' + index + ']';
  });
}

function summarizeVNode(vNode) {
  if (vNode == null) {
    return '없음';
  }

  if (typeof vNode === 'string') {
    return 'text';
  }

  return '<' + vNode.type + '> child:' + ((vNode.children || []).length);
}

function describePatch(patchItem) {
  if (patchItem.type === 'create') {
    return 'create ' + summarizeVNode(patchItem.vNode);
  }

  if (patchItem.type === 'remove') {
    return 'remove node';
  }

  if (patchItem.type === 'replace') {
    return 'replace ' + summarizeVNode(patchItem.vNode);
  }

  if (patchItem.type === 'text') {
    return 'text "' + patchItem.value + '"';
  }

  if (patchItem.type === 'props') {
    return 'props ' + Object.keys(patchItem.newProps).join(', ');
  }

  return patchItem.type;
}

function App() {
  const [beanState, setBeanState] = useState(createInitialBeanState);

  const stageInfo = useMemo(function () {
    return getStageInfo(beanState);
  }, [beanState.growth]);

  const healthSummary = useMemo(function () {
    return getHealthSummary(beanState);
  }, [beanState.water, beanState.sunlight, beanState.nutrition]);

  const actionHandlers = useMemo(function () {
    return {
      water: function () {
        setBeanState(function (previousState) {
          return applyBeanAction(previousState, 'water');
        });
      },
      sunlight: function () {
        setBeanState(function (previousState) {
          return applyBeanAction(previousState, 'sunlight');
        });
      },
      nutrition: function () {
        setBeanState(function (previousState) {
          return applyBeanAction(previousState, 'nutrition');
        });
      },
      day: function () {
        setBeanState(function (previousState) {
          return applyBeanAction(previousState, 'day');
        });
      },
      harvest: function () {
        setBeanState(function (previousState) {
          return applyBeanAction(previousState, 'harvest');
        });
      },
      probe: function () {
        setBeanState(function (previousState) {
          return applyBeanAction(previousState, 'probe');
        });
      }
    };
  }, []);

  useEffect(function () {
    document.title = 'Day ' + beanState.day + ' · ' + stageInfo.name + ' · Bean Lab';
  }, [beanState.day, stageInfo.name]);

  const runtimeDebug = currentComponent.debug;
  const liveHookSnapshot = snapshotHooks(currentComponent.hooks);
  const runtimeDebugView = Object.assign({}, runtimeDebug, {
    hookSnapshot: liveHookSnapshot
  });
  const checks = buildWhiteBoxChecks(beanState, runtimeDebugView, stageInfo, healthSummary);

  return h(
    'div',
    { className: 'app-shell' },
    h(
      'header',
      { className: 'top-bar' },
      h('div', { className: 'brand' }, 'Bean Lab Mini React'),
      h('div', { className: 'top-status' }, '루트 state · hooks · diff/patch'),
      h('div', { className: 'top-stage' }, stageInfo.emoji + ' ' + stageInfo.name)
    ),
    h(
      'main',
      { className: 'panels' },
      h(
        'div',
        { className: 'top-layout' },
        h(
          'section',
          { className: 'panel debug-panel' },
          h(
            'div',
            { className: 'panel-header' },
            h('span', { className: 'panel-icon' }, '✎'),
            '런타임 디버그'
          ),
          h(
            'div',
            { className: 'panel-body' },
            h(RuntimePanel, {
              beanState: beanState,
              runtimeDebug: runtimeDebugView
            })
          )
        ),
        h(
          'section',
          { className: 'panel service-panel' },
          h(
            'div',
            { className: 'panel-header' },
            h('span', { className: 'panel-icon' }, '⚗'),
            '강낭콩 서비스 화면',
            h('span', { className: 'live-badge' }, 'LIVE')
          ),
          h(
            'div',
            { className: 'panel-body service-body' },
            h(ServicePanel, {
              beanState: beanState,
              stageInfo: stageInfo,
              healthSummary: healthSummary
            })
          )
        )
      ),
      h(
        'section',
        { className: 'panel test-panel' },
        h(
          'div',
          { className: 'panel-header' },
          h('span', { className: 'panel-icon' }, '⚗'),
          '화이트박스 테스트'
        ),
        h(
          'div',
          { className: 'panel-body' },
          h(WhiteBoxPanel, {
            checks: checks,
            beanState: beanState
          })
        )
      )
    ),
    h(
      'footer',
      { className: 'action-bar' },
      h(ActionButton, { label: '물 주기', variant: 'water', onClick: actionHandlers.water }),
      h(ActionButton, { label: '햇빛 쬐기', variant: 'sunlight', onClick: actionHandlers.sunlight }),
      h(ActionButton, { label: '영양 공급', variant: 'nutrition', onClick: actionHandlers.nutrition }),
      h(ActionButton, { label: '하루 보내기', variant: 'day', onClick: actionHandlers.day }),
      h(ActionButton, { label: '수확하기', variant: 'harvest', onClick: actionHandlers.harvest }),
      h(ActionButton, { label: '테스트하기', variant: 'probe', onClick: actionHandlers.probe })
    )
  );
}

const appElement = document.getElementById('app');

if (!appElement) {
  throw new Error('#app 컨테이너를 찾을 수 없습니다.');
}

const app = new FunctionComponent(App, {}, appElement);
app.mount();
