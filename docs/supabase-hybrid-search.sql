-- Supabase hybrid search objects for curriculum retrieval
-- Enables keyword + vector retrieval with pgvector HNSW index and FTS ranking.

create extension if not exists vector;

-- Expected table (align names with ingestion pipeline as needed)
create table if not exists public.curriculum_chunks (
  id text primary key,
  filename text not null,
  subject text,
  grade_level int,
  standard_codes text[] default '{}',
  text text not null,
  embedding vector(1536) not null,
  fts tsvector generated always as (to_tsvector('english', coalesce(text, ''))) stored
);

create index if not exists curriculum_chunks_embedding_hnsw_idx
  on public.curriculum_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 128);

create index if not exists curriculum_chunks_fts_idx
  on public.curriculum_chunks using gin (fts);

create or replace function public.match_curriculum_hybrid(
  query_text text,
  query_embedding vector(1536),
  match_count int default 15,
  match_subject text default null,
  match_grade_level int default null,
  vector_weight float default 0.55,
  keyword_weight float default 0.45
)
returns table (
  id text,
  filename text,
  subject text,
  grade_level int,
  standard_codes text[],
  text text,
  vector_score float,
  keyword_score float,
  hybrid_score float
)
language sql
stable
as $$
with vector_candidates as (
  select
    c.id,
    1 - (c.embedding <=> query_embedding) as vector_score
  from public.curriculum_chunks c
  where (match_subject is null or c.subject = match_subject)
    and (match_grade_level is null or c.grade_level = match_grade_level)
  order by c.embedding <=> query_embedding
  limit greatest(match_count * 3, 20)
),
keyword_candidates as (
  select
    c.id,
    ts_rank_cd(c.fts, websearch_to_tsquery('english', query_text)) as keyword_score
  from public.curriculum_chunks c
  where (match_subject is null or c.subject = match_subject)
    and (match_grade_level is null or c.grade_level = match_grade_level)
    and c.fts @@ websearch_to_tsquery('english', query_text)
  order by keyword_score desc
  limit greatest(match_count * 3, 20)
),
merged as (
  select
    c.id,
    c.filename,
    c.subject,
    c.grade_level,
    c.standard_codes,
    c.text,
    coalesce(v.vector_score, 0) as vector_score,
    coalesce(k.keyword_score, 0) as keyword_score,
    (coalesce(v.vector_score, 0) * vector_weight) + (coalesce(k.keyword_score, 0) * keyword_weight) as hybrid_score
  from public.curriculum_chunks c
  left join vector_candidates v on v.id = c.id
  left join keyword_candidates k on k.id = c.id
  where v.id is not null or k.id is not null
)
select *
from merged
order by hybrid_score desc
limit match_count;
$$;
