---
name: cohesion
description: Use when a frontend change needs a cohesion decision about code that should change together.
---

# 3. 응집도

함께 수정되어야 할 파일·상수·폼이 흩어져 있거나, 공통화 여부를 판단할 때 이 skill을 읽습니다. 아래 하위 문서는 실제로 해당 문제가 있을 때만 엽니다.

**응집도**(Cohesion)란, 수정되어야 할 코드가 항상 같이 수정되는지를 말해요.
응집도가 높은 코드는 코드의 한 부분을 수정해도 의도치 않게 다른 부분에서 오류가 발생하지 않아요.
함께 수정되어야 할 부분이 반드시 함께 수정되도록 구조적으로 뒷받침되기 때문이죠.

::: info 가독성과 응집도는 서로 상충할 수 있어요

일반적으로 응집도를 높이기 위해서는 변수나 함수를 추상화하는 등 가독성을 떨어뜨리는 결정을 해야 해요.
함께 수정되지 않으면 오류가 발생할 수 있는 경우에는, 응집도를 우선해서 코드를 공통화, 추상화하세요.
위험성이 높지 않은 경우에는, 가독성을 우선하여 코드 중복을 허용하세요.

:::

### 응집도를 높이는 전략

- [함께 수정되는 파일을 같은 디렉토리에 두기](./references/code-directory.md)
- [매직 넘버 없애기](./references/magic-number-cohesion.md)
- [폼의 응집도 생각하기](./references/form-fields.md)
