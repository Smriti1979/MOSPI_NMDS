CREATE DATABASE nmds_db;


CREATE TABLE IF NOT EXISTS public.state
(
    state_code character varying COLLATE pg_catalog."default" NOT NULL,
    state_name character varying COLLATE pg_catalog."default",
    status character varying COLLATE pg_catalog."default",
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying COLLATE pg_catalog."default",
    updated_by character varying COLLATE pg_catalog."default",
    CONSTRAINT state_pkey PRIMARY KEY (state_code)
)

CREATE TABLE metadata
(
    id integer NOT NULL,
    agency_id integer NOT NULL,
	product_id integer NOT NULL,
	product_name character varying,
	data jsonb,
	user_created_id integer NOT NULL,
    status character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying COLLATE pg_catalog."default",
    updated_by character varying COLLATE pg_catalog."default",
    CONSTRAINT metadata_pkey PRIMARY KEY (id)
)

CREATE TABLE agency(
    agency_id integer NOT NULL,
    agency_name character varying,
	created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying COLLATE pg_catalog."default",
    updated_by character varying COLLATE pg_catalog."default",
    CONSTRAINT agency_pkey PRIMARY KEY (agency_id)
);

create table users(
 id integer,
 agency_id integer,
 username varchar(40) not null unique,
 name varchar(20) not null,
 password varchar(300) not null,
 title varchar(300) not null,
 newuser boolean,
 phone varchar(15),
 email varchar(100),
 address varchar(300),
 created_by character varying COLLATE pg_catalog."default",
 primary key(id),
 constraint fk_agency
 foreign key(agency_id)
 references agency(agency_id)
)

create table roles(
 id integer primary key,
 name varchar(100) not null,
 canCreate boolean,
 canRead boolean,
 canUpdate boolean,
 canDelete boolean,
 canGrantPermission boolean
)
ALTER TABLE metadata 
ALTER COLUMN product_id ADD GENERATED ALWAYS AS IDENTITY;

-- "password": "CCUSER123!"
-- INSERT INTO pimdusers(username, password,title) VALUES ('PIMD_user', '$2a$10$sJEW.LK10vwLPR2Id0NFLecgddzFsdcJPLIAmSZjVxQBEGAXM9e36','PIMD_user');

-- "password":"PIMDUSER123"
INSERT INTO users(username, name, password, title, phone, email) VALUES ('PIMD_user', 'pimd', '$2a$04$We8XpsbPqR/K0NPUm8uIk.BKCSBjzUaVZRDIgATVbAlBlkgZDosZq','PIMD User', '1234567890', 'pimd@gmail.com');
-- password 123456
-- INSERT INTO pimdusers(username, password,title) VALUES ('pimd', '$2a$10$HH0NU1fuSr3y6ZuEN057g.TPkDVsO1mU0qcgbpZqGeX93jVQSlAfS','pimd');
-- INSERT INTO pimdusers(username, password,title) VALUES ('Domain', '$2a$10$HH0NU1fuSr3y6ZuEN057g.TPkDVsO1mU0qcgbpZqGeX93jVQSlAfS','domain');
-- INSERT INTO pimdusers(username, password,title) VALUES ('Cpi_user', '$2a$10$HH0NU1fuSr3y6ZuEN057g.TPkDVsO1mU0qcgbpZqGeX93jVQSlAfS','cpi');
-- INSERT INTO pimdusers(username, password,title) VALUES ('Asi_user', '$2a$10$HH0NU1fuSr3y6ZuEN057g.TPkDVsO1mU0qcgbpZqGeX93jVQSlAfS','asi');



-- CREATE TABLE UserRetation (
--     id SERIAL PRIMARY KEY,
--     description varchar(40) NOT NULL,
--     createAt DATE DEFAULT Now,
-- )