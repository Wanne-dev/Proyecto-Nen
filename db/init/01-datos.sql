--
-- PostgreSQL database dump
--

\restrict POVU6ePW42Oe0YyXqCGScjWSE2gJgdqU49tYfc5jCbar3QsCK1toU1wEcEMKmm1

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.market_prices DROP CONSTRAINT IF EXISTS "FK_e0c09792bf8402ab94752779ca5";
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS "FK_cfa83f61e4d27a87fcae1e025ab";
ALTER TABLE IF EXISTS ONLY public.transactions DROP CONSTRAINT IF EXISTS "FK_a88f466d39796d3081cf96e1b66";
ALTER TABLE IF EXISTS ONLY public.verification_codes DROP CONSTRAINT IF EXISTS "FK_9a854eeb4598a22d554ecfe6e81";
ALTER TABLE IF EXISTS ONLY public.transactions DROP CONSTRAINT IF EXISTS "FK_6bb58f2b6e30cb51a6504599f41";
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS "FK_692a909ee0fa9383e7859f9b406";
ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS "FK_55fa4db8406ed66bc7044328427";
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS "FK_151b79a83ba240b0cb31b2302d1";
ALTER TABLE IF EXISTS ONLY public.wallet_balances DROP CONSTRAINT IF EXISTS "FK_10560f85c13af935346bdd37dd4";
DROP INDEX IF EXISTS public."IDX_e0ddecf5730c77f475e58eef3b";
DROP INDEX IF EXISTS public."IDX_cb77bc746d4e7b50c722fb2151";
DROP INDEX IF EXISTS public."IDX_b0371c5216302227f1476767ff";
DROP INDEX IF EXISTS public."IDX_a17edcb3b8e39c52a7d0554d31";
DROP INDEX IF EXISTS public."IDX_97672ac88f789774dd47f7c8be";
DROP INDEX IF EXISTS public."IDX_843ef91438dec68148bec2df9d";
DROP INDEX IF EXISTS public."IDX_7421efc125d95e413657efa3c6";
DROP INDEX IF EXISTS public."IDX_654b237d76bfa796f383c61ea1";
DROP INDEX IF EXISTS public."IDX_2c6e259a9af837c1a7090bdda1";
DROP INDEX IF EXISTS public."IDX_1b60b0d14369f9d839beb925a5";
DROP INDEX IF EXISTS public."IDX_06eac69d499836337c254b7a59";
DROP INDEX IF EXISTS public."IDX_00db5dad7aec3b9b4f5a0914ea";
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS "UQ_b1b5bc664526d375c94ce9ad43d";
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS "UQ_9b4bd5b9c6fe49cd3b4342fb914";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "UQ_97672ac88f789774dd47f7c8be3";
ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS "UQ_69214fd09be67af95c186be26db";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "UQ_5f6c1b67ac12a1e7eb454a48e59";
ALTER TABLE IF EXISTS ONLY public.user_settings DROP CONSTRAINT IF EXISTS "UQ_4ed056b9344e6f7d8d46ec4b302";
ALTER TABLE IF EXISTS ONLY public.transactions DROP CONSTRAINT IF EXISTS "UQ_365b158cbdb7b7bc18bca4004af";
ALTER TABLE IF EXISTS ONLY public.wallet_balances DROP CONSTRAINT IF EXISTS "PK_eebe2c6f13f1a2de3457f8a885c";
ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS "PK_e93e031a5fed190d4789b6bfd83";
ALTER TABLE IF EXISTS ONLY public.assets DROP CONSTRAINT IF EXISTS "PK_da96729a8b113377cfb6a62439c";
ALTER TABLE IF EXISTS ONLY public.market_prices DROP CONSTRAINT IF EXISTS "PK_cb959017562b6fe816d5a5c91dd";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "PK_a3ffb1c0c8416b9fc6f907b7433";
ALTER TABLE IF EXISTS ONLY public.transactions DROP CONSTRAINT IF EXISTS "PK_a219afd8dd77ed80f5a862f1db9";
ALTER TABLE IF EXISTS ONLY public.wallets DROP CONSTRAINT IF EXISTS "PK_8402e5df5a30a229380e83e4f7e";
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS "PK_82521f08790d248b2a80cc85d40";
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS "PK_710e2d4957aa5878dfe94e4ac2f";
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS "PK_6a72c3c0f683f6462415e653c3a";
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS "PK_1bb179d048bbc581caa3b013439";
ALTER TABLE IF EXISTS ONLY public.verification_codes DROP CONSTRAINT IF EXISTS "PK_18741b6b8bf1680dbf5057421d7";
ALTER TABLE IF EXISTS ONLY public.user_settings DROP CONSTRAINT IF EXISTS "PK_00f004f5922a0744d174530d639";
DROP TABLE IF EXISTS public.wallets;
DROP TABLE IF EXISTS public.wallet_balances;
DROP TABLE IF EXISTS public.verification_codes;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_settings;
DROP TABLE IF EXISTS public.user_sessions;
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.system_settings;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.market_prices;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.assets;
DROP TYPE IF EXISTS public.wallets_type_enum;
DROP TYPE IF EXISTS public.wallet_balances_currency_enum;
DROP TYPE IF EXISTS public.verification_codes_type_enum;
DROP TYPE IF EXISTS public.users_status_enum;
DROP TYPE IF EXISTS public.users_role_enum;
DROP TYPE IF EXISTS public.users_kyc_status_enum;
DROP TYPE IF EXISTS public.users_documenttype_enum;
DROP TYPE IF EXISTS public.users_document_type_enum;
DROP TYPE IF EXISTS public.users_account_status_enum;
DROP TYPE IF EXISTS public.transactions_type_enum;
DROP TYPE IF EXISTS public.transactions_status_enum;
DROP TYPE IF EXISTS public.orders_type_enum;
DROP TYPE IF EXISTS public.orders_status_enum;
DROP TYPE IF EXISTS public.orders_side_enum;
DROP TYPE IF EXISTS public.notifications_type_enum;
DROP TYPE IF EXISTS public.market_prices_timeframe_enum;
DROP TYPE IF EXISTS public.audit_logs_action_enum;
DROP TYPE IF EXISTS public.assets_type_enum;
DROP EXTENSION IF EXISTS "uuid-ossp";
--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: assets_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assets_type_enum AS ENUM (
    'crypto',
    'stock',
    'forex',
    'commodity',
    'index'
);


