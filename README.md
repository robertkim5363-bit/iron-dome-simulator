# Iron Dome Defense Simulator

'아이언돔 방공 시뮬레이터'

**바닐라 자바스크립트**로 직접 만든 **커스텀 Virtual DOM 엔진**이, 이렇게 **복잡하고 무거운 상태(State) 기반 인터페이스를 완벽하게 감당**할 수 있다.


## 왜 이 프로젝트가 과제에 맞는가


### 1. 커스텀 렌더러가 실제 화면을 움직입니다

`FunctionComponent`, `useState`, `useEffect`, `useMemo`, `createVNode`, `diff`, `applyPatch`를 직접 구현했고, 그 흐름이 그대로 시뮬레이터 UI를 구동합니다.

```mermaid
flowchart LR
    A["FunctionComponent<br/>컴포넌트 실행, hook 순서를 유지"] --> B["useState / useEffect / useMemo<br/>상태 저장·효과·계산 관리"]
    B --> C["createVNode<br/>가상 화면 생성"]
    C --> D["diff<br/>이전 화면과 비교"]
    D --> E["applyPatch<br/>바뀐 부분만 실제 DOM에 반영"]
    E --> F["Simulator UI<br/>National / Sector / 3D / Tests"]
```




### 2. 하나의 도형 데이터가 여러 역할을 수행합니다

섹터 화면에서 그린 폴리곤은 화면에만 그려지는 것이 아니라, 방어 판정 로직과 3D 방어 형상까지 동시에 결정합니다.

```mermaid
flowchart LR
    A["Sector에서 그린 폴리곤"] --> B["방어 로직 판정"]
    A --> C["3D 돔 / 기둥 형상"]
    A --> D["용량 및 breach 계산"]
```




### 3. 모든 화면이 하나의 상태를 공유합니다

National, Sector, 3D View, Tests, Briefing은 따로 노는 페이지가 아니라 같은 시뮬레이션 상태를 서로 다른 관점으로 보여줍니다.

## 시스템 구조

```mermaid
flowchart LR
    A["운용자 입력<br/>시나리오 시작<br/>섹터 그리기<br/>표적 배치"] --> B["공유 시뮬레이션 상태<br/>도시<br/>레이더 존<br/>미사일<br/>breach<br/>시간"]
    B --> C["커스텀 Virtual DOM 엔진<br/>createVNode<br/>diff<br/>applyPatch"]
    C --> D["National"]
    C --> E["Sector"]
    C --> F["3D View"]
    C --> G["Tests"]
    C --> H["Briefing"]
```
