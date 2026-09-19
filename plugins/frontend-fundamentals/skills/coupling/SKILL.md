---
name: coupling
description: Use when a frontend change needs a coupling decision about responsibility, duplication, or prop flow.
---

# 4. 결합도

한 부분을 수정했을 때 영향 범위가 넓거나, 책임·중복·Props 전달을 줄일 방법을 판단할 때 이 skill을 읽습니다. 아래 하위 문서는 실제로 해당 문제가 있을 때만 엽니다.

**결합도**(Coupling)란, 코드를 수정했을 때의 영향범위를 말해요.
코드를 수정했을 때 영향범위가 적어서, 변경에 따른 범위를 예측할 수 있는 코드가 수정하기 쉬운 코드예요.

### 결합도를 낮추는 전략

- [책임을 하나씩 관리하기](./references/use-page-state-coupling.md)
- [중복 코드 허용하기](./references/use-bottom-sheet.md)
- [Props Drilling 지우기](./references/item-edit-modal.md)
