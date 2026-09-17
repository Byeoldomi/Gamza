# 🥔 Gamza Market (감자마켓)

감자마켓은 Supabase와 바닐라 JavaScript/HTML/CSS로 구축된 지역 기반 중고거래 웹 애플리케이션입니다.

---

## 🌟 주요 기능

- **상품 목록 및 카테고리 필터링**: 전체, 디지털기기, 가구/인테리어, 의류, 식품 등 카테고리별 상품 필터링
- **실시간 검색 및 판매중 상품만 보기**: 키워드 검색 및 상태 필터
- **상품 상세 정보 조회**: 상품 이미지, 상태, 판매자 정보, 가격, 상세 설명 보기 및 좋아요/채팅 기능
- **상품 등록 및 수정**: 상품 이미지 Upload, 가격, 상태(판매중/예약중/거래 완료), 설명 입력
- **사용자 인증 (Supabase Auth)**: 회원가입, 로그인, 로그아웃 기능 지원

---

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend / Database**: [Supabase](https://supabase.com/) (Auth, Database, Storage)

---

## 🚀 시작하기

1. **저장소 클론**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Gamza.git
   cd Gamza
   ```

2. **환경 변수 설정**
   `.env.example` 파일을 참고하여 `.env` 파일을 생성하고 Supabase 자격 증명을 설정합니다.
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **실행**
   `index.html` 파일을 브라우저에서 열어 실행합니다.

---

## 📄 라이선스

MIT License