--
-- Name: audit_logs_action_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_logs_action_enum AS ENUM (
    'login',
    'login_failed',
    'logout',
    'register',
    'password_change',
    'two_factor_enabled',
    'two_factor_disabled',
    'deposit',
    'withdrawal',
    'transfer',
    'order_created',
    'order_cancelled',
    'order_filled',
    'kyc_verified',
    'account_blocked',
    'account_unlocked',
    'settings_changed',
    'fraud_detected',
    'admin_action'
);


--
-- Name: market_prices_timeframe_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.market_prices_timeframe_enum AS ENUM (
    '1m',
    '5m',
    '15m',
    '1h',
    '4h',
    '1d',
    '1w',
    '1M'
);


--
-- Name: notifications_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notifications_type_enum AS ENUM (
    'transaction',
    'security',
    'trading',
    'system',
    'promotion',
    'kyc'
);


--
-- Name: orders_side_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.orders_side_enum AS ENUM (
    'buy',
    'sell'
);


--
-- Name: orders_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.orders_status_enum AS ENUM (
    'pending',
    'open',
    'partially_filled',
    'filled',
    'cancelled',
    'rejected',
    'expired'
);


--
-- Name: orders_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.orders_type_enum AS ENUM (
    'market',
    'limit',
    'stop_loss',
    'take_profit',
    'stop_limit',
    'trailing_stop'
);


--
-- Name: transactions_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transactions_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'reversed'
);


--
-- Name: transactions_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transactions_type_enum AS ENUM (
    'deposit',
    'withdrawal',
    'transfer_in',
    'transfer_out',
    'trade_buy',
    'trade_sell',
    'fee',
    'refund'
);


--
-- Name: users_account_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_account_status_enum AS ENUM (
    'active',
    'suspended',
    'blocked',
    'deleted'
);


--
-- Name: users_document_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_document_type_enum AS ENUM (
    'cc',
    'ce',
    'ti',
    'passport',
    'nit',
    'rut'
);


--
-- Name: users_documenttype_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_documenttype_enum AS ENUM (
    'cc',
    'ce',
    'ti',
    'pasaporte'
);


--
-- Name: users_kyc_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_kyc_status_enum AS ENUM (
    'pending',
    'verified',
    'rejected',
    'expired'
);


