"""
2단계 준비: Google Document AI 연결 설정
- 실제 PDF 처리는 3단계에서 합니다
- 여기서는 연결이 잘 되는지 테스트만 합니다
"""
import os
from dotenv import load_dotenv

# .env.local 파일에서 API 키들을 읽어옵니다
load_dotenv('.env.local')

def check_document_ai_config():
    """Document AI 설정값이 모두 있는지 확인합니다"""
    required = [
        'GOOGLE_CLOUD_PROJECT_ID',
        'GOOGLE_CLOUD_LOCATION', 
        'GOOGLE_DOCUMENT_AI_PROCESSOR_ID',
        'GOOGLE_APPLICATION_CREDENTIALS'
    ]
    
    print("=== Google Document AI 설정 확인 ===\n")
    all_ok = True
    
    for key in required:
        value = os.getenv(key)
        if value:
            # 보안을 위해 실제 값은 일부만 표시
            masked = value[:8] + "..." if len(value) > 8 else value
            print(f"✅ {key}: {masked}")
        else:
            print(f"❌ {key}: 설정 안 됨!")
            all_ok = False
    
    if all_ok:
        print("\n✅ 모든 설정이 완료되었습니다!")
    else:
        print("\n❌ 위의 항목들을 .env.local 파일에 설정해주세요.")
    
    return all_ok

def test_connection():
    """실제로 Document AI에 연결이 되는지 테스트합니다"""
    try:
        from google.cloud import documentai
        
        project_id = os.getenv('GOOGLE_CLOUD_PROJECT_ID')
        location = os.getenv('GOOGLE_CLOUD_LOCATION', 'us')
        processor_id = os.getenv('GOOGLE_DOCUMENT_AI_PROCESSOR_ID')
        
        client = documentai.DocumentProcessorServiceClient()
        processor_name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"
        
        # 처리기 정보를 가져와서 연결 확인
        processor = client.get_processor(name=processor_name)
        print(f"\n✅ Document AI 연결 성공!")
        print(f"   처리기 이름: {processor.display_name}")
        print(f"   처리기 상태: {processor.state.name}")
        return True
        
    except ImportError:
        print("\n❌ google-cloud-documentai 패키지가 설치되지 않았습니다.")
        print("   실행: pip install google-cloud-documentai")
        return False
    except Exception as e:
        print(f"\n❌ 연결 실패: {e}")
        return False

if __name__ == "__main__":
    config_ok = check_document_ai_config()
    if config_ok:
        print("\n연결 테스트를 시작합니다...")
        test_connection()
