create extension if not exists "pg_cron" with schema "pg_catalog";

drop extension if exists "pg_net";


  create table "public"."realtime_messages" (
    "id" uuid not null default gen_random_uuid(),
    "topic" text not null,
    "event" text not null,
    "payload" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."realtime_messages" enable row level security;


  create table "public"."wars" (
    "warNumber" bigint,
    "winner" character varying,
    "conquestStartTime" timestamp with time zone,
    "conquestEndTime" timestamp with time zone,
    "requiredVictoryTowns" smallint default '0'::smallint,
    "warId" uuid not null,
    "resistanceStartTime" timestamp with time zone,
    "shortRequiredVictoryTowns" smallint default '0'::smallint,
    "scheduledConquestEndTime" timestamp with time zone
      );


alter table "public"."wars" enable row level security;

alter table "public"."snapshots" add column "reports" jsonb;

alter table "public"."snapshots" enable row level security;

alter table "public"."territory_diffs" enable row level security;

CREATE INDEX idx_realtime_messages_topic_created_at ON public.realtime_messages USING btree (topic, created_at DESC);

CREATE UNIQUE INDEX realtime_messages_pkey ON public.realtime_messages USING btree (id);

CREATE UNIQUE INDEX wars_pkey ON public.wars USING btree ("warId");

CREATE UNIQUE INDEX wars_war_id_key ON public.wars USING btree ("warId");

alter table "public"."realtime_messages" add constraint "realtime_messages_pkey" PRIMARY KEY using index "realtime_messages_pkey";

alter table "public"."wars" add constraint "wars_pkey" PRIMARY KEY using index "wars_pkey";

alter table "public"."wars" add constraint "wars_war_id_key" UNIQUE using index "wars_war_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.snapshots_broadcast_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  PERFORM realtime.broadcast_changes(
    'snapshots', -- topic prefix; you can change to 'snapshots:' || NEW.id for per-resource topics
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

grant delete on table "public"."realtime_messages" to "anon";

grant insert on table "public"."realtime_messages" to "anon";

grant references on table "public"."realtime_messages" to "anon";

grant select on table "public"."realtime_messages" to "anon";

grant trigger on table "public"."realtime_messages" to "anon";

grant truncate on table "public"."realtime_messages" to "anon";

grant update on table "public"."realtime_messages" to "anon";

grant delete on table "public"."realtime_messages" to "authenticated";

grant insert on table "public"."realtime_messages" to "authenticated";

grant references on table "public"."realtime_messages" to "authenticated";

grant select on table "public"."realtime_messages" to "authenticated";

grant trigger on table "public"."realtime_messages" to "authenticated";

grant truncate on table "public"."realtime_messages" to "authenticated";

grant update on table "public"."realtime_messages" to "authenticated";

grant delete on table "public"."realtime_messages" to "service_role";

grant insert on table "public"."realtime_messages" to "service_role";

grant references on table "public"."realtime_messages" to "service_role";

grant select on table "public"."realtime_messages" to "service_role";

grant trigger on table "public"."realtime_messages" to "service_role";

grant truncate on table "public"."realtime_messages" to "service_role";

grant update on table "public"."realtime_messages" to "service_role";

grant delete on table "public"."wars" to "anon";

grant insert on table "public"."wars" to "anon";

grant references on table "public"."wars" to "anon";

grant select on table "public"."wars" to "anon";

grant trigger on table "public"."wars" to "anon";

grant truncate on table "public"."wars" to "anon";

grant update on table "public"."wars" to "anon";

grant delete on table "public"."wars" to "authenticated";

grant insert on table "public"."wars" to "authenticated";

grant references on table "public"."wars" to "authenticated";

grant select on table "public"."wars" to "authenticated";

grant trigger on table "public"."wars" to "authenticated";

grant truncate on table "public"."wars" to "authenticated";

grant update on table "public"."wars" to "authenticated";

grant delete on table "public"."wars" to "service_role";

grant insert on table "public"."wars" to "service_role";

grant references on table "public"."wars" to "service_role";

grant select on table "public"."wars" to "service_role";

grant trigger on table "public"."wars" to "service_role";

grant truncate on table "public"."wars" to "service_role";

grant update on table "public"."wars" to "service_role";


  create policy "allow_insert_snapshots"
  on "public"."realtime_messages"
  as permissive
  for insert
  to authenticated
with check ((topic ~~ 'snapshots%'::text));



  create policy "allow_select_snapshots"
  on "public"."realtime_messages"
  as permissive
  for select
  to authenticated
using ((topic ~~ 'snapshots%'::text));



  create policy "Enable insert for authenticated users only"
  on "public"."snapshots"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable read access for all users"
  on "public"."snapshots"
  as permissive
  for select
  to public
using (true);



  create policy "Enable insert for authenticated users only"
  on "public"."territory_diffs"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable read access for all users"
  on "public"."territory_diffs"
  as permissive
  for select
  to public
using (true);



  create policy "Enable insert for authenticated users only"
  on "public"."wars"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable read access for all users"
  on "public"."wars"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER snapshots_broadcast_trigger AFTER INSERT OR DELETE OR UPDATE ON public.snapshots FOR EACH ROW EXECUTE FUNCTION public.snapshots_broadcast_trigger();


