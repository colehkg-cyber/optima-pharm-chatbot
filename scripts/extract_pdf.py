"""
3단계: PDF 전체 추출 스크립트 (30페이지씩 배치 처리)
"""
import os
import json
import time
import argparse
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

import fitz  # PyMuPDF
from google.cloud import documentai_v1 as documentai
from dotenv import load_dotenv

load_dotenv('/Users/anhyunjun/.openclaw/workspace/optima-pharm-chatbot/.env.local')

PROJECT_ID = os.getenv('GOOGLE_CLOUD_PROJECT_ID')
LOCATION = os.getenv('GOOGLE_CLOUD_LOCATION', 'us')
PROCESSOR_ID = os.getenv('GOOGLE_DOCUMENT_AI_PROCESSOR_ID')

SOURCE_PDF_DIR = Path('/Users/anhyunjun/.openclaw/workspace/정약국_자료')
PROCESSED_DIR = Path('/Users/anhyunjun/.openclaw/workspace/optima-pharm-chatbot/data/processed')
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

CHUNK_SIZE = 15  # 한 번에 처리할 최대 페이지 수 (한도 30이라 25로 설정)

def extract_full_pdf(pdf_path: Path) -> dict:
    """PDF 전체를 25페이지씩 나눠서 Document AI로 처리"""
    client = documentai.DocumentProcessorServiceClient()
    processor_name = f"projects/{PROJECT_ID}/locations/{LOCATION}/processors/{PROCESSOR_ID}"

    doc = fitz.open(str(pdf_path))
    total_pages = len(doc)
    
    print(f"\n📄 {pdf_path.name} ({total_pages}페이지)")
    
    all_pages = []
    num_chunks = (total_pages + CHUNK_SIZE - 1) // CHUNK_SIZE
    
    for chunk_idx in range(num_chunks):
        start = chunk_idx * CHUNK_SIZE
        end = min(start + CHUNK_SIZE, total_pages)
        
        print(f"  처리 중: {start+1}~{end}페이지 (배치 {chunk_idx+1}/{num_chunks})")
        
        # 해당 범위 페이지만 임시 PDF로 추출
        temp_pdf = fitz.open()
        temp_pdf.insert_pdf(doc, from_page=start, to_page=end-1)
        temp_bytes = temp_pdf.tobytes()
        temp_pdf.close()
        
        # Document AI로 처리
        try:
            request = documentai.ProcessRequest(
                name=processor_name,
                raw_document=documentai.RawDocument(content=temp_bytes, mime_type='application/pdf')
            )
            result = client.process_document(request=request)
            document = result.document
            
            # 페이지별 텍스트 파싱
            for i, page in enumerate(document.pages):
                actual_page_num = start + i + 1  # 실제 원본 페이지 번호
                
                # 텍스트 추출 (문단별)
                page_text_parts = []
                for para in page.paragraphs:
                    if para.layout and para.layout.text_anchor:
                        text = ""
                        for segment in para.layout.text_anchor.text_segments:
                            start_idx = int(segment.start_index) if segment.start_index else 0
                            end_idx = int(segment.end_index) if segment.end_index else 0
                            text += document.text[start_idx:end_idx]
                        if text.strip():
                            page_text_parts.append(text.strip())
                
                page_text = "\n".join(page_text_parts)
                
                # 표 추출
                tables = []
                for table in page.tables:
                    rows = []
                    for row in list(table.header_rows) + list(table.body_rows):
                        cells = []
                        for cell in row.cells:
                            if cell.layout and cell.layout.text_anchor:
                                cell_text = ""
                                for segment in cell.layout.text_anchor.text_segments:
                                    s = int(segment.start_index) if segment.start_index else 0
                                    e = int(segment.end_index) if segment.end_index else 0
                                    cell_text += document.text[s:e]
                                cells.append(cell_text.strip())
                        if cells:
                            rows.append(cells)
                    if rows:
                        tables.append(rows)
                
                all_pages.append({
                    "page_number": actual_page_num,
                    "text": page_text,
                    "char_count": len(page_text),
                    "has_tables": len(tables) > 0,
                    "tables": tables
                })
            
        except Exception as e:
            print(f"  ❌ 오류 (페이지 {start+1}~{end}): {e}")
            # 오류 페이지도 기록 (추후 재처리 가능하도록)
            for i in range(end - start):
                all_pages.append({
                    "page_number": start + i + 1,
                    "text": f"[추출 실패: {str(e)[:100]}]",
                    "char_count": 0,
                    "has_tables": False,
                    "tables": [],
                    "error": True
                })
        
        time.sleep(0.5)  # API 과부하 방지
    
    doc.close()
    
    successful = sum(1 for p in all_pages if not p.get('error'))
    total_chars = sum(p['char_count'] for p in all_pages)
    table_pages = sum(1 for p in all_pages if p['has_tables'])
    
    print(f"  ✅ 완료: {successful}/{total_pages}페이지 성공 | 총 {total_chars:,}자 | 표 포함 {table_pages}페이지")
    
    return {
        "filename": pdf_path.name,
        "source_path": str(pdf_path),
        "total_pages": total_pages,
        "processed_pages": len(all_pages),
        "successful_pages": successful,
        "total_chars": total_chars,
        "pages": all_pages
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', type=str, help='특정 파일만 처리 (파일명)')
    parser.add_argument('--all', action='store_true', help='전체 13개 파일 처리')
    args = parser.parse_args()
    
    print("=== Document AI PDF 추출 시작 ===")
    
    if args.file:
        pdf_files = [SOURCE_PDF_DIR / args.file]
    elif args.all:
        pdf_files = sorted(SOURCE_PDF_DIR.glob('*.pdf'))
        print(f"전체 {len(pdf_files)}개 파일 처리")
    else:
        # 기본: 첫 번째 파일만
        pdf_files = sorted(SOURCE_PDF_DIR.glob('*.pdf'))
        print(f"테스트: {pdf_files[0].name}")
    
    for pdf_path in pdf_files:
        out_path = PROCESSED_DIR / f"{pdf_path.stem}.json"
        
        if out_path.exists():
            print(f"⏭️  이미 처리됨: {pdf_path.name}")
            continue
        
        result = extract_full_pdf(pdf_path)
        
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"  💾 저장: {out_path.name}")
    
    print("\n=== 완료 ===")

if __name__ == "__main__":
    main()
