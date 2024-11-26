CREATE DATABASE nmds_db;

CREATE TABLE metadata
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
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
    agency_id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    agency_name character varying,
	created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying COLLATE pg_catalog."default",
    updated_by character varying COLLATE pg_catalog."default",
    CONSTRAINT agency_pkey PRIMARY KEY (agency_id)
);

create table users(
 id integer GENERATED ALWAYS AS IDENTITY,
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
 id integer primary key GENERATED ALWAYS AS IDENTITY,
 name varchar(100) not null,
 canCreate boolean,
 canRead boolean,
 canUpdate boolean,
 canDelete boolean,
 canGrantPermission boolean
)

insert into agencies (agency_name) values ('PIMD')
-- "password":"PIMDUSER123"
INSERT INTO users(agency_id, username, name, password, usertype, phone, email, address) VALUES ('1', 'PIMD_user', 'Ram', '$2a$04$We8XpsbPqR/K0NPUm8uIk.BKCSBjzUaVZRDIgATVbAlBlkgZDosZq','PIMD_User', '1234567890', 'pimd@gmail.com', 'ABC Colony');




