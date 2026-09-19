---
name: frontend-fundamentals
description: Use when a frontend change needs a code-quality decision about readability, predictability, cohesion, or coupling.
---

# Frontend Fundamentals

이 skill은 프론트엔드 코드 품질 판단을 위한 router입니다. 일반적인 코드 작성 지시가 아니며, 변경에 실제로 관련된 기준만 추가로 읽습니다.

## 읽는 순서

요청을 읽고 아래 기준 중 관련된 항목만 고릅니다. 모든 기준과 하위 문서를 한 번에 읽지 않습니다.

- [가독성](../readability/SKILL.md): 코드를 읽고 동작을 이해하기 쉽게 만듭니다.
- [예측 가능성](../predictability/SKILL.md): 이름과 계약만으로 동작을 예상할 수 있게 합니다.
- [응집도](../cohesion/SKILL.md): 함께 바뀌는 코드를 함께 관리합니다.
- [결합도](../coupling/SKILL.md): 수정의 영향 범위를 줄입니다.

## 선택 기준

| 변경 상황 | 읽을 문서 |
| --- | --- |
| 조건문, 분기, 추상화, 이름, 렌더링 흐름을 이해하기 어려움 | `readability` |
| 함수·컴포넌트의 이름, 반환 값, 숨은 동작이 헷갈림 | `predictability` |
| 함께 바뀌어야 할 파일·상수·폼이 흩어져 있음 | `cohesion` |
| 책임, 중복, Props 전달 때문에 수정 영향 범위가 커짐 | `coupling` |

판단이 두 기준에 걸리면 두 category skill만 읽습니다. category skill을 읽은 뒤에도 실제 판단이 필요할 때만 연결된 `references/*.md`를 엽니다.

## 기준 사이의 균형

네 기준을 항상 동시에 최대로 만들 수는 없습니다. 공통화와 추상화는 응집도를 높일 수 있지만 가독성을 낮출 수 있고, 중복을 허용하면 결합도를 낮출 수 있지만 응집도를 낮출 수 있습니다.

함께 수정되지 않으면 오류가 생길 위험이 높은 경우에는 응집도를 우선하고, 위험이 낮은 경우에는 가독성을 위해 중복을 허용할 수 있습니다. 현재 상황에서 장기적으로 수정하기 쉬운 선택이 무엇인지 판단합니다.

출처: [toss/frontend-fundamentals](https://github.com/toss/frontend-fundamentals/tree/main/fundamentals/code-quality/code)
