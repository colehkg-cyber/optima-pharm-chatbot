import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { anthropic, CHAT_MODEL } from '../../../lib/claude';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { query, history = [], mode = 'general' } = await req.json();

    if (!query) {
      return NextResponse.json({ error: '질문을 입력해 주세요.' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 1. 사용자 질문을 임베딩
    const embeddingResponse = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: query,
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 2. Supabase에서 관련 지식 검색
    const { data: documents, error: searchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: embedding,
      match_count: 8,
      min_similarity: 0.2,
    });

    if (searchError) throw new Error('검색 엔진 오류: ' + searchError.message);

    // 3. 컨텍스트 생성
    const contextText = documents && documents.length > 0 
      ? documents.map((doc: any, i: number) => `[자료 ${i + 1}] (문서: ${doc.metadata.doc_name}, 페이지: ${doc.metadata.page_number})\n${doc.content}`).join('\n\n')
      : "관련된 직접적인 자료를 찾지 못했습니다.";

    // 4. 모드에 따른 지침 설정
    let modeInstruction = "";
    if (mode === 'recommend') {
      modeInstruction = `
[영양제 추천 모드: 활성화]
- 상담의 마무리 단계에서 **반드시** '옵티마(Optima)' 브랜드의 구체적인 영양제 제품을 추천하세요.
- 자료에 언급된 제품(예: 리버렉스, 큐어맥스, 청호정골드, 정음단, 유니몬, 에스린, 프로큐, 리셀 등) 중에서 증상에 맞는 것을 골라 추천하세요.
- "이런 증상에는 옵티마의 **[제품명]**이 도움이 될 수 있습니다"라고 명확히 언급하세요.
- 상담을 "구매하시려면 자사몰을 이용하시거나 약국으로 문의주세요"라는 뉘앙스로 마무리하세요.`;
    } else {
      modeInstruction = `
[일반 상담 모드: 활성화]
- 특정 제품 판매보다는 원리 설명과 증상 상담, 생활 습관 조언에 집중하세요.`;
    }

    // 5. Claude에게 답변 요청 (관련 질문 생성을 위해 응답 형식에 대한 지시 추가)
    const systemPrompt = `너는 강남 루카831 1층 '옵티마 정약국'의 정해성 대표 약사다. 
20년 경력의 베테랑 약사로서, 환자와 1:1로 깊이 있고 다정하게 상담하는 것이 너의 업무다.

[페르소나 가이드라인]
- 너는 단순한 AI가 아니라, 실제로 환자를 마주하고 있는 '정해성 약사' 본인이다.
- 환자의 건강 고민에 진심으로 공감하고 걱정해주는 따뜻한 마음을 담아라.
- 답변 중간중간 적절한 이모티콘(😊, ^^, 👍, 🙏 등)을 섞어서 다정한 분위기를 연출해라.
- "자료를 공부했다"거나 "AI 모델이다"라는 말은 절대 하지 마라. 오직 약사로서의 지식과 경험으로 말해라.

[상담 원칙]
- **절대로 답변을 회피하지 마라.** "약국에 오세요"는 정말 해결 방법이 없을 때만 최후의 수단으로 써라. 여기서 모든 답을 준다는 마음으로 임해라.
- 답변은 마크다운(Markdown) 형식을 사용하여 읽기 좋게 구성해라.
- 답변이 끝난 후, 사용자가 궁금해할 법한 **연관 질문 3개**를 생성해라.

[응답 형식]
반드시 아래와 같은 JSON 구조로만 응답해라:
{
  "answer": "마크다운과 다정한 말투, 이모티콘이 포함된 답변 내용",
  "related_questions": ["질문1", "질문2", "질문3"]
}

${modeInstruction}

[참고 자료]
${contextText}`;

    const chatMessages = history.slice(-6).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    chatMessages.push({ role: 'user', content: query });

    const message = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: chatMessages,
    });

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // JSON 파싱 (AI가 가끔 마크다운 태그를 붙이는 경우 대비)
    let parsedResponse;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : { answer: rawContent, related_questions: [] };
    } catch (e) {
      parsedResponse = { answer: rawContent, related_questions: [] };
    }

    return NextResponse.json({
      answer: parsedResponse.answer,
      related_questions: parsedResponse.related_questions,
      sources: documents ? documents.map((doc: any) => ({
        doc_name: doc.metadata.doc_name,
        page_number: doc.metadata.page_number,
        section_title: doc.metadata.section_title || "일반",
        snippet: doc.content.substring(0, 150) + "..."
      })) : [],
      safety_notice: "⚠️ 본 답변은 약사님의 지식 베이스를 바탕으로 한 참고용 정보이며, 최종적인 복약 결정은 반드시 전문가와 상의하시기 바랍니다.",
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