--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_role_enum AS ENUM (
    'user',
    'analyst',
    'operator',
    'admin',
    'compliance'
);


--
-- Name: users_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_status_enum AS ENUM (
    'active',
    'inactive',
    'suspended'
);


--
-- Name: verification_codes_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.verification_codes_type_enum AS ENUM (
    'email_verification',
    'phone_verification',
    'two_factor',
    'password_reset',
    'login_verification'
);


--
-- Name: wallet_balances_currency_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallet_balances_currency_enum AS ENUM (
    'USD',
    'COP',
    'EUR',
    'BTC',
    'ETH',
    'USDC'
);


--
-- Name: wallets_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallets_type_enum AS ENUM (
    'main',
    'savings',
    'demo'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    symbol character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    type public.assets_type_enum NOT NULL,
    current_price numeric(18,8) NOT NULL,
    previous_close numeric(18,8),
    daily_change numeric(10,4) DEFAULT '0'::numeric NOT NULL,
    daily_change_percent numeric(10,4) DEFAULT '0'::numeric NOT NULL,
    volume_24h numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    market_cap numeric(18,2),
    high_24h numeric(18,8),
    low_24h numeric(18,8),
    is_active boolean DEFAULT true NOT NULL,
    logo_url character varying(500),
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action public.audit_logs_action_enum NOT NULL,
    entity_type character varying(50),
    entity_id character varying(100),
    old_values jsonb,
    new_values jsonb,
    prev_hash character varying(64),
    curr_hash character varying(64),
    ip_address character varying(45),
    user_agent text,
    risk_score numeric(5,2),
    details text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "userId" uuid
);


--
-- Name: market_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_prices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    asset_id uuid NOT NULL,
    timeframe public.market_prices_timeframe_enum NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    open_price numeric(18,8) NOT NULL,
    high_price numeric(18,8) NOT NULL,
    low_price numeric(18,8) NOT NULL,
    close_price numeric(18,8) NOT NULL,
    volume numeric(18,2) NOT NULL,
    trade_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "assetId" uuid
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type public.notifications_type_enum NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    action_url character varying(500),
    metadata jsonb,
    priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "userId" uuid
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    symbol character varying(20) NOT NULL,
    type public.orders_type_enum NOT NULL,
    side public.orders_side_enum NOT NULL,
    status public.orders_status_enum DEFAULT 'pending'::public.orders_status_enum NOT NULL,
    price numeric(18,8),
    stop_price numeric(18,8),
    quantity numeric(18,8) NOT NULL,
    filled_quantity numeric(18,8) DEFAULT '0'::numeric NOT NULL,
    avg_fill_price numeric(18,8) DEFAULT '0'::numeric NOT NULL,
    ia_score numeric(5,2),
    ia_explanation jsonb,
    ia_risk_level character varying(20),
    expires_at timestamp with time zone,
    time_in_force character varying(10) DEFAULT 'GTC'::character varying NOT NULL,
    commission numeric(18,8) DEFAULT '0'::numeric NOT NULL,
    ip_address character varying(45),
    notes text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "userId" uuid
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    key character varying(100) NOT NULL,
    value jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    wallet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type public.transactions_type_enum NOT NULL,
    status public.transactions_status_enum DEFAULT 'pending'::public.transactions_status_enum NOT NULL,
    amount numeric(18,8) NOT NULL,
    currency character varying(3) NOT NULL,
    amount_usd numeric(18,2) NOT NULL,
    fee numeric(18,8) DEFAULT '0'::numeric NOT NULL,
    fee_currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    description character varying(500),
    reference_id character varying(100) NOT NULL,
    ref_hash character varying(64),
    recipient_user_id uuid,
    recipient_wallet_id uuid,
    ip_address character varying(45),
    ia_score numeric(5,2),
    ia_risk_level character varying(20),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "walletId" uuid,
    "userId" uuid
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    refresh_token character varying(500) NOT NULL,
    device_info character varying(255),
    user_agent text,
    ip_address character varying(45),
    location jsonb,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    last_activity_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "userId" uuid
);


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    theme character varying(10) DEFAULT 'dark'::character varying NOT NULL,
    language character varying(5) DEFAULT 'es'::character varying NOT NULL,
    currency_display character varying(3) DEFAULT 'COP'::character varying NOT NULL,
    email_notifications boolean DEFAULT true NOT NULL,
    push_notifications boolean DEFAULT true NOT NULL,
    sms_notifications boolean DEFAULT false NOT NULL,
    two_factor_method character varying(20) DEFAULT 'email'::character varying NOT NULL,
    biometric_enabled boolean DEFAULT false NOT NULL,
    trading_confirmations boolean DEFAULT true NOT NULL,
    risk_tolerance character varying(20) DEFAULT 'moderate'::character varying NOT NULL,
    auto_logout_minutes integer DEFAULT 30 NOT NULL,
    hide_small_balances boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    document_type public.users_document_type_enum DEFAULT 'cc'::public.users_document_type_enum NOT NULL,
    document_number character varying(50),
    date_of_birth date,
    phone character varying(20),
    email_verified boolean DEFAULT false NOT NULL,
    phone_verified boolean DEFAULT false NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    two_factor_secret character varying(255),
    two_factor_enabled boolean DEFAULT false NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    reset_password_token character varying(255),
    reset_password_expires timestamp with time zone,
    role public.users_role_enum DEFAULT 'user'::public.users_role_enum NOT NULL,
    kyc_status public.users_kyc_status_enum DEFAULT 'pending'::public.users_kyc_status_enum NOT NULL,
    account_status public.users_account_status_enum DEFAULT 'active'::public.users_account_status_enum NOT NULL,
    last_login_at timestamp with time zone,
    last_login_ip character varying(45),
    country character varying(3) DEFAULT 'CO'::character varying NOT NULL,
    timezone character varying(50) DEFAULT 'America/Bogota'::character varying NOT NULL,
    preferred_currency character varying(3) DEFAULT 'COP'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: verification_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_codes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type public.verification_codes_type_enum NOT NULL,
    code character varying(6) NOT NULL,
    target character varying(255),
    used boolean DEFAULT false NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    ip_address character varying(45),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "userId" uuid
);


