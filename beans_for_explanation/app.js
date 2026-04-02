let currentComponent = null;

/*
  FunctionComponent는 "루트 함수형 컴포넌트(App)를 실행하는 작은 런타임 객체"입니다.

  왜 이 클래스가 필요할까?
  - 함수형 컴포넌트는 렌더할 때마다 다시 실행됩니다.
  - 그런데 상태(state)는 이전 값을 기억해야 합니다.
  - 그래서 함수 바깥 어딘가에 상태를 저장해야 합니다.

  이 프로젝트에서는 그 저장소 역할을 FunctionComponent가 맡습니다.
  즉, App 함수는 화면을 계산하는 역할만 하고
  FunctionComponent는 그 App을 둘러싸고 아래를 관리합니다.

  - hooks 배열
  - hookIndex
  - mount / update
  - effect 실행 시점
  - 디버그 정보
*/
class FunctionComponent {
  constructor(renderFn, props, container) {
    this.renderFn = renderFn;
    this.props = props || {};
    this.container = container;

    /*
      hooks 배열은 모든 hook 값이 저장되는 핵심 저장소입니다.

      예를 들어 App 안에서 hook을 이렇게 호출하면:
      - useState(...)
      - useMemo(...)
      - useMemo(...)
      - useMemo(...)
      - useEffect(...)

      내부적으로는 대략 이런 슬롯이 만들어집니다.
      - hook[0] = state
      - hook[1] = memo(stageInfo)
      - hook[2] = memo(healthSummary)
      - hook[3] = memo(actionHandlers)
      - hook[4] = effect
    */
    this.hooks = [];

    /*
      hookIndex는 "이번 렌더에서 몇 번째 hook을 읽고 있는가"를 나타냅니다.

      중요한 점:
      - 렌더 시작마다 0으로 초기화
      - hook 호출할 때마다 1씩 증가
      - 다음 렌더 때 다시 0부터 시작

      이 덕분에 같은 순서로 호출된 hook이 같은 슬롯을 재사용합니다.
    */
    this.hookIndex = 0;

    // 직전 렌더의 Virtual DOM을 저장합니다.
    this.vNode = null;

    /*
      pendingEffects는 "이번 렌더 후 실행해야 하는 effect" 목록입니다.
      useEffect는 render 중 즉시 실행하지 않고 여기 예약만 해 둡니다.
    */
    this.pendingEffects = [];

    /*
      cleanupEffects는 이전 effect가 반환한 cleanup 함수를 저장합니다.
      나중에 같은 effect가 다시 실행되기 전에 기존 cleanup을 먼저 호출합니다.
    */
    this.cleanupEffects = [];

    /*
      scheduleUpdate가 같은 tick 안에서 여러 번 호출되더라도
      실제 update는 한 번만 예약되도록 막는 플래그입니다.
    */
    this.isUpdateScheduled = false;

    // 화면과 화이트박스 패널에 보여줄 디버그 정보입니다.
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

  /*
    mount는 "최초 렌더"를 담당합니다.
    처음 한 번 update를 실행해 첫 VDOM을 만들고 DOM에 붙입니다.
  */
  mount() {
    this.update();
  }

  /*
    scheduleUpdate는 setState 이후 재렌더를 예약하는 함수입니다.

    왜 바로 update()를 호출하지 않을까?
    - 같은 클릭 안에서 setState가 여러 번 호출될 수 있습니다.
    - 그때마다 즉시 update하면 불필요한 중복 렌더가 생깁니다.

    그래서 queueMicrotask를 사용해
    "현재 실행 중인 이벤트 핸들러가 끝난 뒤" update를 한 번만 실행합니다.
    이건 아주 단순한 batching 효과를 냅니다.
  */
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

  /*
    update는 이 런타임의 핵심입니다.

    전체 흐름:
    1. 이전 VDOM 저장
    2. hookIndex 초기화
    3. App 실행 -> 새 VDOM 생성
    4. 이전 VDOM과 새 VDOM diff
    5. patch 적용
    6. 디버그 정보 갱신
    7. patch 이후 effect 실행
  */
  update() {
    const previousVNode = this.vNode;

    // 새 렌더가 시작되면 hook 호출 순서를 다시 0부터 셉니다.
    this.hookIndex = 0;

    // 이번 렌더에서 예약될 effect 목록을 비웁니다.
    this.pendingEffects = [];

    /*
      currentComponent는 "지금 렌더 중인 컴포넌트가 누구인지"를 가리키는 전역 포인터입니다.
      useState/useMemo/useEffect는 이를 통해 hooks 배열에 접근합니다.
    */
    currentComponent = this;
    const nextVNode = this.renderFn(this.props);
    currentComponent = null;

    /*
      renderFn(App)은 실제 DOM을 직접 수정하지 않습니다.
      대신 "다음 화면을 설명하는 VDOM"만 반환합니다.

      DOM 수정은 아래 diff/patch 단계에서 일어납니다.
    */
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

  /*
    flushEffects는 patch가 끝난 뒤 effect를 실제 실행하는 단계입니다.

    왜 render 안에서 effect를 바로 실행하지 않을까?
    - render는 화면 계산 단계
    - patch는 실제 DOM 반영 단계
    - effect는 부수 효과 단계

    이 세 단계를 분리해야 React 스타일 구조에 가깝습니다.
  */
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
    this.debug.totalEffectCount += effectCount;
  }
}

/*
  hook은 루트 FunctionComponent가 렌더 중일 때만 호출할 수 있습니다.
  이 프로젝트는 과제 제약에 맞춰 "루트 컴포넌트에서만 hook 사용"을 전제로 합니다.
*/
function assertRootHook(hookName) {
  if (!currentComponent) {
    throw new Error(hookName + '는 루트 FunctionComponent 렌더링 중에만 호출할 수 있습니다.');
  }
}

/*
  useState는 "변경 가능한 상태"를 저장하는 hook입니다.

  입력:
  - initialValue: 초기 상태값 또는 초기값 생성 함수

  반환:
  - [현재 상태값, setState 함수]

  내부 원리:
  - 현재 hookIndex를 읽는다.
  - hooks[hookIndex]가 비어 있으면 state hook을 새로 만든다.
  - hooks[hookIndex]에 저장된 value와 setState를 반환한다.
  - hookIndex를 1 증가시킨다.

  상태가 유지되는 이유:
  - App 함수는 매번 다시 실행되지만
  - hooks 배열은 FunctionComponent 인스턴스에 남아 있습니다.
  - 다음 렌더에서도 같은 index의 state hook을 다시 읽으므로 이전 상태를 이어받습니다.
*/
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

