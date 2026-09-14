-- Consolidate duplicate company lists created by the former automatic-list UI.
-- Candidates are copied to the oldest matching list before duplicates are removed.
create temporary table cvideo_saved_list_duplicates on commit drop as
select
  id,
  first_value(id) over (
    partition by company_id, lower(btrim(name))
    order by created_at, id
  ) as canonical_id
from saved_lists;

insert into saved_candidates (list_id, candidate_id, added_by_user_id, created_at)
select duplicates.canonical_id, candidates.candidate_id, candidates.added_by_user_id, candidates.created_at
from cvideo_saved_list_duplicates duplicates
join saved_candidates candidates on candidates.list_id = duplicates.id
where duplicates.id <> duplicates.canonical_id
on conflict (list_id, candidate_id) do nothing;

delete from saved_lists lists
using cvideo_saved_list_duplicates duplicates
where lists.id = duplicates.id
  and duplicates.id <> duplicates.canonical_id;

create unique index if not exists saved_lists_company_normalized_name_unique
  on saved_lists (company_id, lower(btrim(name)));