--
-- Name: wallet_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_balances (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    wallet_id uuid NOT NULL,
    currency public.wallet_balances_currency_enum NOT NULL,
    balance numeric(18,8) DEFAULT '0'::numeric NOT NULL,
    locked_amount numeric(18,8) DEFAULT '0'::numeric NOT NULL,
    usd_rate numeric(18,8) DEFAULT '1'::numeric NOT NULL,
    usd_rate_updated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "walletId" uuid
);


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type public.wallets_type_enum DEFAULT 'main'::public.wallets_type_enum NOT NULL,
    total_balance_usd numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    daily_withdrawal_limit numeric(18,2) DEFAULT '5000'::numeric NOT NULL,
    daily_withdrawn numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    daily_withdrawn_reset timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assets (id, symbol, name, type, current_price, previous_close, daily_change, daily_change_percent, volume_24h, market_cap, high_24h, low_24h, is_active, logo_url, description, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, prev_hash, curr_hash, ip_address, user_agent, risk_score, details, created_at, "userId") FROM stdin;
54609057-df7d-4e06-a95c-1ebdb2e5e72f	ac402af9-3663-4423-aa32-bd92c8b05281	login	user	ac402af9-3663-4423-aa32-bd92c8b05281	\N	\N	\N	1d95e509c46572eacc7d0c6416c5fc937e415f2a00c5b9da75fada888deb05ae	::1	\N	\N	Inicio de sesión exitoso: sena@nen.com	2026-08-19 19:39:09.588424+00	\N
2d157098-1884-4664-be8f-552147757526	ac402af9-3663-4423-aa32-bd92c8b05281	order_filled	order	a4c0610e-a5cb-4995-bb85-08826a06de5b	\N	{"side": "buy", "type": "market", "price": 68225, "status": "filled", "symbol": "BTC", "quantity": 0.1026}	1d95e509c46572eacc7d0c6416c5fc937e415f2a00c5b9da75fada888deb05ae	c9bd7b9b5aa833a5c50dbb253a6725b1d08c1ea606d2646f39e57133aa63339a	::1	\N	\N	Compra 0.1026 BTC (market)	2026-08-19 19:44:26.216534+00	\N
d9a7c269-c3e3-487d-b67e-0c9911467837	ac402af9-3663-4423-aa32-bd92c8b05281	order_filled	order	2c174f65-e6dd-49a8-8844-47c4388fac3e	\N	{"side": "buy", "type": "market", "price": 68225, "status": "filled", "symbol": "BTC", "quantity": 0.0256}	c9bd7b9b5aa833a5c50dbb253a6725b1d08c1ea606d2646f39e57133aa63339a	e5fde64bcc702cb1ecba3547b1d214947ad4c52fdbbe958d0400e6e6fd120f5a	::1	\N	\N	Compra 0.0256 BTC (market)	2026-08-19 19:44:31.219754+00	\N
156e7748-5b15-4315-b23a-dc6fcf77993a	ac402af9-3663-4423-aa32-bd92c8b05281	login	user	ac402af9-3663-4423-aa32-bd92c8b05281	\N	\N	e5fde64bcc702cb1ecba3547b1d214947ad4c52fdbbe958d0400e6e6fd120f5a	8c6f15e7f48c07186a9c185b9444d2bba121ff72475155b74a67b0f78cb25ec1	::1	\N	\N	Inicio de sesión exitoso: sena@nen.com	2026-08-19 20:19:29.140565+00	\N
14768a8d-2aec-44da-b2e7-586feb898be2	ac402af9-3663-4423-aa32-bd92c8b05281	login	user	ac402af9-3663-4423-aa32-bd92c8b05281	\N	\N	8c6f15e7f48c07186a9c185b9444d2bba121ff72475155b74a67b0f78cb25ec1	87ca746ac89fa8a5c750f7b3ac9ce9355a63232c3064d1f99d6905495ba052c8	::1	\N	\N	Inicio de sesión exitoso: sena@nen.com	2026-08-19 21:03:35.720768+00	\N
e46fcd65-dcc4-42c4-8d50-d4a7a636e0f0	ac402af9-3663-4423-aa32-bd92c8b05281	login	user	ac402af9-3663-4423-aa32-bd92c8b05281	\N	\N	87ca746ac89fa8a5c750f7b3ac9ce9355a63232c3064d1f99d6905495ba052c8	8dde8a58fd99387fbcb7a076f9a96bf2d164ed900fc7676b8be0a0ee7d9d7f82	::1	\N	\N	Inicio de sesión exitoso: sena@nen.com	2026-08-20 17:46:56.408893+00	\N
9fdff79c-c274-4a03-bc77-5fd041d8c919	ac402af9-3663-4423-aa32-bd92c8b05281	login	user	ac402af9-3663-4423-aa32-bd92c8b05281	\N	\N	8dde8a58fd99387fbcb7a076f9a96bf2d164ed900fc7676b8be0a0ee7d9d7f82	36616543c196b04837028fc900f5e09fddb773bfbf79a14dfe58b3991cbad90b	::1	\N	\N	Inicio de sesión exitoso: sena@nen.com	2026-08-21 21:24:30.573051+00	\N
\.


