"""
5단계: 청크 데이터를 임베딩하여 Supabase pgvector에 저장
- data/chunks/ 폴더의 JSON 파일들을 읽습니다.
- OpenAI 임베딩 API를 사용하여 텍스트를 숫자로 변환합니다.
- Supabase의 document_chunks 테이블에 저장합니다.
"""
import os
import json
import time
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client
from tqdm import tqdm

# .env.local에서 환경변수 읽기
load_dotenv(Path(__file__).parent.parent / '.env.local')

# 설정값 읽기
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'text-embedding-3-small')
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# 파일 경로 설정
CHUNKS_DIR = Path(__file__).parent.parent / 'data' / 'chunks'

def check_config():
    """필요한 설정값이 있는지 확인"""
    required = [
        ('OPENAI_API_KEY', OPENAI_API_KEY),
        ('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL),
        ('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_KEY)
    ]
    
    missing = [name for name, val in required if not val or 'your-' in str(val)]
    if missing:
        print(f"❌ 설정 오류: 아래 항목들을 .env.local에 입력해주세요.\n   {', '.join(missing)}")
        return False
    return True

def get_supabase_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def get_openai_client() -> OpenAI:
    return OpenAI(api_key=OPENAI_API_KEY)

def process_and_upload():
    if not check_config():
        return

    supabase = get_supabase_client()
    openai = get_openai_client()

    chunk_files = sorted(CHUNKS_DIR.glob('*_chunks.json'))
    if not chunk_files:
        print(f"❌ 처리할 청크 파일을 찾을 수 없습니다: {CHUNKS_DIR}")
        return

    print(f"🚀 총 {len(chunk_files)}개 파일의 데이터를 Supabase에 업로드 시작합니다.")

    for file_path in chunk_files:
        print(f"\n📄 처리 중: {file_path.name}")
        with open(file_path, 'r', encoding='utf-8') as f:
            chunks = json.load(f)

        # 이미 업로드된 데이터인지 확인하는 로직은 생략 (전체 재업로드 기준)
        
        # 10개씩 묶어서 배치 처리 (API 효율성)
        batch_size = 20
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]
            
            # 1. 임베딩 생성
            texts = [c['content'] for c in batch]
            try:
                response = openai.embeddings.create(
                    input=texts,
                    model=EMBEDDING_MODEL
                )
                embeddings = [e.embedding for e in response.data]
                
                # 2. Supabase 저장용 데이터 준비
                to_insert = []
                for j, chunk in enumerate(batch):
                    to_insert.append({
                        "content": chunk['content'],
                        "metadata": chunk['metadata'],
                        "embedding": embeddings[j]
                    })
                
                # 3. Supabase 업로드
                supabase.table("document_chunks").insert(to_insert).execute()
                print(f"   ✅ {i + len(batch)}/{len(chunks)} 청크 완료...", end='\r')
                
            except Exception as e:
                print(f"\n   ❌ 오류 발생 (배치 {i//batch_size + 1}): {e}")
                time.sleep(2)
        
        print(f"\n   ✨ {file_path.name} 업로드 완료!")

    print("\n🎉 모든 데이터가 Supabase 스마트 도서관에 저장되었습니다!")

if __name__ == "__main__":
    process_and_upload()
