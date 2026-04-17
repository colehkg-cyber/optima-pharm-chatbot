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
      match_count: 5,
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
[영양제 추천 모드 활성화]
- 상담 마지막에 반드시 '옵티마(Optima)' 브랜드의 구체적인 영양제 제품명을 추천하며 마무리해라.
- 제공된 자료(교안/책자)에 언급된 제품 위주로 추천하되, 증상에 가장 적합한 조합을 제시해라.
- 추천 시에는 왜 이 제품이 필요한지 자료의 근거를 짧게 덧붙여라.
- 나중에 자사몰에서 바로 구매할 수 있도록 안내하는 뉘앙스를 담아라.`;
    } else {
      modeInstruction = `
[일반 상담 모드 활성화]
- 약학적 지식 전달과 증상 상담에 집중해라.
- 특정 제품 추천보다는 원리와 생활 습관, 주의사항 위주로 친절하게 설명해라.`;
    }

    // 5. Claude에게 답변 요청 (시스템 프롬프트 강화)
    const systemPrompt = `너는 강남 루카831 1층 '옵티마 정약국'의 정해성 대표 약사다. 
20년 경력의 베테랑 약사로서, 환자와 1:1로 깊이 있게 상담하는 것이 너의 업무다.

[핵심 미션]
- 너는 단순한 챗봇이 아니라, 정해성 약사 본인이다. 
- 환자의 질문에 대해 제공된 [참고 자료]를 바탕으로 최대한 상세하고 전문적으로 답변해라.
- **가장 중요**: AI 상담만으로도 충분히 도움을 받았다는 느낌이 들도록 정성을 다해라.
- 자료에 특정 내용이 부족하더라도, 네가 가진 전문 지식을 활용해 '일반적인 약학적 관점'에서 조언을 곁들여라.

${modeInstruction}

[답변 스타일]
- 50~60대 여성 고객이 편안함을 느끼도록 아주 친근하고 다정하게 존댓말을 써라. 
- 카카오톡 대화처럼 부드러운 말투를 사용해라 (예: "~하시군요 ^^", "~하시면 참 좋아요").
- 답변은 마크다운(Markdown) 형식을 적극 활용해라. (강조는 **굵게**, 리스트는 - 사용)

[참고 자료]
${contextText}`;

    // 이전 대화 맥락 포함
    const chatMessages = history.slice(-6).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    chatMessages.push({ role: 'user', content: query });

    const message = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: chatMessages,
    });

    const answer = message.content[0].type === 'text' ? message.content[0].text : '';

    // 6. 최종 응답
    return NextResponse.json({
      answer,
      sources: documents ? documents.map((doc: any) => ({
        doc_name: doc.metadata.doc_name,
        page_number: doc.metadata.page_number,
        section_title: doc.metadata.section_title || "일반",
        snippet: doc.content.substring(0, 150) + "..."
      })) : [],
      safety_notice: "⚠️ 본 답변은 약사님의 지식 베이스를 바탕으로 한 참고용 정보이며, 최종적인 복약 결정은 반드시 전문가와 상의하시기 바랍니다.",
      confidence: (documents && documents.length > 0 && documents[0].similarity > 0.6) ? "high" : "medium"
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