--
-- Data for Name: market_prices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.market_prices (id, asset_id, timeframe, "timestamp", open_price, high_price, low_price, close_price, volume, trade_count, created_at, "assetId") FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, read, read_at, action_url, metadata, priority, created_at, "userId") FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, user_id, symbol, type, side, status, price, stop_price, quantity, filled_quantity, avg_fill_price, ia_score, ia_explanation, ia_risk_level, expires_at, time_in_force, commission, ip_address, notes, metadata, created_at, updated_at, "userId") FROM stdin;
a4c0610e-a5cb-4995-bb85-08826a06de5b	ac402af9-3663-4423-aa32-bd92c8b05281	BTC	market	buy	filled	68225.00000000	\N	0.10260000	0.10260000	68225.00000000	83.00	{"rsi": 74, "soporte": "cercano a soporte", "volumen": "normal", "trend30d": "alcista"}	low	\N	GTC	7.00000000	::1	\N	\N	2026-08-19 19:44:26.20664+00	2026-08-19 19:44:26.20664+00	\N
2c174f65-e6dd-49a8-8844-47c4388fac3e	ac402af9-3663-4423-aa32-bd92c8b05281	BTC	market	buy	filled	68225.00000000	\N	0.02560000	0.02560000	68225.00000000	83.00	{"rsi": 74, "soporte": "cercano a soporte", "volumen": "normal", "trend30d": "alcista"}	low	\N	GTC	1.75000000	::1	\N	\N	2026-08-19 19:44:31.21612+00	2026-08-19 19:44:31.21612+00	\N
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_settings (id, key, value, created_at, updated_at) FROM stdin;
2817247f-21a8-4370-baae-c498b4335224	system	{"timezone": "America/Bogota", "languages": ["es", "en"], "minDeposit": 5, "tradingFee": 0.001, "kycRequired": true, "maxLeverage": 10, "minTradeUsd": 5, "platformName": "BANCA NEN", "minWithdrawal": 10, "notifications": {"sms": true, "push": true, "email": true, "marketAlerts": true, "securityAlerts": true}, "withdrawalFee": 0.0015, "defaultCurrency": "USD", "maintenanceMode": false, "maxDepositDaily": 50000, "allowedCountries": ["Colombia", "México", "España", "Perú", "Chile", "Argentina", "Ecuador", "Panamá", "Estados Unidos"], "allowRegistration": true, "sessionTimeoutMin": 30, "twoFactorRequired": true, "maxWithdrawalDaily": 10000, "suspiciousThreshold": 0.8}	2026-08-19 20:20:33.850037+00	2026-08-19 20:20:33.850037+00
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, wallet_id, user_id, type, status, amount, currency, amount_usd, fee, fee_currency, description, reference_id, ref_hash, recipient_user_id, recipient_wallet_id, ip_address, ia_score, ia_risk_level, metadata, created_at, "walletId", "userId") FROM stdin;
d66de16f-0bd6-4385-8c43-768c405d5f79	99e172a7-1986-4a3d-9566-20bdc37d2b66	ac402af9-3663-4423-aa32-bd92c8b05281	deposit	completed	15000.00000000	USD	15000.00	0.00000000	USD	Deposito inicial	DEP-1786474687318-spim96	\N	\N	\N	\N	\N	\N	\N	2026-08-11 18:58:07.320271+00	\N	\N
e4a3020e-231c-4d9b-aaf1-e08bcc95abc9	99e172a7-1986-4a3d-9566-20bdc37d2b66	ac402af9-3663-4423-aa32-bd92c8b05281	deposit	completed	0.50000000	BTC	0.00	0.00000000	USD	Deposito BTC	DEP-1786474695920-6noavt	\N	\N	\N	\N	\N	\N	\N	2026-08-11 18:58:15.920673+00	\N	\N
e8471d34-4ac9-481d-8262-24f48e50f9bd	99e172a7-1986-4a3d-9566-20bdc37d2b66	ac402af9-3663-4423-aa32-bd92c8b05281	withdrawal	completed	1000.00000000	USD	1000.00	1.00000000	USD	Retiro prueba	WTH-1786474834755-brbkio	\N	\N	\N	\N	\N	\N	\N	2026-08-11 19:00:34.756629+00	\N	\N
3fa028f4-e244-4527-aeb9-30d8f8660389	99e172a7-1986-4a3d-9566-20bdc37d2b66	ac402af9-3663-4423-aa32-bd92c8b05281	trade_buy	completed	6999.88500000	USD	6999.89	7.00000000	USD	Compra 0.1026 BTC a 68225 USD	ORD-1787168666200-bp181l	\N	\N	\N	\N	\N	\N	\N	2026-08-19 19:44:26.20087+00	\N	\N
2b0e3058-2eaa-4d96-a4c2-dd54a800e6ed	99e172a7-1986-4a3d-9566-20bdc37d2b66	ac402af9-3663-4423-aa32-bd92c8b05281	trade_buy	completed	1746.56000000	USD	1746.56	1.75000000	USD	Compra 0.0256 BTC a 68225 USD	ORD-1787168671212-t2l7g2	\N	\N	\N	\N	\N	\N	\N	2026-08-19 19:44:31.213304+00	\N	\N
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_sessions (id, user_id, refresh_token, device_info, user_agent, ip_address, location, is_active, expires_at, last_activity_at, created_at, updated_at, "userId") FROM stdin;
\.


