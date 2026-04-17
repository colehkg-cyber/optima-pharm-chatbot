import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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

    // 2. Supabase match_document_chunks 함수 호출하여 검색
    // similarity 수치는 0.7 정도로 기본 설정
    const { data: documents, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: embedding,
      match_count: 5,
      min_similarity: 0.7,
    });

    if (error) {
      console.error('Supabase search error:', error);
      return NextResponse.json({ error: 'Failed to search documents' }, { status: 500 });
    }

    // 3. 검색 결과 반환
    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
