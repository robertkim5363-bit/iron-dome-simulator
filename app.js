let currentComponent = null;

// 루트 함수형 컴포넌트를 감싸는 작은 런타임 객체입니다.
// hooks 배열, 렌더링, effect 실행 시점을 여기서 관리합니다.
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
      totalEffectCount: 0,
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

    // 같은 이벤트 루프 안에서 여러 setState가 호출돼도 update는 한 번만 실행되게 합니다.
    queueMicrotask(() => {
      this.isUpdateScheduled = false;
      this.update();
    });
  }

  update() {
    const previousVNode = this.vNode;
    this.hookIndex = 0;
    this.pendingEffects = [];

    // 훅은 "지금 어떤 컴포넌트가 렌더 중인지" 알아야 하므로 전역 포인터를 잠시 연결합니다.
    currentComponent = this;
    const nextVNode = this.renderFn(this.props);
    currentComponent = null;

    // 새 VDOM을 만들고 이전 VDOM과 비교한 뒤, 실제 DOM에는 필요한 patch만 반영합니다.
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

    // useEffect는 render 중이 아니라 patch 이후에 실행되어야 하므로 여기서 처리합니다.
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
    this.debug.totalEffectCount += effectCount;
  }
}

function assertRootHook(hookName) {
  if (!currentComponent) {
    throw new Error(hookName + '는 루트 FunctionComponent 렌더링 중에만 호출할 수 있습니다.');
  }
}

// useState는 hooks[index]에 상태값과 setState를 저장합니다.
// 컴포넌트 함수는 다시 실행되지만 hooks 배열은 유지되므로 상태가 이어집니다.
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
      // 상태 변경 후 자동 재렌더가 일어나도록 update를 예약합니다.
      component.scheduleUpdate();
    };

    component.hooks[hookIndex] = hook;
  }

  const currentHook = component.hooks[hookIndex];
  component.hookIndex += 1;
  return [currentHook.value, currentHook.setState];
}

// useMemo는 deps가 바뀌지 않으면 이전 계산 결과를 재사용합니다.
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

// useEffect는 이 렌더에서 "실행 예약"만 하고, 실제 실행은 patch 뒤 flushEffects에서 합니다.
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

// 런타임 디버그 창에서 hooks 배열을 읽기 쉬운 문자열로 바꾸기 위한 함수입니다.
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

// patch 목록을 길게 노출하는 대신, 디버그용 짧은 설명 문자열로 바꿉니다.
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

// App은 루트 컴포넌트입니다.
// 과제 제약에 맞춰 state와 hook은 이 컴포넌트에서만 사용합니다.
function App() {
  const [beanState, setBeanState] = useState(createInitialBeanState);

  // growth 값으로부터 현재 성장 단계를 계산합니다.
  const stageInfo = useMemo(function () {
    return getStageInfo(beanState);
  }, [beanState.growth]);

  // 수분/햇빛/영양 값으로부터 건강 상태 문구를 계산합니다.
  const healthSummary = useMemo(function () {
    return getHealthSummary(beanState);
  }, [beanState.water, beanState.sunlight, beanState.nutrition]);

  // 버튼 핸들러를 객체 하나로 memo해 두면 매 렌더마다 onClick 참조가 바뀌는 일을 줄일 수 있습니다.
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
  // effect는 patch 뒤 실행되지만, 디버그 화면에는 이번 렌더에서 예정된 effect 수를 바로 보여줍니다.
  const scheduledEffectCount = currentComponent.pendingEffects.length;
  const runtimeDebugView = Object.assign({}, runtimeDebug, {
    hookSnapshot: snapshotHooks(currentComponent.hooks),
    lastEffectCount: scheduledEffectCount,
    totalEffectCount: runtimeDebug.totalEffectCount + scheduledEffectCount
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
            h('span', { className: 'panel-icon' }, 'DEBUG'),
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
            h('span', { className: 'panel-icon' }, 'BEAN'),
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
          h('span', { className: 'panel-icon' }, 'TEST'),
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
      h(ActionButton, { label: '물 주기 💧', variant: 'water', onClick: actionHandlers.water }),
      h(ActionButton, { label: '햇빛 쬐기 ☀️', variant: 'sunlight', onClick: actionHandlers.sunlight }),
      h(ActionButton, { label: '영양 공급 🌿', variant: 'nutrition', onClick: actionHandlers.nutrition }),
      h(ActionButton, { label: '하루 보내기 📆', variant: 'day', onClick: actionHandlers.day }),
      h(ActionButton, { label: '수확하기 🧺', variant: 'harvest', onClick: actionHandlers.harvest }),
      h(ActionButton, { label: '테스트하기 🧪', variant: 'probe', onClick: actionHandlers.probe })
    )
  );
}

const appElement = document.getElementById('app');

if (!appElement) {
  throw new Error('#app 컨테이너를 찾을 수 없습니다.');
}

const app = new FunctionComponent(App, {}, appElement);
app.mount();
