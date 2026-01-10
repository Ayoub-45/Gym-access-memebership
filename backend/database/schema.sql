-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
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

    -- Required member login credentials
    email varchar(255) NOT NULL,
    password varchar(255) NOT NULL,

    membership_start date NOT NULL,
    membership_end date NOT NULL,
    status varchar(50) DEFAULT 'ACTIVE',
    gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,

    qr_token uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Unique per gym (allows same email in different gyms)
CREATE UNIQUE INDEX members_unique_email_per_gym
ON public.members (gym_id, email);

GRANT ALL ON SCHEMA public TO gym_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gym_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gym_admin;

-- Access Logs Table (Immutable audit trail)
CREATE TABLE public.access_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,

    -- Who accessed
    member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    member_name varchar(255) NOT NULL,  -- Store name for historical record

    -- Where
    gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,

    -- When
    scanned_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Result (SUCCESS, DENIED_EXPIRED, DENIED_INACTIVE, DENIED_INVALID)
    result varchar(30) NOT NULL,
    reason text,  -- Optional explanation

    -- Who scanned (staff member)
    scanned_by_staff_id uuid REFERENCES public.users(id),

    -- Immutable timestamp
    created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for fast querying
CREATE INDEX idx_access_logs_member ON public.access_logs(member_id, scanned_at DESC);
CREATE INDEX idx_access_logs_gym ON public.access_logs(gym_id, scanned_at DESC);
CREATE INDEX idx_access_logs_date ON public.access_logs(scanned_at DESC);
CREATE INDEX idx_access_logs_result ON public.access_logs(result);

-- Make logs IMMUTABLE (cannot update or delete)
REVOKE UPDATE, DELETE ON public.access_logs FROM gym_admin;
GRANT SELECT, INSERT ON public.access_logs TO gym_admin;

