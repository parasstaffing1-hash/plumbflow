-- RCH PlumbFlow — Phase 2 migration (PROPOSED, not run)
-- Every tenant table: org_id + RLS + is_org_member(org_id) + indexes on org_id and FKs.
-- Money: numeric(12,2) in pounds, matching the existing UI maths.

begin;

-- ---------- enums ----------
create type job_status as enum ('ready_to_book','booked','en_route','on_site','in_progress','awaiting_close_out','complete','return_required','cancelled');
create type quote_status as enum ('draft','approval_required','sent','viewed','accepted','declined','expired','superseded');
create type invoice_status as enum ('draft','issued','part_paid','paid','overdue','disputed','payment_plan','credited','written_off');
create type enquiry_status as enum ('new','needs_contact','awaiting_customer','qualified','quoted','converted','declined');
create type task_status as enum ('open','waiting','monitoring','due','complete','cancelled');
create type evidence_stage as enum ('before','during','testing','after');
create type deposit_rule as enum ('percentage','fixed_amount','none_trusted_customer','account_customer','stage_payments');
create type property_relationship as enum ('owner_occupier','landlord','tenant','managing_agent','other');
create type org_role as enum ('owner','office_admin','engineer','subcontractor','read_only');
create type payment_method as enum ('bank_transfer','card','cash');
create type variation_status as enum ('pending','approved','declined','cancelled');

-- ---------- extend existing tables ----------
alter table public.organizations
  add column if not exists slug text unique,
  add column if not exists trading_name text,
  add column if not exists legal_name text,
  add column if not exists company_number text,
  add column if not exists vat_number text,
  add column if not exists registered_office text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists town text,
  add column if not exists county text default 'Northamptonshire',
  add column if not exists postcode text,
  add column if not exists vat_rate numeric(5,4) not null default 0.2000,
  add column if not exists default_deposit_rule deposit_rule not null default 'percentage',
  add column if not exists default_deposit_percentage numeric(5,2) not null default 75,
  add column if not exists minimum_callout_item_id uuid,
  add column if not exists trade text,
  add column if not exists primary_service text,
  add column if not exists positioning text,
  add column if not exists service_area text,
  add column if not exists hours_text text,
  add column if not exists opening_hours jsonb not null default '[]'::jsonb,
  add column if not exists credentials text[] not null default '{}',
  add column if not exists services text[] not null default '{}',
  add column if not exists hero jsonb,
  add column if not exists water_authority_note text,
  add column if not exists gas_safe text,
  add column if not exists no_fix_no_fee boolean not null default false,
  add column if not exists photos_with_every_job boolean not null default true,
  add column if not exists website_url text,
  add column if not exists has_own_domain boolean not null default false,
  add column if not exists review_rating numeric(2,1),
  add column if not exists review_count integer,
  add column if not exists reviews_url text,
  add column if not exists signup_date timestamptz not null default now(),
  add column if not exists subscription_status text not null default 'trialing',
  add column if not exists trial_ends_at timestamptz;

alter table public.customers
  add column if not exists kind text not null default 'residential',
  add column if not exists is_account_customer boolean not null default false,
  add column if not exists notes text not null default '';

alter table public.jobs
  add column if not exists job_number text,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists property_id uuid,
  add column if not exists quote_id uuid,
  add column if not exists enquiry_id uuid,
  add column if not exists job_type_id uuid,
  add column if not exists title text,
  add column if not exists reported_issue text not null default '',
  add column if not exists scope text not null default '',
  add column if not exists assigned_to uuid,
  add column if not exists is_emergency boolean not null default false,
  add column if not exists job_state job_status not null default 'ready_to_book',
  add column if not exists scheduled_start timestamptz,
  add column if not exists duration_minutes integer not null default 90,
  add column if not exists work_done_notes text not null default '',
  add column if not exists parts_used_notes text not null default '',
  add column if not exists recommendations text not null default '',
  add column if not exists test_results text not null default '',
  add column if not exists waivers jsonb not null default '[]'::jsonb,
  add column if not exists completed_at timestamptz;

alter table public.quotes
  add column if not exists quote_number text,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists property_id uuid,
  add column if not exists enquiry_id uuid,
  add column if not exists job_type_id uuid,
  add column if not exists quote_state quote_status not null default 'draft',
  add column if not exists deposit_rule deposit_rule not null default 'percentage',
  add column if not exists deposit_percentage numeric(5,2) not null default 75,
  add column if not exists deposit_fixed_amount numeric(12,2) not null default 0,
  add column if not exists deposit_waived_by text,
  add column if not exists deposit_waived_at timestamptz,
  add column if not exists stage_payments jsonb not null default '[]'::jsonb,
  add column if not exists locked_at timestamptz,
  add column if not exists valid_until date;

alter table public.invoices
  add column if not exists invoice_number text,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists property_id uuid,
  add column if not exists job_id uuid references public.jobs(id) on delete set null,
  add column if not exists invoice_state invoice_status not null default 'draft',
  add column if not exists issued_at timestamptz,
  add column if not exists due_at date;

-- ---------- new tenant tables ----------
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  current_customer_id uuid references public.customers(id) on delete set null,
  line1 text not null,
  town text not null default '',
  postcode text not null default '',
  access_notes text not null default '',
  boiler_make text, boiler_model text, boiler_serial text, boiler_install_year int,
  next_service_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  relationship property_relationship not null default 'owner_occupier',
  started_on date not null default current_date,
  ended_on date,
  is_current boolean not null default true
);

create table if not exists public.job_types (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  customer_label text,
  is_active boolean not null default true,
  default_duration_minutes int not null default 90,
  requires_before boolean not null default true,
  requires_during boolean not null default false,
  requires_testing boolean not null default false,
  requires_after boolean not null default true,
  min_photos_per_required_stage int not null default 1,
  sort_order int not null default 0,
  notes text not null default ''
);

