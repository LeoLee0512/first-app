-- v1.5.1: the membership system (Plus/Pro plans, entitlement gating, Internal Tester
-- channel, PINN waitlist) is removed. Every account keeps the same capabilities;
-- only the admin role is distinguished. Earlier migrations stay immutable, so this
-- one converts data forward and drops the now-unused tables.
UPDATE users SET role = 'free' WHERE role IN ('plus', 'pro', 'internal_tester');

DROP TABLE IF EXISTS internal_access_grants;
DROP TABLE IF EXISTS pinn_waitlist;
DROP TABLE IF EXISTS role_entitlements;
DROP TABLE IF EXISTS user_entitlements;
DROP TABLE IF EXISTS entitlements;
DROP TABLE IF EXISTS subscription_plans;

DELETE FROM login_attempts WHERE kind = 'internal_invite';
DELETE FROM roles WHERE name IN ('plus', 'pro', 'internal_tester');
