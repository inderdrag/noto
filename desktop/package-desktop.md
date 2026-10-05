# Noto — Desktop & Mobile Build Architecture

Noto — это полноценное настольное и мобильное приложение.
Архитектура спроектирована по принципу **Cross-Platform Standalone Native Container**:

1. **Core Business & Drawing Engine**: 100% независим от браузера.
   - Чистая векторная математика (Безье, сплайны, Catmull-Rom).
   - Поддержка PointerEvents и аппаратного давления стилуса (`pressure`).
   - Локальная база данных IndexedDB с мгновенной персистентностью.
   - Собственный бинарный/JSON формат документов `.noto`.

2. **Windows Desktop Compilation (`Noto.exe`)**:
   - Приложение упаковывается через **Tauri v2** или **Electron**.
   - **Tauri** использует легковесный нативный WebView2 движок Windows (~8-15 MB инсталлятор Noto.exe вместо 150 MB у тяжелых веб-оберток), прямые системные вызовы Rust к Win32 API, интеграцию в меню «Пуск», рабочий стол и системный трей.
   - Для сборки Windows .exe:
     ```bash
     npm install -D @tauri-apps/cli
     npx tauri build
     # Результат: target/release/bundle/nsis/Noto_x64_en-US.exe
     ```

3. **Android & iOS Applications**:
   - Та же кодовая база ядра упаковывается через **Capacitor / Tauri Mobile**.
   - Прямой доступ к Samsung S-Pen API, Apple Pencil (через W3C PointerEvents Level 3 с поддержкой tilt, pressure, twist), системным файловым диалогам iOS Files / Android Storage Access Framework.
   - Сборка Android APK:
     ```bash
     npx cap add android
     npx cap build android
     # Результат: Noto.apk
     ```

4. **Формат `.noto`**:
   - Полностью переносимый файл, хранящий все векторные слои, давление штрихов, шрифты и изображения. Не растровый снимок, а полноценный векторный проект.
