---
name: readability
description: Use when a frontend change needs a readability decision about flow, abstraction, naming, or conditional rendering.
---

# 1. 가독성

조건문과 분기가 섞였거나, 구현 상세가 화면의 의도를 가릴 때 이 skill을 읽습니다. 아래 하위 문서는 실제로 해당 문제가 있을 때만 엽니다.

**가독성**(Readability)은 코드가 읽기 쉬운 정도를 말해요.
코드가 변경하기 쉬우려면 먼저 코드가 어떤 동작을 하는지 이해할 수 있어야 해요.

읽기 좋은 코드는 읽는 사람이 한 번에 머릿속에서 고려하는 맥락이 적고, 위에서 아래로 자연스럽게 이어져요.

### 가독성을 높이는 전략

- **맥락 줄이기**
  - [같이 실행되지 않는 코드 분리하기](./references/submit-button.md)
  - [구현 상세 추상화하기](./references/login-start-page.md)
  - [로직 종류에 따라 합쳐진 함수 쪼개기](./references/use-page-state-readability.md)
- **이름 붙이기**
  - [복잡한 조건에 이름 붙이기](./references/condition-name.md)
  - [매직 넘버에 이름 붙이기](./references/magic-number-readability.md)
- **위에서 아래로 읽히게 하기**
  - [시점 이동 줄이기](./references/user-policy.md)
  - [삼항 연산자 단순하게 하기](./references/ternary-operator.md)
