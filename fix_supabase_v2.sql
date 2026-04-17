-- 이 코드를 Supabase SQL Editor에 복사해서 넣고 RUN을 누르세요.
-- 기존 함수를 삭제하고 이름 충돌이 없는 버전으로 다시 만듭니다.

drop function if exists match_document_chunks;

create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  min_similarity float default 0.3
)
returns table (
  chunk_id uuid, -- id 대신 chunk_id로 이름을 바꿔서 충돌 방지
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id as chunk_id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 1 - (document_chunks.embedding <=> query_embedding) > min_similarity
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
