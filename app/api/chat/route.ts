import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { anthropic, CHAT_MODEL } from '@/lib/claude';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 1. 사용자 질문을 임베딩(숫자 벡터)으로 변환
    const embeddingResponse = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: query,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // 2. Supabase에서 관련 지식 검색
    const { data: documents, error: searchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: embedding,
      match_count: 5,
      min_similarity: 0.5, // 0.7보다 약간 낮춰서 더 많은 맥락 확보
    });

    if (searchError) {
      console.error('Supabase search error:', searchError);
      return NextResponse.json({ error: 'Failed to search knowledge base' }, { status: 500 });
    }

    // 3. 검색 결과가 아예 없는 경우 처리
    if (!documents || documents.length === 0) {
      return NextResponse.json({
        answer: "죄송합니다. 현재 정약국 지식베이스에서 해당 질문에 대한 충분한 근거를 찾지 못했습니다. 보다 정확한 상담을 위해 약사님께 직접 문의해 주세요.",
        sources: [],
        safety_notice: "⚠️ 본 답변은 참고용이며, 정확한 복약 지도는 반드시 약사 또는 의사와 상담하시기 바랍니다.",
        confidence: "none"
      });
    }

    // 4. 검색된 문단들을 텍스트로 합쳐서 Claude에게 보낼 컨텍스트 생성
    const contextText = documents
      .map((doc: any, i: number) => `[자료 ${i + 1}] (문서: ${doc.metadata.doc_name}, 페이지: ${doc.metadata.page_number})\n${doc.content}`)
      .join('\n\n');

    // 5. Claude에게 답변 요청 (시스템 프롬프트 설정)
    const systemPrompt = `너는 강남 루카831 1층 '옵티마 정약국'의 정해성 대표 약사다.
'장-간-뇌 순환' 원칙과 체질 분석 기반으로 건강 및 영양제 상담을 진행하는 20년 경력의 전문가다.

[지침]
1. 반드시 아래 제공된 [참고 자료]의 내용만을 근거로 답변해라.
2. 자료에 없는 내용을 물어보면 절대 지어내지 말고 "자료에서 충분한 근거를 찾지 못했다"라고 답해라.
3. 말투는 50~60대 여성 고객이 편안함을 느낄 수 있도록 친절하고 정중하게 존댓말을 써라 (예: "~하시는군요", "~해 보세요").
4. 답변은 과장하지 말고 객관적으로 전달해라.
5. 답변 마지막에는 반드시 출처 정보 없이 답변 내용만 제공해라 (출처는 별도 필드로 제공됨).

[참고 자료]
${contextText}`;

    const message = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        { role: 'user', content: query }
      ],
    });

    const answer = message.content[0].type === 'text' ? message.content[0].text : '';

    // 6. 최종 JSON 응답 반환
    return NextResponse.json({
      answer,
      sources: documents.map((doc: any) => ({
        doc_name: doc.metadata.doc_name,
        page_number: doc.metadata.page_number,
        section_title: doc.metadata.section_title || "일반",
        chunk_id: doc.id,
        snippet: doc.content.substring(0, 200) + "..."
      })),
      safety_notice: "⚠️ 본 답변은 참고용이며, 최종 복약 결정은 반드시 담당 약사 또는 의사의 판단을 따르시기 바랍니다.",
      confidence: documents[0].similarity > 0.8 ? "high" : "medium"
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
