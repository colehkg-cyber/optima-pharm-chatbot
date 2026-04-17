"""
4단계: 추출 텍스트를 청크로 나누고 메타데이터 붙이기
Google Document AI로 추출된 JSON 파일을 읽어,
의미 있는 단위(청크)로 나누고 메타데이터를 추가합니다.
임베딩 생성 및 DB 저장은 다음 단계에서 진행합니다.

사용법:
  python scripts/chunk_and_embed.py --test    # 테스트 모드 (첫 번째 파일만)
  python scripts/chunk_and_embed.py           # 전체 처리 (모든 JSON 파일)
"""
import os
import json
import re
import uuid # 청크 고유 ID 생성
import argparse
from pathlib import Path
from dotenv import load_dotenv

# .env.local에서 환경변수 읽기 (추후 임베딩 키 필요)
load_dotenv(Path(__file__).parent.parent / '.env.local')

# 파일 경로 설정
PROCESSED_DIR = Path(__file__).parent.parent / 'data' / 'processed'
CHUNKS_DIR = Path(__file__).parent.parent / 'data' / 'chunks'
CHUNKS_DIR.mkdir(parents=True, exist_ok=True)

# 청킹 설정값
MAX_CHUNK_CHARS = 1024 * 2 # 대략 1024 토큰 = 2000자 (안전하게 2배로 잡음)
OVERLAP_CHARS = int(MAX_CHUNK_CHARS * 0.15) # 15% 오버랩

# TODO: 토크나이저 설치 후 정확한 토큰 기준으로 청킹 변경

def is_section_title(line: str) -> bool:
    """문자열이 섹션 제목인지 판단합니다."""
    return bool(re.match(r'^(#|##|###|####)\s', line.strip()))

def is_table_start(line: str) -> bool:
    """문자열이 마크다운 표의 시작 부분인지 판단합니다."""
    # 간단히 '|'와 '---' 패턴으로 표 시작을 감지
    return bool(re.match(r'^\|.*\|\n\|[-=]+\s*\|.*', line.strip()))

def is_warning_phrase(text: str) -> bool:
    """텍스트에 경고 관련 키워드가 포함되어 있는지 판단합니다."""
    warning_keywords = ['주의', '경고', '금기', '부작용', '상호작용', '임산부', '수유부', '소아', '어린이', '섭취 제한', '부작용', '의사', '상담', '병원']
    return any(keyword in text for keyword in warning_keywords)

