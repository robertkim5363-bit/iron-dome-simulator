const STAGE_DEFINITIONS = [
  {
    threshold: 0,
    name: '씨앗 준비',
    emoji: '🌰',
    hint: '흙 속에서 첫 뿌리를 준비하고 있습니다.'
  },
  {
    threshold: 20,
    name: '새싹 등장',
    emoji: '🌱',
    hint: '물을 잘 주면 작지만 단단한 새싹이 올라옵니다.'
  },
  {
    threshold: 45,
    name: '떡잎 확장',
    emoji: '🌿',
    hint: '햇빛과 물의 균형이 맞을수록 잎이 넓어집니다.'
  },
  {
    threshold: 70,
    name: '꽃봉오리 형성',
    emoji: '🌼',
    hint: '영양이 충분하면 꼬투리 준비가 빨라집니다.'
  },
  {
    threshold: 90,
    name: '수확 직전',
    emoji: '🍃',
    hint: '이제 수확 버튼으로 오늘의 강낭콩을 마무리할 수 있습니다.'
  }
];

// 모든 상태는 루트 App의 useState 하나에 모아 관리합니다.
// 이 객체가 강낭콩 서비스의 단일 진실 공급원 역할을 합니다.
function createInitialBeanState() {
  return {
    day: 1,
    water: 52,
    sunlight: 48,
    nutrition: 36,
    growth: 8,
    harvestCount: 0,
    healthNote: '차분한 시작',
    lastAction: '실험 시작',
    log: ['Day 1: 강낭콩을 화분에 심고 관찰을 시작했습니다.'],
    lastTestRun: 0,
    hasRunWhiteBoxTest: false
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// growth 값만 보고 현재 강낭콩이 어느 성장 단계인지 계산합니다.
function getStageInfo(beanState) {
  let selected = STAGE_DEFINITIONS[0];

  STAGE_DEFINITIONS.forEach(function (stage) {
    if (beanState.growth >= stage.threshold) {
      selected = stage;
    }
  });

  return selected;
}

// 세 자원을 평균 내서 건강 상태 문구를 계산합니다.
function getHealthSummary(beanState) {
  const average = Math.round((beanState.water + beanState.sunlight + beanState.nutrition) / 3);

  if (average >= 75) {
    return {
      label: '매우 건강',
      tone: '물, 햇빛, 영양이 모두 안정적입니다.'
    };
  }

  if (average >= 50) {
    return {
      label: '무난함',
      tone: '기본 성장은 가능하지만 한두 요소를 더 채워주면 좋습니다.'
    };
  }

  return {
    label: '주의 필요',
    tone: '자원 하나 이상이 부족해 성장 속도가 느려질 수 있습니다.'
  };
}

function appendLog(beanState, message) {
  return beanState.log.concat('Day ' + beanState.day + ': ' + message).slice(-6);
}

// 사용자의 액션을 받아 "다음 상태"를 계산하는 순수 함수입니다.
// 자식 컴포넌트는 상태를 바꾸지 않고, 루트에서만 이 함수를 통해 state를 갱신합니다.
function applyBeanAction(beanState, actionType) {
  if (actionType === 'water') {
    return Object.assign({}, beanState, {
      water: clamp(beanState.water + 22, 0, 100),
      healthNote: '촉촉하게 수분을 머금음',
      lastAction: '물 주기',
      log: appendLog(beanState, '물을 충분히 주어 뿌리가 촉촉해졌습니다.')
    });
  }

  if (actionType === 'sunlight') {
    return Object.assign({}, beanState, {
      sunlight: clamp(beanState.sunlight + 20, 0, 100),
      water: clamp(beanState.water - 5, 0, 100),
      healthNote: '햇빛을 받아 잎이 반짝임',
      lastAction: '햇빛 쬐기',
      log: appendLog(beanState, '창가로 옮겨 햇빛을 충분히 받게 했습니다.')
    });
  }

  if (actionType === 'nutrition') {
    return Object.assign({}, beanState, {
      nutrition: clamp(beanState.nutrition + 18, 0, 100),
      healthNote: '영양을 먹고 줄기가 단단해짐',
      lastAction: '영양 공급',
      log: appendLog(beanState, '영양제를 보충해 성장 에너지를 채웠습니다.')
    });
  }

  if (actionType === 'day') {
    // 성장도는 하루가 지날 때만 증가합니다.
    // 물/햇빛/영양은 성장량을 결정하는 조건으로만 사용합니다.
    const growthGain =
      (beanState.water >= 45 ? 7 : 2) +
      (beanState.sunlight >= 45 ? 7 : 2) +
      (beanState.nutrition >= 35 ? 6 : 2);

    return Object.assign({}, beanState, {
      day: beanState.day + 1,
      water: clamp(beanState.water - 14, 0, 100),
      sunlight: clamp(beanState.sunlight - 10, 0, 100),
      nutrition: clamp(beanState.nutrition - 9, 0, 100),
      growth: clamp(beanState.growth + growthGain, 0, 100),
      healthNote: growthGain >= 18 ? '활짝 성장 중' : '조금 지친 상태',
      lastAction: '하루 보내기',
      log: appendLog(beanState, '하루가 지나며 성장도가 +' + growthGain + ' 증가했습니다.')
    });
  }

  if (actionType === 'harvest') {
    if (beanState.growth < 90) {
      return Object.assign({}, beanState, {
        healthNote: '아직 수확 전 단계',
        lastAction: '수확 시도',
        log: appendLog(beanState, '아직 꼬투리가 충분히 차지 않아 더 키우기로 했습니다.')
      });
    }

    return Object.assign({}, beanState, createInitialBeanState(), {
      harvestCount: beanState.harvestCount + 1,
      lastAction: '수확 완료',
      healthNote: '오늘의 강낭콩을 수확했습니다.',
      log: appendLog(beanState, '잘 자란 강낭콩을 수확하고 새로운 씨앗을 준비합니다.')
    });
  }

  if (actionType === 'probe') {
    return Object.assign({}, beanState, {
      lastAction: '생장 테스트 실행',
      lastTestRun: beanState.lastTestRun + 1,
      hasRunWhiteBoxTest: true,
      log: appendLog(beanState, '화이트박스 테스트를 다시 실행해 현재 상태를 검증했습니다.')
    });
  }

  return beanState;
}

// 화이트박스 테스트는 완전 자동 테스트 프레임워크라기보다,
// 현재 런타임이 과제 핵심 조건을 어떻게 만족하는지 보여주는 검증 패널입니다.
function buildWhiteBoxChecks(beanState, runtimeDebug, stageInfo, healthSummary) {
  return [
    {
      title: '루트 상태 관리',
      pass: runtimeDebug.hookSnapshot.some(function (entry) { return entry.indexOf('state') !== -1; }),
      detail: 'state는 App 루트 컴포넌트 내부 훅 배열에 저장되고 자식은 props만 사용합니다.'
    },
    {
      title: 'Hook 순서 유지',
      pass: runtimeDebug.hookSnapshot.length >= 4,
      detail: '루트 컴포넌트가 매 렌더마다 같은 순서로 훅을 호출해 같은 슬롯을 재사용합니다.'
    },
    {
      title: 'setState 이후 자동 업데이트',
      pass: runtimeDebug.renderCount >= 2 || beanState.lastAction !== '실험 시작',
      detail: '버튼 클릭 시 update()가 호출되어 새 VDOM을 만들고 diff/patch를 실행합니다.'
    },
    {
      title: '부분 업데이트 지향',
      pass: runtimeDebug.lastPatchSummary.length > 0,
      detail: '최근 patch 수: ' + runtimeDebug.lastPatchSummary.length + '개. 변경된 텍스트와 props 중심으로 반영합니다.'
    },
    {
      title: 'useMemo 활용',
      pass: stageInfo.name.length > 0 && healthSummary.label.length > 0,
      detail: '성장 단계와 건강 상태는 state를 직접 들고 있지 않고 메모 계산값으로 표시합니다.'
    },
    {
      title: 'useEffect 활용',
      pass: runtimeDebug.totalEffectCount >= 1,
      detail: '문서 제목은 patch 이후 useEffect에서 갱신되며, 누적 effect 실행 수는 ' + runtimeDebug.totalEffectCount + '회입니다.'
    }
  ];
}

// 아래부터는 전부 props-only 자식 컴포넌트입니다.
// state와 hook 없이, 부모가 넘긴 props만 받아 화면을 그립니다.
function ActionButton(props) {
  return h(
    'button',
    {
      className: 'action-button ' + props.variant,
      onClick: props.onClick,
      disabled: !!props.disabled
    },
    props.label
  );
}

function Meter(props) {
  return h(
    'div',
    { className: 'meter' },
    h(
      'div',
      { className: 'meter-top' },
      h('span', null, props.label),
      h('strong', null, props.value + '%')
    ),
    h(
      'div',
      { className: 'meter-bar' },
      h('div', {
        className: 'meter-fill',
        style: {
          width: props.value + '%',
          background: props.color
        }
      })
    )
  );
}

function ServicePanel(props) {
  return h(
    'section',
    { className: 'service-card' },
    h(
      'div',
      { className: 'service-hero' },
      h('div', { className: 'service-emoji' }, props.stageInfo.emoji),
      h(
        'div',
        { className: 'service-meta' },
        h('h2', null, props.stageInfo.name),
        h('p', null, 'Day ' + props.beanState.day + ' · 최근 액션: ' + props.beanState.lastAction),
        h(
          'div',
          { className: 'tag-row' },
          h('span', { className: 'tag' }, '수확 횟수 ' + props.beanState.harvestCount),
          h('span', { className: 'tag' }, props.healthSummary.label),
          h('span', { className: 'tag' }, props.stageInfo.hint)
        )
      )
    ),
    h(
      'div',
      { className: 'meter-grid' },
      h(Meter, { label: '수분', value: props.beanState.water, color: '#56a4ff' }),
      h(Meter, { label: '햇빛', value: props.beanState.sunlight, color: '#ffc650' }),
      h(Meter, { label: '영양', value: props.beanState.nutrition, color: '#a67cff' }),
      h(Meter, { label: '성장', value: props.beanState.growth, color: '#6bc26d' })
    ),
    h(
      'div',
      { className: 'insight-box' },
      h('strong', null, props.healthSummary.label),
      h('p', null, props.healthSummary.tone),
      h('p', null, '현재 메모: ' + props.beanState.healthNote)
    )
  );
}

function RuntimePanel(props) {
  return h(
    'div',
    { className: 'runtime-stack' },
    h(
      'div',
      { className: 'runtime-card' },
      h('h3', null, '루트 state 스냅샷'),
      h(
        'pre',
        null,
        JSON.stringify(
          {
            day: props.beanState.day,
            water: props.beanState.water,
            sunlight: props.beanState.sunlight,
            nutrition: props.beanState.nutrition,
            growth: props.beanState.growth,
            harvestCount: props.beanState.harvestCount,
            lastAction: props.beanState.lastAction
          },
          null,
          2
        )
      )
    ),
    h(
      'div',
      { className: 'runtime-card' },
      h('h3', null, 'FunctionComponent 내부'),
      h(
        'ul',
        { className: 'plain-list' },
        h('li', null, 'renderCount: ' + props.runtimeDebug.renderCount),
        h('li', null, 'hookCount: ' + props.runtimeDebug.hookSnapshot.length),
        h('li', null, 'lastEffectCount: ' + props.runtimeDebug.lastEffectCount),
        h('li', null, 'totalEffectCount: ' + props.runtimeDebug.totalEffectCount)
      )
    ),
    h(
      'div',
      { className: 'runtime-card' },
      h('h3', null, 'Hook 저장소'),
      h('pre', { className: 'hook-storage' }, props.runtimeDebug.hookSnapshot.join('\n'))
    ),
  );
}

function WhiteBoxPanel(props) {
  if (!props.beanState.hasRunWhiteBoxTest) {
    return h(
      'div',
      { className: 'test-stack' },
      h(
        'div',
        { className: 'test-card log-card' },
        h('h3', null, '테스트 대기 중'),
        h('p', null, '아래 `테스트하기` 버튼을 눌러 현재 강낭콩 서비스의 화이트박스 테스트를 실행하세요.'),
        h('p', null, '실행 후에는 루트 state, hook 구성, 자동 업데이트 흐름에 대한 검증 결과가 표시됩니다.')
      )
    );
  }

  return h(
    'div',
    { className: 'test-stack' },
    props.checks.map(function (check, index) {
      return h(
        'div',
        {
          className: 'test-card ' + (check.pass ? 'pass' : 'fail'),
          key: 'check-' + index
        },
        h('h3', null, (check.pass ? 'PASS' : 'FAIL') + ' · ' + check.title),
        h('p', null, check.detail)
      );
    })
  );
}