    /*
      setState의 역할:
      1. 다음 상태값 계산
      2. 값이 실제로 바뀌었는지 확인
      3. 바뀌었다면 hooks 배열의 값을 갱신
      4. update 예약

      즉 setState는 "값 저장"과 "재렌더 예약"을 함께 담당합니다.
    */
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

/*
  useMemo는 "파생 계산 결과"를 캐시하는 hook입니다.

  입력:
  - factory: 계산 함수
  - deps: 이 값들이 바뀌면 다시 계산할지 결정하는 기준 목록

  동작:
  - 이전 deps와 새 deps가 같으면 이전 value 재사용
  - 다르면 factory()를 다시 실행해 새 value 저장

  이 프로젝트에서 useMemo는:
  - 성장 단계(stageInfo)
  - 건강 상태(healthSummary)
  - 액션 핸들러 묶음(actionHandlers)
  에 사용됩니다.
*/
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

/*
  useEffect는 "부수 효과"를 처리하는 hook입니다.

  입력:
  - effect: patch 이후 실행할 함수
  - deps: 다시 실행할지 결정하는 기준 목록

  동작:
  - deps가 바뀌었는지 확인
  - 바뀌었으면 pendingEffects에 예약
  - 실제 실행은 flushEffects()가 담당

  이 프로젝트에서는 document.title 변경에 사용됩니다.
*/
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

/*
  deps 비교 함수입니다.

  왜 필요한가?
  - useMemo는 "다시 계산할지" 판단해야 합니다.
  - useEffect는 "다시 실행할지" 판단해야 합니다.

  비교 기준:
  - 길이가 다르면 false
  - 같은 위치 값 중 하나라도 다르면 false
  - 모두 같으면 true
*/
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

/*
  hooks 배열은 원본 그대로 보면 객체 덩어리라 읽기 어렵습니다.
  그래서 런타임 디버그 패널에서는 사람이 읽기 쉬운 문자열로 바꿔 보여줍니다.
*/
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

/*
  patch 객체를 길게 그대로 보여주면 디버그 화면이 너무 지저분해집니다.
  그래서 발표/학습용으로 짧은 설명 문자열로 요약합니다.
*/
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

/*
  App은 루트 컴포넌트입니다.

  과제 제약상:
  - 모든 state는 루트에서만 관리
  - hook은 루트에서만 사용
  - 자식 컴포넌트는 props-only 순수 함수

  따라서 App은
  - 원본 상태(beanState)를 들고
  - 파생값(stageInfo, healthSummary)을 계산하고
  - 자식에게 props를 내려보내는
  중심 역할을 합니다.
*/
function App() {
  const [beanState, setBeanState] = useState(createInitialBeanState);

  // growth 값으로 현재 성장 단계 정보를 계산합니다.
  const stageInfo = useMemo(function () {
    return getStageInfo(beanState);
  }, [beanState.growth]);

  // 자원 상태를 바탕으로 건강 상태 문구를 계산합니다.
  const healthSummary = useMemo(function () {
    return getHealthSummary(beanState);
  }, [beanState.water, beanState.sunlight, beanState.nutrition]);

  /*
    버튼 핸들러를 useMemo로 묶는 이유:
    - 렌더마다 새 함수가 생기면 버튼 onClick props도 계속 달라질 수 있습니다.
    - 그러면 diff가 버튼 props까지 자주 바뀐 것으로 볼 수 있습니다.
    - actionHandlers 객체를 한 번 만들고 재사용하면 함수 참조를 더 안정적으로 유지할 수 있습니다.
  */
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

  /*
    useEffect 예시:
    - 날짜가 바뀌거나(stageInfo.name 포함)
    - 단계 이름이 바뀌면
    - 문서 제목을 새 상태에 맞게 갱신합니다.
  */
  useEffect(function () {
    document.title = 'Day ' + beanState.day + ' · ' + stageInfo.name + ' · Bean Lab';
  }, [beanState.day, stageInfo.name]);

  const runtimeDebug = currentComponent.debug;

  /*
    effect는 patch 뒤에 실행되기 때문에,
    디버그 패널에 "방금 렌더에서 실행 예정인 effect"를 바로 보여주려면
    pendingEffects.length를 미리 반영한 표시용 객체가 필요합니다.
  */
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
      h(ActionButton, { label: '영양 공급 🍀', variant: 'nutrition', onClick: actionHandlers.nutrition }),
      h(ActionButton, { label: '하루 보내기 ⏳', variant: 'day', onClick: actionHandlers.day }),
      h(ActionButton, { label: '수확하기 🌾', variant: 'harvest', onClick: actionHandlers.harvest }),
      h(ActionButton, { label: '테스트하기 🔍', variant: 'probe', onClick: actionHandlers.probe })
    )
  );
}

const appElement = document.getElementById('app');

if (!appElement) {
  throw new Error('#app 컨테이너를 찾을 수 없습니다.');
}

const app = new FunctionComponent(App, {}, appElement);
app.mount();
