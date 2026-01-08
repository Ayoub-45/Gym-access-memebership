CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS public.members, public.users, public.gyms CASCADE;

CREATE TABLE public.gyms (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name varchar(255) NOT NULL,
    logo text,
    address text,
    owner_id uuid,
    subscription_status varchar(50) DEFAULT 'trial',
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    email varchar(255) UNIQUE NOT NULL,
    password varchar(255) NOT NULL,
    role varchar(50) DEFAULT 'admin',
    gym_id uuid REFERENCES public.gyms(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name varchar(255) NOT NULL,
    membership_start date NOT NULL,
    membership_end date NOT NULL,
    status varchar(50) DEFAULT 'ACTIVE',
    gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    qr_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

GRANT ALL ON SCHEMA public TO gym_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gym_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gym_admin;