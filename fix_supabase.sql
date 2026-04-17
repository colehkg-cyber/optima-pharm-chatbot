create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  min_similarity float default 0.3
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 1 - (document_chunks.embedding <=> query_embedding) > min_similarity
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
