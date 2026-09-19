---
name: predictability
description: Use when a frontend change needs a predictability decision about names, return values, or hidden behavior.
---

# 2. 예측 가능성

이름과 함수 계약만으로 동작을 예상하기 어렵거나, 숨은 부수효과가 의심될 때 이 skill을 읽습니다. 아래 하위 문서는 실제로 해당 문제가 있을 때만 엽니다.

**예측 가능성**(Predictability)이란, 함께 협업하는 동료들이 함수나 컴포넌트의 동작을 얼마나 예측할 수 있는지를 말해요.
예측 가능성이 높은 코드는 일관적인 규칙을 따르고, 함수나 컴포넌트의 이름과 파라미터, 반환 값만 보고도 어떤 동작을 하는지 알 수 있어요.

### 예측 가능성을 높이는 전략

- [이름 겹치지 않게 관리하기](./references/http.md)
- [같은 종류의 함수는 반환 타입 통일하기](./references/use-user.md)
- [숨은 로직 드러내기](./references/hidden-logic.md)