def smart_chunking(doc_data: dict) -> list:
    """
    구조적 청킹 전략:
    - 페이지, 섹션, 문단 경계를 우선으로 합니다.
    - 표, 경고문은 통째로 유지하려 노력합니다.
    - 너무 길면 최대 MAX_CHUNK_CHARS 기준으로 분리하고 OVERLAP을 줍니다.
    """
    
    all_chunks = []
    current_section_title = None
    doc_name = doc_data['filename']

    # 모든 페이지의 텍스트를 하나의 리스트로 합치고, 각 라인에 페이지 정보 부여
    all_lines_with_page_info = []
    for page_data in doc_data['pages']:
        page_num = page_data['page_number']
        page_text = page_data['text']
        
        # Document AI의 테이블 정보를 활용하여 테이블 청킹
        tables_on_page = page_data.get('tables', [])
        
        lines_on_page = page_text.split('\n')
        for line_idx, line in enumerate(lines_on_page):
            all_lines_with_page_info.append({
                'content': line,
                'page_num': page_num,
                'is_table_line': any("\n".join(["|".join(row) for row in table]) in line for table in tables_on_page),
                'is_warning_line': is_warning_phrase(line)
            })

    current_chunk_lines = []
    current_chunk_page_num = None
    
    for i, line_info in enumerate(all_lines_with_page_info):
        line = line_info['content'].strip()
        page_num = line_info['page_num']
        is_table_line = line_info['is_table_line']
        is_warning_line = line_info['is_warning_line']

        if not line: # 빈 줄은 스킵
            continue
            
        # 섹션 제목 업데이트
        if is_section_title(line):
            current_section_title = line.replace('#', '').strip()

        # 현재 청크가 너무 길거나 (오버랩 고려) 새로운 섹션/페이지가 시작되면 청크를 마무리합니다.
        # 단, 표나 경고문은 중간에 자르지 않도록 합니다.
        can_break_here = not is_table_line and not is_warning_line # 여기서 끊어도 되는지

        # 현재 청크에 추가했을 때 MAX_CHUNK_CHARS를 초과하는 경우
        if current_chunk_lines and (len("\n".join(current_chunk_lines + [line])) > MAX_CHUNK_CHARS) and can_break_here:
            # 현재까지 모은 청크 저장
            chunk_content = "\n".join(current_chunk_lines).strip()
            if chunk_content:
                all_chunks.append({
                    'content': chunk_content,
                    'metadata': {
                        'doc_name': doc_name,
                        'page_number': current_chunk_page_num, # 청크 시작 페이지 기준
                        'section_title': current_section_title,
                        'is_table': False, # 이 청크에 표가 완전히 담겼는지 여부 (더 정확한 로직 필요)
                        'is_warning': is_warning_phrase(chunk_content),
                        'chunk_id': str(uuid.uuid4())
                    }
                })
            
            # 오버랩 적용: 이전 청크의 끝 부분을 새 청크의 시작 부분에 포함
            overlap_content = "\n".join(current_chunk_lines[-int(len(current_chunk_lines) * (OVERLAP_CHARS / MAX_CHUNK_CHARS)):]).strip()
            current_chunk_lines = [overlap_content] if overlap_content else []
            current_chunk_page_num = page_num # 새 청크는 현재 페이지부터 시작
        
        current_chunk_lines.append(line)
        if current_chunk_page_num is None: # 첫 청크의 페이지 번호 설정
            current_chunk_page_num = page_num
        
    # 마지막 남은 청크 저장
    if current_chunk_lines:
        chunk_content = "\n".join(current_chunk_lines).strip()
        if chunk_content:
            all_chunks.append({
                'content': chunk_content,
                'metadata': {
                    'doc_name': doc_name,
                    'page_number': current_chunk_page_num,
                    'section_title': current_section_title,
                    'is_table': False,
                    'is_warning': is_warning_phrase(chunk_content),
                    'chunk_id': str(uuid.uuid4())
                }
            })

    return all_chunks

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--test', action='store_true', help='테스트 모드 (첫 번째 파일만)')
    args = parser.parse_args()
    
    processed_files = sorted(PROCESSED_DIR.glob('*.json'))
    if not processed_files:
        print(f"❌ 처리할 PDF 추출 JSON 파일을 찾을 수 없습니다: {PROCESSED_DIR}")
        print("   3단계 extract_pdf.py를 먼저 실행해야 합니다.")
        return

    target_files = processed_files[:1] if args.test else processed_files
    
    print("=== 4단계: 텍스트 청킹 시작 ===\n")
    
    for target_file in target_files:
        print(f"📄 JSON 파일 처리 중: {target_file.name}")
        with open(target_file, 'r', encoding='utf-8') as f:
            doc_data = json.load(f)
            
        chunks = smart_chunking(doc_data)
        
        output_file_path = CHUNKS_DIR / f"{target_file.stem}_chunks.json"
        with open(output_file_path, 'w', encoding='utf-8') as f:
            json.dump(chunks, f, ensure_ascii=False, indent=2)
        
        print(f"  ✅ {len(chunks)}개 청크 저장 완료: {output_file_path.name}")
        
        if args.test:
            print("\n--- 청크 샘플 미리보기 (첫 5개) ---")
            for i, chunk in enumerate(chunks[:5]):
                print(f"--- 청크 {i+1} ---")
                print(f"메타데이터: {chunk['metadata']}")
                print(f"내용 ({len(chunk['content'])}자): {chunk['content'][:500]}...")
                print()
            break

    print("\n=== 4단계 완료 ===\n")
    print(f"📁 청크 저장 위치: {CHUNKS_DIR}")

if __name__ == "__main__":
    main()