--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_settings (id, user_id, theme, language, currency_display, email_notifications, push_notifications, sms_notifications, two_factor_method, biometric_enabled, trading_confirmations, risk_tolerance, auto_logout_minutes, hide_small_balances, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, first_name, last_name, document_type, document_number, date_of_birth, phone, email_verified, phone_verified, is_verified, two_factor_secret, two_factor_enabled, failed_login_attempts, locked_until, reset_password_token, reset_password_expires, role, kyc_status, account_status, last_login_at, last_login_ip, country, timezone, preferred_currency, created_at, updated_at) FROM stdin;
ac402af9-3663-4423-aa32-bd92c8b05281	sena@nen.com	$2b$12$JQZP8PGV0Ft8vG0qhkCb0eIgeklJNuQSlIi1.GDNRNJLJ6zkbImgy	SENA	Usuario	cc	12345678	2000-01-01	+573001234567	t	t	t	{"emailCode":"831918","phoneCode":"895940"}	f	0	\N	\N	\N	admin	pending	active	2026-08-21 21:24:30.556+00	\N	CO	America/Bogota	COP	2026-08-05 21:24:52.856733+00	2026-08-21 21:24:30.559144+00
\.


--
-- Data for Name: verification_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.verification_codes (id, user_id, type, code, target, used, attempts, max_attempts, expires_at, used_at, ip_address, created_at, "userId") FROM stdin;
\.


