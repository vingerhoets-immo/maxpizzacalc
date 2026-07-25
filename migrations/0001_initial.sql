create table if not exists pizza_kreationen (
  id text primary key, name text not null, sauce text, stars integer default 0,
  toppings jsonb default '[]', beschreibung text, photo text, datum text,
  updated_at timestamptz default now()
);
create table if not exists teig_presets (
  id serial primary key, name text not null, state jsonb not null,
  updated_at timestamptz default now()
);
