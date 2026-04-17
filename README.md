# 정약국 AI 상담봇 (Optima Pharm Chatbot)

> 약사님이 주신 PDF 자료를 기반으로 약사님의 지식과 상담 스타일을 반영한 AI 상담봇

---

## ⚠️ 중요 안전 안내

이 서비스는 **정보 제공용**이며, 의료 진단이나 처방을 대체하지 않습니다.
- 본 서비스의 답변은 참고용 정보입니다.
- 최종 복약 결정은 반드시 담당 약사 또는 의사의 판단을 따르세요.
- 응급 상황 시 즉시 119에 연락하세요.

---

## 🏥 이 서비스는 무엇인가요?

약사님이 20년간 쌓은 건강기능식품/복약 지식을 PDF로 받아,
AI가 24시간 대신 상담해주는 서비스입니다.

**핵심 특징:**
- 자료 근거 없이는 답변하지 않습니다 (환각 방지)
- 모든 답변에 `참고 문서명 + 페이지` 출처를 표시합니다
- 위험 질문(임산부, 소아, 응급)은 자동으로 경고 문구를 추가합니다

---

## 📦 설치하기

### 필요한 것들
- Node.js 18 이상
- Python 3.9 이상
- Git

### 설치 명령어
```bash
git clone https://github.com/colehkg-cyber/optima-pharm-chatbot.git
cd optima-pharm-chatbot
npm install
pip install -r requirements.txt
```

---

## 🔑 필요한 API 키 목록

| API 키 | 용도 | 어디서 받나요 |
|--------|------|-------------|
| `GOOGLE_CLOUD_PROJECT_ID` | PDF 스캔 (Document AI) | console.cloud.google.com |
| `GOOGLE_DOCUMENT_AI_PROCESSOR_ID` | Document AI 처리기 ID | 구글 클라우드 콘솔 |
| `NEXT_PUBLIC_SUPABASE_URL` | 벡터 DB 주소 | supabase.com |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | DB 공개 접근 키 | supabase.com |
| `SUPABASE_SERVICE_ROLE_KEY` | DB 관리자 키 (서버만) | supabase.com |
| `ANTHROPIC_API_KEY` | Claude AI 답변 생성 | console.anthropic.com ✅ |
| `GOOGLE_GEMINI_API_KEY` | 임베딩 또는 답변 생성 | aistudio.google.com ✅ |

> `.env.example` 파일을 복사해서 `.env.local` 로 이름 바꾸고 값을 채워넣으세요.

---

## 🚀 실행하는 방법

### 1. 환경변수 설정
```bash
cp .env.example .env.local
# .env.local 파일을 열어서 API 키 값 입력
```

### 2. PDF 처리 (최초 1회)
```bash
python scripts/extract_pdf.py      # PDF → 텍스트 추출
python scripts/chunk_and_embed.py  # 텍스트 → 청크 + 임베딩
python scripts/upload_to_supabase.py  # DB에 저장
```

### 3. 웹 서버 실행
```bash
npm run dev
# http://localhost:3000 으로 접속
```

---

## 📁 폴더 구조

```
optima-pharm-chatbot/
├── data/
│   ├── raw/          # 원본 PDF 파일들 (약사님 자료)
│   └── processed/    # OCR 처리된 텍스트 파일들
├── scripts/          # PDF 처리 자동화 스크립트들
├── app/              # 웹 챗봇 화면 (Next.js)
│   ├── api/          # 서버 API (질문 처리, 검색)
│   ├── components/   # 화면 부품 (채팅창 등)
│   └── pages/        # 실제 페이지들
├── lib/              # 공통 기능 (DB 연결, AI 연결, 안전 필터)
└── docs/             # 개발 문서
```

---

## 🔄 데이터 처리 순서

```
PDF 파일 (data/raw/)
    ↓ [Google Document AI]
텍스트 추출 (data/processed/)
    ↓ [chunk_and_embed.py]
청크 분할 + 임베딩 변환
    ↓ [upload_to_supabase.py]
Supabase pgvector DB 저장
    ↓ [사용자 질문]
관련 청크 검색 (RAG)
    ↓ [Claude Haiku]
근거 기반 답변 생성
    ↓
출처 + 안전 문구 포함 답변 반환
```

---

## 🛡️ 안전 설계 원칙

1. **RAG 전용**: 자료 근거 없으면 "자료에 없습니다" 반환
2. **출처 표시**: 모든 답변에 문서명 + 페이지 표시
3. **위험 감지**: 임산부/소아/응급/금기 키워드 자동 감지 → 경고 추가
4. **진단 금지**: 병명 진단, 처방약 추천 자동 거부
5. **면책 문구**: 모든 답변 하단에 고정 안전 문구 포함

---

## 📋 TODO (개발 예정)

- [ ] 1단계: 프로젝트 구조 설계 ✅
- [ ] 2단계: Google Document AI 연결 준비
- [ ] 3단계: PDF 추출 스크립트 완성
- [ ] 4단계: 청킹 + 메타데이터 + 임베딩
- [ ] 5단계: Supabase pgvector 저장 + 검색 API
- [ ] 6단계: 챗봇 UI 완성

---

## 📞 문의
개발: colehkg-cyber | 운영: 옵티마 정약국