create table if not exists public.towns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  postcode_prefix text not null default '',
  area_intro text,
  sort_order int not null default 0,
  unique (org_id, slug)
);

create table if not exists public.price_book_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  unit text not null default 'each',
  unit_price numeric(12,2) not null default 0,
  is_vatable boolean not null default true,
  category text not null default 'materials',
  is_archived boolean not null default false,
  unique (org_id, code)
);

create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  enquiry_id uuid,
  stage evidence_stage not null,
  label text not null default '',
  storage_path text,
  captured_at timestamptz not null default now()
);

create table if not exists public.job_materials (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  name text not null,
  quantity numeric(10,2) not null default 1,
  is_job_critical boolean not null default false,
  is_collected boolean not null default false
);

create table if not exists public.job_variations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null default 0,
  is_vatable boolean not null default true,
  status variation_status not null default 'pending',
  approved_at timestamptz,
  approved_by_note text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  is_vatable boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  is_vatable boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  paid_at timestamptz not null default now(),
  method payment_method not null default 'bank_transfer'
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  status task_status not null default 'open',
  due_date date not null default current_date,
  linked_type text,
  linked_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  reference text not null,
  customer_id uuid references public.customers(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  job_type_id uuid references public.job_types(id) on delete set null,
  contact_name text not null default '',
  phone text not null default '',
  email text,
  raw_address text not null default '',
  description text not null default '',
  is_emergency boolean not null default false,
  urgency text not null default 'standard',
  value_band text not null default 'small',
  status enquiry_status not null default 'new',
  decline_reason text,
  source text not null default 'web',
  preferred_timing text not null default '',
  town text,
  service text,
  video_refs jsonb not null default '[]'::jsonb,
  received_at timestamptz not null default now(),
  unique (org_id, reference)
);

-- ---------- sequential document numbers ----------
create table if not exists public.org_counters (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  quote int not null default 0,
  job int not null default 0,
  invoice int not null default 0,
  enquiry int not null default 0
);

create or replace function public.next_document_number(_org_id uuid, _kind text)
returns text language plpgsql security definer set search_path = public as $$
declare n int; prefix text;
begin
  insert into public.org_counters(org_id) values (_org_id) on conflict do nothing;
  case _kind
    when 'quote'   then update public.org_counters set quote = quote + 1 where org_id=_org_id returning quote into n; prefix := 'Q-';
    when 'job'     then update public.org_counters set job = job + 1 where org_id=_org_id returning job into n; prefix := 'J-';
    when 'invoice' then update public.org_counters set invoice = invoice + 1 where org_id=_org_id returning invoice into n; prefix := 'INV-';
    when 'enquiry' then update public.org_counters set enquiry = enquiry + 1 where org_id=_org_id returning enquiry into n; prefix := 'E-';
    else raise exception 'unknown document kind %', _kind;
  end case;
  return prefix || lpad(n::text, 4, '0');
end $$;

-- ---------- platform admins (NOT tenant data: user_id only) ----------
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_platform_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = _user_id)
$$;

-- ---------- grants, RLS, policies, indexes ----------
do $$
declare t text;
begin
  foreach t in array array[
    'properties','customer_properties','job_types','towns','price_book_items','job_photos',
    'job_materials','job_variations','quote_line_items','invoice_line_items','invoice_payments',
    'tasks','enquiries','org_counters'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id))', t||'_org_member', t);
    execute format('create index if not exists %I on public.%I (org_id)', 'idx_'||t||'_org', t);
  end loop;
end $$;

-- public booking surface reads (anon): org identity + towns + job types only
grant select on public.towns, public.job_types to anon;
create policy towns_public_read on public.towns for select to anon using (true);
create policy job_types_public_read on public.job_types for select to anon using (is_active);
grant select on public.organizations to anon;
create policy organizations_public_read on public.organizations for select to anon using (true);
grant insert on public.enquiries to anon;
create policy enquiries_public_insert on public.enquiries for insert to anon with check (true);
grant insert on public.job_photos to anon;
create policy job_photos_public_insert on public.job_photos for insert to anon with check (job_id is null);

-- platform_admins: readable only by an existing platform admin, writes service_role only
grant select on public.platform_admins to authenticated;
grant all on public.platform_admins to service_role;
alter table public.platform_admins enable row level security;
create policy platform_admins_self on public.platform_admins
  for select to authenticated using (public.is_platform_admin(auth.uid()));

-- FK indexes
create index if not exists idx_properties_customer on public.properties(current_customer_id);
create index if not exists idx_cp_customer on public.customer_properties(customer_id);
create index if not exists idx_cp_property on public.customer_properties(property_id);
create index if not exists idx_job_photos_job on public.job_photos(job_id);
create index if not exists idx_job_photos_enquiry on public.job_photos(enquiry_id);
create index if not exists idx_job_materials_job on public.job_materials(job_id);
create index if not exists idx_job_variations_job on public.job_variations(job_id);
create index if not exists idx_qli_quote on public.quote_line_items(quote_id);
create index if not exists idx_ili_invoice on public.invoice_line_items(invoice_id);
create index if not exists idx_ip_invoice on public.invoice_payments(invoice_id);
create index if not exists idx_enquiries_customer on public.enquiries(customer_id);
create index if not exists idx_enquiries_property on public.enquiries(property_id);
create index if not exists idx_enquiries_job_type on public.enquiries(job_type_id);
create index if not exists idx_jobs_customer on public.jobs(customer_id);
create index if not exists idx_invoices_job on public.invoices(job_id);
create unique index if not exists idx_org_slug on public.organizations(slug);

commit;