--
-- Data for Name: wallet_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallet_balances (id, wallet_id, currency, balance, locked_amount, usd_rate, usd_rate_updated_at, created_at, updated_at, "walletId") FROM stdin;
d3367ce1-549c-46e9-a9c8-94da0e511771	99e172a7-1986-4a3d-9566-20bdc37d2b66	ETH	0.00000000	0.00000000	0.00000000	\N	2026-08-11 18:57:23.257702+00	2026-08-11 18:57:23.257702+00	\N
d98dca04-d01c-4568-b6f6-1bda75e2ee2f	99e172a7-1986-4a3d-9566-20bdc37d2b66	USDC	0.00000000	0.00000000	0.00000000	\N	2026-08-11 18:57:23.260311+00	2026-08-11 18:57:23.260311+00	\N
d8a997b3-e9b3-4d29-a25f-e2330774b7ea	99e172a7-1986-4a3d-9566-20bdc37d2b66	USD	5244.80500000	0.00000000	1.00000000	\N	2026-08-11 18:57:23.251274+00	2026-08-19 19:44:31.204581+00	\N
a3bb1d46-a182-439b-a46b-0875b8da327e	99e172a7-1986-4a3d-9566-20bdc37d2b66	BTC	0.62820000	0.00000000	0.00000000	\N	2026-08-11 18:57:23.254771+00	2026-08-19 19:44:31.210789+00	\N
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallets (id, user_id, type, total_balance_usd, is_active, daily_withdrawal_limit, daily_withdrawn, daily_withdrawn_reset, created_at, updated_at) FROM stdin;
99e172a7-1986-4a3d-9566-20bdc37d2b66	ac402af9-3663-4423-aa32-bd92c8b05281	main	5244.81	t	5000.00	0.00	\N	2026-08-11 18:57:23.244283+00	2026-08-19 19:44:31.222421+00
\.


--
-- Name: user_settings PK_00f004f5922a0744d174530d639; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT "PK_00f004f5922a0744d174530d639" PRIMARY KEY (id);


--
-- Name: verification_codes PK_18741b6b8bf1680dbf5057421d7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT "PK_18741b6b8bf1680dbf5057421d7" PRIMARY KEY (id);


--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: orders PK_710e2d4957aa5878dfe94e4ac2f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY (id);


--
-- Name: system_settings PK_82521f08790d248b2a80cc85d40; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT "PK_82521f08790d248b2a80cc85d40" PRIMARY KEY (id);


--
-- Name: wallets PK_8402e5df5a30a229380e83e4f7e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY (id);


--
-- Name: transactions PK_a219afd8dd77ed80f5a862f1db9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: market_prices PK_cb959017562b6fe816d5a5c91dd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_prices
    ADD CONSTRAINT "PK_cb959017562b6fe816d5a5c91dd" PRIMARY KEY (id);


--
-- Name: assets PK_da96729a8b113377cfb6a62439c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY (id);


--
-- Name: user_sessions PK_e93e031a5fed190d4789b6bfd83; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY (id);


--
-- Name: wallet_balances PK_eebe2c6f13f1a2de3457f8a885c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_balances
    ADD CONSTRAINT "PK_eebe2c6f13f1a2de3457f8a885c" PRIMARY KEY (id);


--
-- Name: transactions UQ_365b158cbdb7b7bc18bca4004af; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "UQ_365b158cbdb7b7bc18bca4004af" UNIQUE (reference_id);


