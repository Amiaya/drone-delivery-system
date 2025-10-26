begin; 

create or replace function on_update_timestamp()
  returns trigger as $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
$$ language 'plpgsql';

create table if not exists drones (
  id uuid not null primary key default public.gen_random_uuid(),
  serial_number text not null unique,
  weight_limit integer not null check (weight_limit > 0 and weight_limit <= 500),       
  model text not null,
  state text not null default 'idle',
  battery_capacity integer not null check (battery_capacity >= 0 and battery_capacity <= 100),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);


create table if not exists medications (
    id uuid not null primary key default public.gen_random_uuid(),
    medication_name text not null,
    weight integer not null check (weight > 0),
    code text not null,
    image text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    deleted_at timestamp
);

create unique index idx_medication_name_unique on medications (medication_name) where deleted_at is null;

create trigger medication_updated_at before update
on medications for each row execute procedure 
on_update_timestamp();

create trigger drone_updated_at before update
on drones for each row execute procedure 
on_update_timestamp();

commit;