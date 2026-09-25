# Bonus 03: Events với EventEmitter

> Tiên quyết: Lesson 05

* Event-driven là gì? Vì sao nên tách logic bằng event
* Cài đặt `@nestjs/event-emitter`
* Emit event và lắng nghe với `@OnEvent()`
* Async listener, wildcard event
* Ví dụ: user đăng ký → gửi mail chào mừng (Lesson 14)
* Giới hạn của event in-process (mất khi app restart) → dẫn tới Queue ở Bonus 04