--
-- Name: user_settings UQ_4ed056b9344e6f7d8d46ec4b302; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT "UQ_4ed056b9344e6f7d8d46ec4b302" UNIQUE (user_id);


--
-- Name: users UQ_5f6c1b67ac12a1e7eb454a48e59; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_5f6c1b67ac12a1e7eb454a48e59" UNIQUE (document_number);


--
-- Name: user_sessions UQ_69214fd09be67af95c186be26db; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT "UQ_69214fd09be67af95c186be26db" UNIQUE (refresh_token);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: assets UQ_9b4bd5b9c6fe49cd3b4342fb914; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "UQ_9b4bd5b9c6fe49cd3b4342fb914" UNIQUE (symbol);


--
-- Name: system_settings UQ_b1b5bc664526d375c94ce9ad43d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT "UQ_b1b5bc664526d375c94ce9ad43d" UNIQUE (key);


--
-- Name: IDX_00db5dad7aec3b9b4f5a0914ea; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_00db5dad7aec3b9b4f5a0914ea" ON public.orders USING btree (symbol, status);


--
-- Name: IDX_06eac69d499836337c254b7a59; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_06eac69d499836337c254b7a59" ON public.market_prices USING btree (asset_id, timeframe, "timestamp");


--
-- Name: IDX_1b60b0d14369f9d839beb925a5; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_1b60b0d14369f9d839beb925a5" ON public.wallet_balances USING btree (wallet_id, currency);


--
-- Name: IDX_2c6e259a9af837c1a7090bdda1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2c6e259a9af837c1a7090bdda1" ON public.user_sessions USING btree (user_id, is_active);


--
-- Name: IDX_654b237d76bfa796f383c61ea1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_654b237d76bfa796f383c61ea1" ON public.transactions USING btree (user_id, status);


--
-- Name: IDX_7421efc125d95e413657efa3c6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7421efc125d95e413657efa3c6" ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: IDX_843ef91438dec68148bec2df9d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_843ef91438dec68148bec2df9d" ON public.transactions USING btree (user_id, created_at);


--
-- Name: IDX_97672ac88f789774dd47f7c8be; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON public.users USING btree (email);


--
-- Name: IDX_a17edcb3b8e39c52a7d0554d31; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a17edcb3b8e39c52a7d0554d31" ON public.notifications USING btree (user_id, read);


--
-- Name: IDX_b0371c5216302227f1476767ff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b0371c5216302227f1476767ff" ON public.verification_codes USING btree (user_id, type, used);


--
-- Name: IDX_cb77bc746d4e7b50c722fb2151; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_cb77bc746d4e7b50c722fb2151" ON public.orders USING btree (user_id, status);


--
-- Name: IDX_e0ddecf5730c77f475e58eef3b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e0ddecf5730c77f475e58eef3b" ON public.audit_logs USING btree (user_id, action);


--
-- Name: wallet_balances FK_10560f85c13af935346bdd37dd4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_balances
    ADD CONSTRAINT "FK_10560f85c13af935346bdd37dd4" FOREIGN KEY ("walletId") REFERENCES public.wallets(id);


--
-- Name: orders FK_151b79a83ba240b0cb31b2302d1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: user_sessions FK_55fa4db8406ed66bc7044328427; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT "FK_55fa4db8406ed66bc7044328427" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: notifications FK_692a909ee0fa9383e7859f9b406; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: transactions FK_6bb58f2b6e30cb51a6504599f41; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: verification_codes FK_9a854eeb4598a22d554ecfe6e81; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT "FK_9a854eeb4598a22d554ecfe6e81" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: transactions FK_a88f466d39796d3081cf96e1b66; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_a88f466d39796d3081cf96e1b66" FOREIGN KEY ("walletId") REFERENCES public.wallets(id);


--
-- Name: audit_logs FK_cfa83f61e4d27a87fcae1e025ab; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "FK_cfa83f61e4d27a87fcae1e025ab" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: market_prices FK_e0c09792bf8402ab94752779ca5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_prices
    ADD CONSTRAINT "FK_e0c09792bf8402ab94752779ca5" FOREIGN KEY ("assetId") REFERENCES public.assets(id);


--
-- PostgreSQL database dump complete
--

\unrestrict POVU6ePW42Oe0YyXqCGScjWSE2gJgdqU49tYfc5jCbar3QsCK1toU1wEcEMKmm1

